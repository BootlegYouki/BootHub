import Zeroconf from 'react-native-zeroconf';
import axios from 'axios';
import { getDb, SyncEvent, saveSetting } from './storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemSessionType } from 'expo-file-system/legacy';

const zeroconf = new Zeroconf();
let knownPeers = new Map<string, string>(); // name -> ip:port
let ws: WebSocket | null = null;
let wsReconnectTimeout: NodeJS.Timeout | null = null;

function connectWebSocket(peerAddress: string) {
  const isPairedRow = getDb().getFirstSync<{ value: string }>("SELECT value FROM config WHERE key = 'is_paired'");
  if (isPairedRow?.value !== 'true') {
    console.log('[Sync Engine] Device is not paired. Skipping WebSocket connection.');
    return;
  }
  if (ws) {
    ws.close();
  }
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
  }
  
  const wsUrl = `ws://${peerAddress}/ws`;
  console.log(`[Sync Engine] Connecting WebSocket to ${wsUrl}`);
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('[Sync Engine] WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    if (event.data === 'SYNC_NEEDED') {
      console.log('[Sync Engine] Received SYNC_NEEDED via WebSocket');
      processSyncQueue().catch(console.error);
    } else if (event.data === 'FORCE_DISCONNECT') {
      console.log('[Sync Engine] Received FORCE_DISCONNECT from Desktop');
      saveSetting('is_paired', 'false').catch(console.error);
      saveSetting('paired_device_id', '').catch(console.error);
      updateSyncStatus({ isSyncing: false, error: 'Disconnected by desktop.', isPaired: false });
      closeRealtimeSync();
    }
  };
  
  ws.onclose = () => {
    console.log('[Sync Engine] WebSocket closed, attempting to reconnect...');
    ws = null;
    wsReconnectTimeout = setTimeout(() => {
      if (knownPeers.size > 0) {
        connectWebSocket(Array.from(knownPeers.values())[0]);
      }
    }, 5000);
  };
  
  ws.onerror = (e) => {
    console.error('[Sync Engine] WebSocket error:', e);
  };
}

export const getKnownPeers = () => knownPeers;

export const connectKnownPeersWS = () => {
  const isPairedRow = getDb().getFirstSync<{ value: string }>("SELECT value FROM config WHERE key = 'is_paired'");
  if (isPairedRow?.value === 'true' && knownPeers.size > 0) {
    const peerAddress = Array.from(knownPeers.values())[0];
    connectWebSocket(peerAddress);
  }
};

export interface SyncStatus {
  isSyncing: boolean;
  error: string | null;
  lastSynced: string | null;
  isPaired?: boolean;
}

let syncStatusListeners: ((status: SyncStatus) => void)[] = [];
let currentSyncStatus: SyncStatus = {
  isSyncing: false,
  error: null,
  lastSynced: null,
};

function notifyListeners() {
  syncStatusListeners.forEach((l) => l({ ...currentSyncStatus }));
}

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
  syncStatusListeners.push(listener);
  listener({ ...currentSyncStatus });
  return () => {
    syncStatusListeners = syncStatusListeners.filter((l) => l !== listener);
  };
};

export const updateSyncStatus = (updates: Partial<SyncStatus>) => {
  currentSyncStatus = { ...currentSyncStatus, ...updates };
  notifyListeners();
};

export const initializeRealtimeSync = async (): Promise<void> => {
  console.log('[Sync Engine] Starting mDNS scan for peers...');
  
  zeroconf.on('start', () => console.log('The scan has started.'));
  zeroconf.on('resolved', (service: any) => {
    console.log('[Sync Engine] Found Peer:', service);
    if (service.name.startsWith('boothub')) {
      const ip = service.addresses[0];
      const port = service.port;
      if (ip && port) {
        knownPeers.set(service.name, `${ip}:${port}`);
        processSyncQueue().catch(console.error);
        connectWebSocket(`${ip}:${port}`);
      }
    }
  });
  zeroconf.on('error', (err: any) => console.log('[Sync Engine] Zeroconf error:', err));
  
  zeroconf.scan('boothub', 'tcp', '');
};

export const closeRealtimeSync = (): void => {
  zeroconf.stop();
  knownPeers.clear();
  if (ws) {
    ws.close();
    ws = null;
  }
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
  }
};

// Deprecated / stubbed out for P2P rewrite
export const notifyRemoteDevicesOfChange = async (): Promise<void> => {};
export const getSyncQueue = async (): Promise<any[]> => [];
export const enqueueSyncTasks = async (): Promise<void> => {};
export const enqueueSyncTask = async (): Promise<void> => {};
export const enqueueUnsyncedLocalItems = async (): Promise<void> => {};
export const pullChangesFromCloud = async (): Promise<void> => {};
export const clearSyncError = () => updateSyncStatus({ error: null });

