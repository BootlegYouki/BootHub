import 'react-native-get-random-values';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';
import { formatSyncTimestamp } from './helpers';

export type DumpType = 'link' | 'text' | 'photo' | 'file' | 'folder';

export interface DumpItem {
  id: string;
  type: DumpType;
  label: string;
  value: string;
  folderId?: string;
  syncState?: 'synced' | 'pending' | 'error';
  storagePath?: string;
}

export interface SyncEvent {
  id: string;
  entity_id: string;
  clock: number;
  device_id: string;
  action: 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED';
  payload: string;
  created_at: string;
}

const db = SQLite.openDatabaseSync('boothub_events.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    clock INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_id);
  CREATE INDEX IF NOT EXISTS idx_events_clock ON events(clock);
  
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    folderId TEXT,
    syncState TEXT
  );
  
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

let localDeviceId = '';
try {
  const row = db.getFirstSync<{value: string}>('SELECT value FROM config WHERE key = ?', ['device_id']);
  if (row) {
    localDeviceId = row.value;
  } else {
    localDeviceId = uuidv4();
    db.runSync('INSERT INTO config (key, value) VALUES (?, ?)', ['device_id', localDeviceId]);
  }
} catch (e) {
  console.error('Failed to init device_id:', e);
}

export const getLocalDeviceId = () => localDeviceId;

export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const row = db.getFirstSync<{value: string}>('SELECT value FROM config WHERE key = ?', [key]);
    return row ? row.value : null;
  } catch (e) {
    return null;
  }
};

export const saveSetting = async (key: string, value: string): Promise<void> => {
  try {
    db.runSync('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);
  } catch (e) {
    console.error(`Failed to save setting ${key}:`, e);
  }
};
const getNextClock = (): number => {
  const row = db.getFirstSync<{clock: number}>('SELECT MAX(clock) as clock FROM events');
  return (row?.clock || 0) + 1;
};

let storageListeners: (() => void)[] = [];

export const subscribeToStorage = (listener: () => void) => {
  storageListeners.push(listener);
  return () => {
    storageListeners = storageListeners.filter((l) => l !== listener);
  };
};

export const notifyStorageListeners = () => {
  storageListeners.forEach((l) => l());
  try {
    const { syncDatabaseToFilesystem } = require('./filesystem-sync');
    syncDatabaseToFilesystem().catch((err: any) => console.error('[Storage Sync] Failed to sync filesystem:', err));
  } catch (e) {
    console.error('[Storage Sync] Failed to load filesystem-sync:', e);
  }
};

// Sync Triggers
let onProcessQueue: (() => Promise<void>) | null = null;
export const registerSyncTrigger = (
  enqueue: any,
  enqueueMultiple: any,
  process: () => Promise<void>
) => {
  onProcessQueue = process;
};

export const getItems = async (): Promise<DumpItem[]> => {
  try {
    const rows = db.getAllSync<DumpItem>('SELECT * FROM items ORDER BY rowid DESC');
    return rows;
  } catch (e) {
    console.error('Failed to get items:', e);
    return [];
  }
};

export const getDb = () => db;

export const rebuildMaterializedView = (entityId: string) => {
  // Simple LWW strategy based on clock for this entity
  const events = db.getAllSync<SyncEvent>(
    'SELECT * FROM events WHERE entity_id = ? ORDER BY clock ASC, device_id ASC', 
    [entityId]
  );
  
  if (events.length === 0) return;
  
  let currentItem: Partial<DumpItem> | null = null;
  
  for (const ev of events) {
    if (ev.action === 'ITEM_CREATED' || ev.action === 'ITEM_UPDATED') {
      try {
        const payload = JSON.parse(ev.payload);
        if (!currentItem) currentItem = { id: entityId };
        Object.assign(currentItem, payload);
      } catch (e) {}
    } else if (ev.action === 'ITEM_DELETED') {
      currentItem = null;
    }
  }
  
  if (currentItem) {
    db.runSync(
      'INSERT OR REPLACE INTO items (id, type, label, value, folderId, syncState) VALUES (?, ?, ?, ?, ?, ?)',
      [
        currentItem.id as string, 
        currentItem.type as string, 
        currentItem.label as string, 
        currentItem.value as string, 
        currentItem.folderId || null, 
        'pending'
      ]
    );
  } else {
    db.runSync('DELETE FROM items WHERE id = ?', [entityId]);
  }
};

export const appendEvent = (entityId: string, action: SyncEvent['action'], payloadObj: any) => {
  const clock = getNextClock();
  const id = uuidv4();
  const payload = JSON.parse(JSON.stringify(payloadObj));
  
  db.runSync(
    'INSERT INTO events (id, entity_id, clock, device_id, action, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      entityId,
      clock,
      localDeviceId,
      action,
      JSON.stringify(payload),
      new Date().toISOString()
    ]
  );
  rebuildMaterializedView(entityId);
  notifyStorageListeners();
  
  // Trigger P2P Sync implicitly
  try {
    const { processSyncQueue } = require('./sync-engine');
    processSyncQueue().catch(console.error);
  } catch (e) {}
};

