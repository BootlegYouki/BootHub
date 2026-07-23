import Zeroconf from 'react-native-zeroconf';
import axios from 'axios';
import { getDb, SyncEvent } from './storage';
import { Alert } from 'react-native';

const zeroconf = new Zeroconf();
let knownPeers = new Map<string, string>(); // name -> ip:port

export interface SyncStatus {
  isSyncing: boolean;
  error: string | null;
  lastSynced: string | null;
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
      }
    }
  });
  zeroconf.on('error', (err: any) => console.log('[Sync Engine] Zeroconf error:', err));
  
  zeroconf.scan('boothub', 'tcp', 'local.');
};

export const closeRealtimeSync = (): void => {
  zeroconf.stop();
  knownPeers.clear();
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
  if (knownPeers.size === 0) {
    console.log('[Sync Engine] No peers found to sync with.');
    return;
  }
  
  isProcessingQueue = true;
  updateSyncStatus({ isSyncing: true, error: null });
  
  try {
    const db = getDb();
    const localMaxClockRow = db.getFirstSync<{clock: number}>('SELECT MAX(clock) as clock FROM events');
    const localClock = localMaxClockRow?.clock || 0;
    
    // Sync with the first available peer
    const peerAddress = Array.from(knownPeers.values())[0];
    const peerUrl = `http://${peerAddress}`;
    
    console.log(`[Sync Engine] Exchanging events with ${peerUrl}...`);
    
    // 1. Request remote events since localClock
    const response = await axios.get(`${peerUrl}/sync?since=${localClock}`, { timeout: 5000 });
    const remoteEvents: SyncEvent[] = response.data.events || [];
    const remoteMaxClock: number = response.data.maxClock || 0;
    
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
      
      // Rebuild views for affected entities
      const entitiesToUpdate = [...new Set(remoteEvents.map(e => e.entity_id))];
      const { rebuildMaterializedView, notifyStorageListeners } = require('./storage');
      for (const entity of entitiesToUpdate) {
        rebuildMaterializedView(entity);
      }
      notifyStorageListeners();
    }
    
    // 3. Send our local events to remote
    const localEventsToPush = db.getAllSync<SyncEvent>('SELECT * FROM events WHERE clock > ? ORDER BY clock ASC', [remoteMaxClock]);
    if (localEventsToPush.length > 0) {
      await axios.post(`${peerUrl}/sync`, { events: localEventsToPush }, { timeout: 5000 });
    }
    
    updateSyncStatus({ isSyncing: false, error: null, lastSynced: new Date().toLocaleString() });
    
  } catch (err: any) {
    console.error('[Sync Engine] Sync failed:', err);
    updateSyncStatus({ isSyncing: false, error: 'P2P Sync failed: ' + err.message });
  } finally {
    isProcessingQueue = false;
  }
};