let isProcessingQueue = false;

export const processSyncQueue = async (): Promise<void> => {
  if (isProcessingQueue) return;
  const isPairedRow = getDb().getFirstSync<{ value: string }>("SELECT value FROM config WHERE key = 'is_paired'");
  if (isPairedRow?.value !== 'true') {
    console.log('[Sync Engine] Device is not paired. Skipping sync.');
    return;
  }
  if (knownPeers.size === 0) {
    console.log('[Sync Engine] No peers found to sync with.');
    return;
  }
  
  isProcessingQueue = true;
  updateSyncStatus({ isSyncing: true, error: null });
  
  try {
    const db = getDb();
    const peerAddress = Array.from(knownPeers.values())[0];
    const peerUrl = `http://${peerAddress}`;
    
    // 1. Request remote events since last pull
    const pullKey = `sync_pull_${peerAddress}`;
    const pullRow = db.getFirstSync<{value: string}>('SELECT value FROM config WHERE key = ?', [pullKey]);
    const lastPullClock = pullRow ? parseInt(pullRow.value, 10) : 0;
    
    console.log(`[Sync Engine] Exchanging events with ${peerUrl}... (since ${lastPullClock})`);
    
    const response = await axios.get(`${peerUrl}/sync?since=${lastPullClock}`, { timeout: 5000 });
    const remoteEvents: SyncEvent[] = response.data.events || [];
    const remoteMaxClock: number = response.data.max_clock || 0;
    
    // 2. Insert remote events locally
    if (remoteEvents.length > 0) {
      db.withTransactionSync(() => {
        for (const ev of remoteEvents) {
          const exists = db.getFirstSync('SELECT id FROM events WHERE id = ?', [ev.id]);
          if (!exists) {
            db.runSync(
              'INSERT INTO events (id, entity_id, clock, device_id, action, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [ev.id, ev.entity_id, ev.clock, ev.device_id, ev.action, ev.payload, ev.created_at]
            );
          }
        }
      });
      
      // Recover missing files for ALL remote file events (in case a previous download failed)
      const { getLocalDeviceId } = require('./storage');
      const allRemoteItemEvents = db.getAllSync<SyncEvent>(
        "SELECT * FROM events WHERE action = 'ITEM_CREATED' AND device_id != ?",
        [getLocalDeviceId()]
      );
      for (const ev of allRemoteItemEvents) {
        if (ev.action === 'ITEM_CREATED') {
          try {
            const parsed = JSON.parse(ev.payload);
            if (parsed.type === 'photo' || parsed.type === 'file') {
              const base = FileSystem.documentDirectory || FileSystem.cacheDirectory;
              const safeBase = base?.endsWith('/') ? base : base + '/';
              let ext = '';
              if (parsed.type === 'file') {
                  try {
                      const fileObj = JSON.parse(parsed.value);
                      const m = fileObj.name?.match(/(\.[a-zA-Z0-9]+)$/);
                      ext = m ? m[1] : '';
                  } catch (e) {}
              } else {
                  const match = parsed.value.match(/(\.[a-zA-Z0-9]+)$/);
                  ext = match ? match[1] : '';
              }
              const dest = `${safeBase}${ev.entity_id}${ext}`;
              try {
                await FileSystem.makeDirectoryAsync(safeBase, { intermediates: true });
              } catch (err) {
                console.error('[Sync Engine] makeDirectoryAsync failed:', err);
              }
              const fileInfo = await FileSystem.getInfoAsync(dest);
              if (!fileInfo.exists || fileInfo.size === 0) {
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(dest, { idempotent: true });
                }
                console.log(`[Sync Engine] Downloading missing file for ${ev.entity_id}...`);
                const url = `${peerUrl}/files/${ev.entity_id}?t=${Date.now()}`;
                console.log(`[Sync Engine] Download URL: ${url}`);
                console.log(`[Sync Engine] Dest path: ${dest}`);
                await FileSystem.downloadAsync(url, dest, {
                  sessionType: FileSystemSessionType.FOREGROUND
                });
              }
            }
          } catch (e) {
            console.error('[Sync Engine] Failed to parse or download file for event', ev.id, e);
          }
        }
      }
      
      try {
        const { Image } = require('expo-image');
        await Image.clearMemoryCache();
        await Image.clearDiskCache();
      } catch (e) {}
      
      // Rebuild views for affected entities
      const entitiesToUpdate = [...new Set(remoteEvents.map(e => e.entity_id))];
      const { rebuildMaterializedView, notifyStorageListeners } = require('./storage');
      for (const entity of entitiesToUpdate) {
        rebuildMaterializedView(entity);
      }
      notifyStorageListeners();
    }
    
    if (remoteMaxClock > lastPullClock) {
      db.runSync('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [pullKey, remoteMaxClock.toString()]);
    }
    
    // 3. Send our local events to remote
    const pushKey = `sync_push_${peerAddress}`;
    const pushRow = db.getFirstSync<{value: string}>('SELECT value FROM config WHERE key = ?', [pushKey]);
    const lastPushClock = pushRow ? parseInt(pushRow.value, 10) : 0;
    
    const localEventsToPush = db.getAllSync<SyncEvent>('SELECT * FROM events WHERE clock > ? ORDER BY clock ASC', [lastPushClock]);
    if (localEventsToPush.length > 0) {
      // First upload any files before sending the events
      for (const ev of localEventsToPush) {
        if (ev.action === 'ITEM_CREATED') {
          try {
            const parsed = JSON.parse(ev.payload);
            if (parsed.type === 'photo' || parsed.type === 'file') {
              const localUri = parsed.value;
              if (localUri.startsWith('file://') || localUri.startsWith('ph://')) {
                console.log(`[Sync Engine] Uploading local file for ${ev.entity_id}...`);
                const { resolveToLocalFileUri } = require('./helpers');
                const uploadUri = await resolveToLocalFileUri(localUri);
                await FileSystem.uploadAsync(`${peerUrl}/files/${ev.entity_id}`, uploadUri, {
                  httpMethod: 'POST',
                  uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                });
              }
            }
          } catch (e) {
            console.error('[Sync Engine] Failed to upload file for event', ev.id, e);
          }
        }
      }
      await axios.post(`${peerUrl}/sync`, { events: localEventsToPush }, { timeout: 5000 });
      
      const maxPushedClock = localEventsToPush[localEventsToPush.length - 1].clock;
      db.runSync('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [pushKey, maxPushedClock.toString()]);
    }
    
    // 4. Garbage Collection for Orphaned Files
    await cleanUpOrphanedFiles();
    
    updateSyncStatus({ isSyncing: false, error: null, lastSynced: new Date().toLocaleString() });
    
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response?.status === 403) {
      console.log('[Sync Engine] Desktop unpaired us (403). Updating local state.');
      saveSetting('is_paired', 'false').catch(console.error);
      saveSetting('paired_device_id', '').catch(console.error);
      closeRealtimeSync();
      updateSyncStatus({ isSyncing: false, error: null, isPaired: false });
    } else {
      console.error('[Sync Engine] Sync failed:', err);
      updateSyncStatus({ isSyncing: false, error: 'P2P Sync failed: ' + err.message });
    }
  } finally {
    isProcessingQueue = false;
  }
};