export const saveItems = async (items: DumpItem[]): Promise<void> => {}; // deprecated

export const addItem = async (type: DumpType, value: string, folderId?: string): Promise<DumpItem[]> => {
  const label = formatSyncTimestamp();
  let itemLabel = label;
  let finalValue = value;
  
  if (type === 'file' || type === 'folder') {
    try {
      const parsed = JSON.parse(value);
      let name = parsed.name || label;
      
      const query = folderId 
        ? `SELECT id, value FROM items WHERE type = ? AND folderId = ?`
        : `SELECT id, value FROM items WHERE type = ? AND folderId IS NULL`;
        
      const siblings = db.getAllSync<{id: string, value: string}>(query, folderId ? [type, folderId] : [type]);
      
      const existing = siblings.find(s => {
         try {
            return JSON.parse(s.value).name === name;
         } catch { return false; }
      });
      
      if (existing) {
         const payload = {
           type,
           label: itemLabel,
           value: finalValue,
           folderId: folderId || null
         };
         appendEvent(existing.id, 'ITEM_UPDATED', payload);
         return getItems();
      }
      
    } catch {}
  }
  
  const id = Date.now().toString();
  const payload = {
    type,
    label: itemLabel,
    value: finalValue,
    ...(folderId ? { folderId } : {})
  };
  
  appendEvent(id, 'ITEM_CREATED', payload);
  return await getItems();
};

export const deleteItem = async (id: string): Promise<DumpItem[]> => {
  const target = db.getFirstSync<DumpItem>('SELECT type, value FROM items WHERE id = ?', [id]);
  if (!target) return await getItems();
  
  const deleteFileFromDisk = async (value: string, itemId: string) => {
    try {
      const { ensureFileUri } = require('./helpers');
      
      // Try parsing as JSON for mobile-created files
      try {
        const fileObj = JSON.parse(value);
        if (fileObj.uri && fileObj.uri.startsWith('file://')) {
          await FileSystem.deleteAsync(fileObj.uri, { idempotent: true });
        }
      } catch (err) {}
      
      // Always try the resolved URI (for desktop-synced files)
      const uri = ensureFileUri(value, itemId);
      if (uri && uri.startsWith('file://')) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (e) {
      console.error('[deleteItem] Failed to delete file from disk', e);
    }
  };

  if (target.type === 'folder') {
    const allItems = await getItems();
    const getRecursiveChildren = (itemsList: DumpItem[], folderId: string): DumpItem[] => {
      let children: DumpItem[] = [];
      const direct = itemsList.filter(x => x.folderId === folderId);
      for (const child of direct) {
        children.push(child);
        if (child.type === 'folder') {
          children = [...children, ...getRecursiveChildren(itemsList, child.id)];
        }
      }
      return children;
    };
    
    const childrenToDelete = getRecursiveChildren(allItems, id);
    for (const child of childrenToDelete) {
      if (child.type === 'file' || child.type === 'photo') {
        await deleteFileFromDisk(child.value, child.id);
      }
      appendEvent(child.id, 'ITEM_DELETED', {});
    }
    appendEvent(id, 'ITEM_DELETED', {});
  } else {
    if (target.type === 'file' || target.type === 'photo') {
      await deleteFileFromDisk(target.value, id);
    }
    appendEvent(id, 'ITEM_DELETED', {});
  }

  return await getItems();
};

export const updateItem = async (id: string, value: string, label?: string): Promise<DumpItem[]> => {
  const item = db.getFirstSync<DumpItem>('SELECT * FROM items WHERE id = ?', [id]);
  if (!item) return await getItems();
  
  let finalValue = value;
  let finalLabel = label !== undefined ? label : item.label;
  
  if (item.type === 'file') {
    try {
      const fileObj = JSON.parse(item.value);
      fileObj.name = value;
      finalValue = JSON.stringify(fileObj);
    } catch {
      finalValue = value;
    }
  }
  
  if (item.type === 'folder') {
    try {
      const folderObj = JSON.parse(item.value);
      folderObj.name = value;
      finalValue = JSON.stringify(folderObj);
    } catch {
      finalValue = value;
    }
    finalLabel = value;
  }

  appendEvent(id, 'ITEM_UPDATED', { value: finalValue, label: finalLabel });
  return await getItems();
};

export const addMultiplePhotos = async (uris: string[], folderId?: string): Promise<DumpItem[]> => {
  const label = formatSyncTimestamp();
  
  for (let i = 0; i < uris.length; i++) {
    const id = `${Date.now()}_${i}`;
    const payload = {
      type: 'photo',
      label,
      value: uris[i],
      ...(folderId ? { folderId } : {})
    };
    appendEvent(id, 'ITEM_CREATED', payload);
  }
  
  return await getItems();
};

export const setItemFolder = async (id: string, folderId: string | undefined): Promise<DumpItem[]> => {
  const payload = folderId === undefined ? { folderId: null } : { folderId };
  appendEvent(id, 'ITEM_UPDATED', payload);
  return await getItems();
};
