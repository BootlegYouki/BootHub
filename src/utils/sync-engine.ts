import Zeroconf from 'react-native-zeroconf';
import axios from 'axios';
import { getDb, SyncEvent, saveSetting, getSetting } from './storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { resolveFolderPath } from './filesystem-sync';
import { FileSystemSessionType } from 'expo-file-system/legacy';

const zeroconf = new Zeroconf();
let knownPeers = new Map<string, string>(); // name -> ip:port
let ws: WebSocket | null = null;
let wsReconnectTimeout: NodeJS.Timeout | null = null;

let activeWsUrl: string | null = null;
let lastWsSendMap = new Map<string, number>();

async function connectWebSocket(peerAddress: string) {
  const isPairedRow = getDb().getFirstSync<{ value: string }>("SELECT value FROM config WHERE key = 'is_paired'");
  if (isPairedRow?.value !== 'true') {
    console.log('[Sync Engine] Device is not paired. Skipping WebSocket connection.');
    return;
  }
  
  let authToken = '';
  try {
    authToken = await getSetting('auth_token') || '';
  } catch (e) {}

  const wsUrl = `ws://${peerAddress}/ws?token=${encodeURIComponent(authToken)}`;

  if (ws && activeWsUrl === wsUrl) {
    if (ws.readyState === 0 || ws.readyState === 1) {
      return;
    }
  }

  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;
    ws.close();
    ws = null;
  }
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }
  
  activeWsUrl = wsUrl;
  console.log(`[Sync Engine] Connecting WebSocket to ${wsUrl}`);
  const currentWs = new WebSocket(wsUrl);
  ws = currentWs;
  
  currentWs.onopen = () => {
    console.log('[Sync Engine] WebSocket connected');
  };
  
  currentWs.onmessage = (event) => {
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
  
  currentWs.onclose = () => {
    if (ws !== currentWs) return;
    console.log('[Sync Engine] WebSocket closed, attempting to reconnect...');
    ws = null;
    activeWsUrl = null;
    wsReconnectTimeout = setTimeout(() => {
      if (knownPeers.size > 0) {
        connectWebSocket(Array.from(knownPeers.values())[0]);
      }
    }, 5000);
  };
  
  currentWs.onerror = (e) => {
    if (ws !== currentWs) return;
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

export const fileProgressMap = new Map<string, number>();
const fileProgressListeners = new Set<(itemId: string, progress: number) => void>();

export const subscribeToFileProgress = (fn: (itemId: string, progress: number) => void) => {
  fileProgressListeners.add(fn);
  return () => {
    fileProgressListeners.delete(fn);
  };
};

export const setFileProgress = (itemId: string, progress: number) => {
  if (progress >= 1) {
    fileProgressMap.delete(itemId);
  } else {
    fileProgressMap.set(itemId, progress);
  }
  fileProgressListeners.forEach((l) => l(itemId, progress));
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
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;
    ws.close();
    ws = null;
  }
  activeWsUrl = null;
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
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
    
    let authToken = await getSetting('auth_token') || '';

    console.log(`[Sync Engine] Exchanging events with ${peerUrl}... (since ${lastPullClock})`);
    
    const response = await axios.get(`${peerUrl}/sync?since=${lastPullClock}`, {
      timeout: 5000,
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    const remoteEvents: SyncEvent[] = response.data.events || [];
    const remoteMaxClock: number = response.data.max_clock || 0;
    
    // Helper for parallel task execution with concurrency limit
    const runWithConcurrency = async (tasks: (() => Promise<void>)[], limit = 4) => {
      let index = 0;
      const worker = async () => {
        while (index < tasks.length) {
          const i = index++;
          try {
            await tasks[i]();
          } catch (err) {
            console.error('[Sync Engine] Concurrent task error:', err);
          }
        }
      };
      const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
      await Promise.all(workers);
    };

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
      
      // Track deleted entities to avoid downloading files for items that were deleted
      const deletedEntityIdsInRemote = new Set(
        remoteEvents.filter(ev => ev.action === 'ITEM_DELETED').map(ev => ev.entity_id)
      );

      const isEntityDeleted = (entityId: string): boolean => {
        if (deletedEntityIdsInRemote.has(entityId)) return true;
        const deletedInDb = db.getFirstSync('SELECT 1 FROM events WHERE entity_id = ? AND action = ?', [entityId, 'ITEM_DELETED']);
        return !!deletedInDb;
      };

      // Recover missing files only for non-deleted ITEM_CREATED events
      const newRemoteItemEvents = remoteEvents.filter(ev => ev.action === 'ITEM_CREATED' && !isEntityDeleted(ev.entity_id));
      const downloadTasks: (() => Promise<void>)[] = [];

      for (const ev of newRemoteItemEvents) {
        downloadTasks.push(async () => {
          try {
            const parsed = JSON.parse(ev.payload);
            if (parsed.type === 'photo' || parsed.type === 'file') {
              const base = FileSystem.documentDirectory || FileSystem.cacheDirectory;
              const safeBase = base?.endsWith('/') ? base : base + '/';
              
              // 1. Resolve subdirectory based on target folder
              const subfolderName = parsed.type === 'photo' ? 'images/' : 'files/';
              const dbInstance = getDb();
              const items = dbInstance.getAllSync<any>('SELECT * FROM items');
              const itemsMap = new Map<string, any>(items.map((i: any) => [i.id, i]));
              const { relativePath } = resolveFolderPath(ev.entity_id, itemsMap, parsed.type);
              const targetFolder = relativePath ? `${subfolderName}${relativePath}/` : subfolderName;
              const absoluteDir = `${safeBase}${targetFolder}`;
              
              // 2. Resolve original filename
              let filename = ev.entity_id;
              let ext = '';
              if (parsed.type === 'file') {
                try {
                  const fileObj = JSON.parse(parsed.value);
                  filename = fileObj.name || ev.entity_id;
                } catch (e) {}
              } else {
                const match = parsed.value.match(/(\.[a-zA-Z0-9]+)$/);
                ext = match ? match[1] : '.jpg';
                const valFilename = parsed.value.split('/').pop() || '';
                if (valFilename && !valFilename.startsWith('17') && valFilename.length > 5) {
                  filename = valFilename;
                } else if (parsed.label && parsed.label.length > 0 && !parsed.label.includes('@')) {
                  const sanitizedLabel = parsed.label.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim();
                  filename = (sanitizedLabel || 'photo') + ext;
                } else {
                  filename = `photo_${ev.entity_id}${ext}`;
                }
              }
              
              const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim() || ev.entity_id;
              
              try {
                await FileSystem.makeDirectoryAsync(absoluteDir, { intermediates: true });
              } catch (err) {}
              
              // Resolve unique target path to avoid naming collisions
              let dest = `${absoluteDir}${sanitizedFilename}`;
              let counter = 1;
              const dotIdx = sanitizedFilename.lastIndexOf('.');
              const baseName = dotIdx !== -1 ? sanitizedFilename.substring(0, dotIdx) : sanitizedFilename;
              const extName = dotIdx !== -1 ? sanitizedFilename.substring(dotIdx) : '';
              
              while ((await FileSystem.getInfoAsync(dest)).exists) {
                dest = `${absoluteDir}${baseName}_${counter}${extName}`;
                counter++;
              }
              
              let expectedSize = 0;
              if (parsed.type === 'file') {
                try {
                  const fileObj = JSON.parse(parsed.value);
                  expectedSize = fileObj.size || 0;
                } catch (e) {}
              }

              const fileInfo = await FileSystem.getInfoAsync(dest);
              let needsDownload = !fileInfo.exists || fileInfo.size === 0;
              if (fileInfo.exists && expectedSize > 0 && fileInfo.size !== expectedSize) {
                console.log(`[Sync Engine] File size mismatch detected for ${ev.entity_id}. Expected: ${expectedSize}, Current: ${fileInfo.size}. Redownloading...`);
                needsDownload = true;
              }

              if (needsDownload) {
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(dest, { idempotent: true });
                }
                console.log(`[Sync Engine] Downloading missing file for ${ev.entity_id}...`);
                const url = `${peerUrl}/files/${ev.entity_id}?t=${Date.now()}`;
                
                try {
                  const downloadResumable = FileSystem.createDownloadResumable(
                    url,
                    dest,
                    {
                      sessionType: FileSystemSessionType.FOREGROUND,
                      headers: {
                        Authorization: `Bearer ${authToken}`
                      }
                    },
                    (downloadProgress) => {
                      if (downloadProgress.totalBytesExpectedToWrite > 0) {
                        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                        setFileProgress(ev.entity_id, progress);
                        const now = Date.now();
                        const lastSent = lastWsSendMap.get(ev.entity_id) || 0;
                        if (now - lastSent > 150 || progress >= 1) {
                          lastWsSendMap.set(ev.entity_id, now);
                          if (ws && ws.readyState === 1) {
                            ws.send(JSON.stringify({ type: 'FILE_PROGRESS', itemId: ev.entity_id, progress }));
                          }
                        }
                      }
                    }
                  );
                  await downloadResumable.downloadAsync();
                  
                  setFileProgress(ev.entity_id, 1);
                  if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: 'FILE_PROGRESS', itemId: ev.entity_id, progress: 1 }));
                  }
                  
                  const checkInfo = await FileSystem.getInfoAsync(dest);
                  if (checkInfo.exists) {
                    if (expectedSize > 0 && checkInfo.size !== expectedSize) {
                      throw new Error(`Size mismatch after download: expected ${expectedSize}, got ${checkInfo.size}`);
                    }
                  } else {
                    throw new Error('Downloaded file does not exist on disk after completion');
                  }
                  
                  // Update database with local URI immediately
                  const localUri = `file://${dest}`;
                  let newValue = localUri;
                  if (parsed.type === 'file') {
                    try {
                      const fileObj = JSON.parse(parsed.value);
                      fileObj.uri = localUri;
                      newValue = JSON.stringify(fileObj);
                    } catch {}
                  }
                  
                  const db = getDb();
                  db.runSync('UPDATE items SET value = ? WHERE id = ?', [newValue, ev.entity_id]);
                  
                  const events = db.getAllSync<{ id: string; payload: string }>(
                    'SELECT id, payload FROM events WHERE entity_id = ?',
                    [ev.entity_id]
                  );
                  for (const evRow of events) {
                    try {
                      const payload = JSON.parse(evRow.payload);
                      if (payload.value) {
                        if (parsed.type === 'file') {
                          try {
                            const fileObj = JSON.parse(payload.value);
                            fileObj.uri = localUri;
                            payload.value = JSON.stringify(fileObj);
                          } catch {
                            payload.value = localUri;
                          }
                        } else {
                          payload.value = localUri;
                        }
                        db.runSync('UPDATE events SET payload = ? WHERE id = ?', [JSON.stringify(payload), evRow.id]);
                      }
                    } catch (e) {}
                  }
                } catch (downloadErr) {
                  console.warn(`[Sync Engine] Download failed or was interrupted for ${ev.entity_id}. Cleaning up partial file...`);
                  await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
                  throw downloadErr;
                }
              }
            }
          } catch (e) {
            console.error('[Sync Engine] Failed to parse or download file for event', ev.id, e);
          }
        });
      }

      await runWithConcurrency(downloadTasks, 4);
      
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
      const uploadTasks: (() => Promise<void>)[] = [];

      for (const ev of localEventsToPush) {
        if (ev.action === 'ITEM_CREATED') {
          uploadTasks.push(async () => {
            try {
              const parsed = JSON.parse(ev.payload);
              if (parsed.type === 'photo' || parsed.type === 'file') {
                let localUri = parsed.value;
                if (parsed.type === 'file') {
                  try {
                    const fileObj = JSON.parse(parsed.value);
                    localUri = fileObj.uri;
                  } catch (e) {}
                }
                
                if (localUri && (localUri.startsWith('file://') || localUri.startsWith('ph://'))) {
                  console.log(`[Sync Engine] Uploading local file for ${ev.entity_id}...`);
                  const { resolveToLocalFileUri } = require('./helpers');
                  const uploadUri = await resolveToLocalFileUri(localUri);
                  
                  const uploadTask = FileSystem.createUploadTask(
                    `${peerUrl}/files/${ev.entity_id}`,
                    uploadUri,
                    {
                      httpMethod: 'POST',
                      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                      headers: {
                        Authorization: `Bearer ${authToken}`
                      }
                    },
                    (uploadProgress) => {
                      if (uploadProgress.totalBytesExpectedToSend > 0) {
                        const progress = uploadProgress.totalBytesSent / uploadProgress.totalBytesExpectedToSend;
                        setFileProgress(ev.entity_id, progress);
                        const now = Date.now();
                        const lastSent = lastWsSendMap.get(ev.entity_id) || 0;
                        if (now - lastSent > 150 || progress >= 1) {
                          lastWsSendMap.set(ev.entity_id, now);
                          if (ws && ws.readyState === 1) {
                            ws.send(JSON.stringify({ type: 'FILE_PROGRESS', itemId: ev.entity_id, progress }));
                          }
                        }
                      }
                    }
                  );
                  await uploadTask.uploadAsync();
                  
                  setFileProgress(ev.entity_id, 1);
                  if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: 'FILE_PROGRESS', itemId: ev.entity_id, progress: 1 }));
                  }
                }
              }
            } catch (e) {
              console.error('[Sync Engine] Failed to upload file for event', ev.id, e);
            }
          });
        }
      }

      await runWithConcurrency(uploadTasks, 4);

      await axios.post(`${peerUrl}/sync`, { events: localEventsToPush }, {
        timeout: 5000,
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      const maxPushedClock = localEventsToPush[localEventsToPush.length - 1].clock;
      db.runSync('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [pushKey, maxPushedClock.toString()]);
    }
    
    // 4. Garbage Collection for Orphaned Files (only if deletions occurred)
    const hasDeletions = remoteEvents.some(ev => ev.action === 'ITEM_DELETED') || localEventsToPush.some(ev => ev.action === 'ITEM_DELETED');
    if (hasDeletions) {
      await cleanUpOrphanedFiles();
    }
    
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
          let fObj: any = {};
          try {
            fObj = JSON.parse(item.value);
          } catch (e) {}

          if (fObj.uri) {
            const uri = ensureFileUri(fObj.uri, item.id);
            if (uri && uri.startsWith('file://')) {
              const parts = uri.split('/');
              validNames.add(parts[parts.length - 1]);
            }
          }

          // Desktop-synced files might not have a uri in fObj. Their file is stored by item.id.
          const desktopUri = ensureFileUri(item.value, item.id);
          if (desktopUri && desktopUri.startsWith('file://')) {
            const parts = desktopUri.split('/');
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
    
    const foldersToScan = [
      { path: safeBase, isRoot: true },
      { path: safeBase + 'images/', isRoot: false },
      { path: safeBase + 'files/', isRoot: false },
    ];
    
    for (const folderSpec of foldersToScan) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(folderSpec.path);
        if (!dirInfo.exists || !dirInfo.isDirectory) continue;
        
        const files = await FileSystem.readDirectoryAsync(folderSpec.path);
        for (const file of files) {
          if (file.startsWith('.')) continue;
          
          if (folderSpec.isRoot) {
            if (file === 'images' || file === 'files' || file === 'texts' || file === 'links') continue;
            if (validNames.has(file)) continue;
          } else {
            if (validNames.has(file)) continue;
          }
          
          const filePath = folderSpec.path + file;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && !fileInfo.isDirectory) {
            console.log(`[Sync Engine] Garbage Collector: Deleting orphaned file ${filePath}`);
            await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {});
          }
        }
      } catch (err) {
        console.error(`[Sync Engine] Garbage Collector error for folder ${folderSpec.path}:`, err);
      }
    }
  } catch (err) {
    console.error('[Sync Engine] Garbage Collector Error:', err);
  }
}