async function cleanUpOrphanedFiles() {
  try {
    const { getDb } = require('./storage');
    const { ensureFileUri } = require('./helpers');
    const FileSystem = require('expo-file-system/legacy');
    
    const db = getDb();
    const activeItems = db.getAllSync("SELECT id, type, value FROM items WHERE type IN ('photo', 'file')");
    const validNames = new Set<string>();
    
    validNames.add('SQLite');
    validNames.add('RCTAsyncLocalStorage_V1');
    validNames.add('ExponentDatabase');
    
    for (const item of activeItems as any[]) {
      try {
        if (item.type === 'photo') {
          const uri = ensureFileUri(item.value, item.id);
          if (uri && uri.startsWith('file://')) {
            const parts = uri.split('/');
            validNames.add(parts[parts.length - 1]);
          }
        } else if (item.type === 'file') {
          const fObj = JSON.parse(item.value);
          const uri = ensureFileUri(fObj.uri, item.id);
          if (uri && uri.startsWith('file://')) {
            const parts = uri.split('/');
            validNames.add(parts[parts.length - 1]);
          }
          if (fObj.artwork) {
            const artUri = ensureFileUri(fObj.artwork, item.id);
            if (artUri && artUri.startsWith('file://')) {
              const parts = artUri.split('/');
              validNames.add(parts[parts.length - 1]);
            }
          }
        }
      } catch (e) {}
    }
    
    const base = FileSystem.documentDirectory;
    if (!base) return;
    const safeBase = base.endsWith('/') ? base : base + '/';
    const files = await FileSystem.readDirectoryAsync(safeBase);
    
    const now = Date.now();
    for (const file of files) {
      if (file.startsWith('.') || validNames.has(file)) continue;
      
      const fileInfo = await FileSystem.getInfoAsync(safeBase + file);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        // Buffer of 60 seconds to prevent deleting files currently being uploaded/downloaded
        const modTime = (fileInfo.modificationTime || 0) * 1000;
        if (now - modTime > 60000 || !fileInfo.modificationTime) {
          console.log(`[Sync Engine] Garbage Collector: Deleting orphaned file ${file}`);
          await FileSystem.deleteAsync(safeBase + file, { idempotent: true }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[Sync Engine] Garbage Collector Error:', err);
  }
}

