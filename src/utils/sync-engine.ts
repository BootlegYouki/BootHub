import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import type { DumpItem, DumpType } from './storage';
import { getValidAccessToken, getOrCreateSyncFolder, uploadJsonToDrive, uploadBinaryToDrive, deleteFileFromDrive } from './google-drive';
import { ensureFileUri } from './helpers';
import * as MediaLibrary from 'expo-media-library';

export interface SyncTask {
  id: string; // Unique task ID (timestamp-based)
  action: 'UPLOAD' | 'DELETE' | 'UPDATE';
  itemId: string; // The local item ID
  itemType: DumpType;
  fileUri?: string; // Local URI (only for photos/files)
  driveMetaFileId?: string; // Stored here for DELETE tasks since local item is gone
  driveFileId?: string; // Stored here for DELETE tasks to delete binary asset
}

const QUEUE_STORAGE_KEY = '@boothub_sync_queue';
const LAST_SYNC_KEY = '@boothub_last_sync_time';

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

// Load initial last synced time on load
AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
  if (val) {
    currentSyncStatus.lastSynced = val;
    notifyListeners();
  }
});

function notifyListeners() {
  syncStatusListeners.forEach((l) => l({ ...currentSyncStatus }));
}

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
  syncStatusListeners.push(listener);
  listener({ ...currentSyncStatus }); // Emit current state immediately
  return () => {
    syncStatusListeners = syncStatusListeners.filter((l) => l !== listener);
  };
};

const updateSyncStatus = (updates: Partial<SyncStatus>) => {
  currentSyncStatus = { ...currentSyncStatus, ...updates };
  if (updates.lastSynced) {
    AsyncStorage.setItem(LAST_SYNC_KEY, updates.lastSynced).catch(() => {});
  }
  notifyListeners();
};

export const getSyncQueue = async (): Promise<SyncTask[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to get sync queue:', err);
    return [];
  }
};

export const saveSyncQueue = async (queue: SyncTask[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save sync queue:', err);
  }
};

/**
 * Enqueue a sync task. Optimizes the queue by resolving adjacent actions.
 */
export const enqueueSyncTask = async (
  action: 'UPLOAD' | 'DELETE' | 'UPDATE',
  itemId: string,
  itemType: DumpType,
  extras?: Partial<SyncTask>
): Promise<void> => {
  const queue = await getSyncQueue();
  
  // Optimization: If a delete task is enqueued:
  if (action === 'DELETE') {
    // 1. Remove any pending UPLOAD or UPDATE tasks for this item
    const optimizedQueue = queue.filter((t) => t.itemId !== itemId);
    
    // 2. If it was a pending UPLOAD (never hit Drive), we don't even need to sync a deletion!
    const hadPendingUpload = queue.some((t) => t.itemId === itemId && t.action === 'UPLOAD');
    if (hadPendingUpload) {
      await saveSyncQueue(optimizedQueue);
      return;
    }
    
    // Otherwise, append the DELETE task
    const newTask: SyncTask = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      itemId,
      itemType,
      driveMetaFileId: extras?.driveMetaFileId,
      driveFileId: extras?.driveFileId,
    };
    await saveSyncQueue([...optimizedQueue, newTask]);
    return;
  }

  // Optimization: If an update task is enqueued:
  if (action === 'UPDATE') {
    // If there is already a pending UPLOAD, we don't need a separate UPDATE
    const hasPendingUpload = queue.some((t) => t.itemId === itemId && t.action === 'UPLOAD');
    if (hasPendingUpload) {
      return;
    }
    
    // Remove previous UPDATE tasks to avoid duplicate updates
    const optimizedQueue = queue.filter((t) => !(t.itemId === itemId && t.action === 'UPDATE'));
    const newTask: SyncTask = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      itemId,
      itemType,
    };
    await saveSyncQueue([...optimizedQueue, newTask]);
    return;
  }

  // Otherwise, append standard UPLOAD task
  const newTask: SyncTask = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    action,
    itemId,
    itemType,
    fileUri: extras?.fileUri,
  };
  await saveSyncQueue([...queue, newTask]);
};

let isProcessingQueue = false;

/**
 * Resolves local iOS/Android asset URIs to absolute paths on the device.
 */
const resolveLocalFile = async (uri: string): Promise<string> => {
  let fileUri = uri;
  if (fileUri.startsWith('ph://')) {
    const assetId = fileUri.slice(5);
    const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
    if (assetInfo && assetInfo.localUri) {
      fileUri = assetInfo.localUri;
    }
  }
  return ensureFileUri(fileUri);
};

/**
 * Process the local sync queue sequentially.
 */
export const processSyncQueue = async (): Promise<void> => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  updateSyncStatus({ isSyncing: true, error: null });

  try {
    const { getItems, saveItems } = require('./storage') as typeof import('./storage');
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      updateSyncStatus({ isSyncing: false, error: 'Sign-in required to synchronize.' });
      isProcessingQueue = false;
      return;
    }

    const queue = await getSyncQueue();
    if (queue.length === 0) {
      updateSyncStatus({ isSyncing: false });
      isProcessingQueue = false;
      return;
    }

    const syncFolderId = await getOrCreateSyncFolder(accessToken);

    for (const task of [...queue]) {
      try {
        const localItems = await getItems();
        const localItem = localItems.find((item) => item.id === task.itemId);

        // If item was deleted locally in the meantime, and this is not a delete task, skip
        if (!localItem && task.action !== 'DELETE') {
          await dequeueTask(task.id);
          continue;
        }

        if (task.action === 'UPLOAD') {
          if (!localItem) continue;

          let driveFileId = localItem.driveFileId;
          
          // 1. If it's a binary photo/file, upload it first
          if ((localItem.type === 'photo' || localItem.type === 'file') && !driveFileId) {
            let localFileUri = '';
            let fileName = '';
            let mimeType = 'application/octet-stream';

            if (localItem.type === 'photo') {
              localFileUri = await resolveLocalFile(localItem.value);
              fileName = `photo_${localItem.id}.${localFileUri.split('.').pop() || 'jpg'}`;
              mimeType = localFileUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            } else {
              // File
              const fileObj = JSON.parse(localItem.value);
              localFileUri = ensureFileUri(fileObj.uri);
              fileName = fileObj.name || `file_${localItem.id}`;
              mimeType = fileObj.mimeType || 'application/octet-stream';
            }

            driveFileId = await uploadBinaryToDrive(
              accessToken,
              syncFolderId,
              fileName,
              localFileUri,
              mimeType
            );
          }

          // 2. Upload metadata json
          const metadataFileName = `item_${localItem.id}.json`;
          
          // Update item data structure with sync info
          const updatedItem = {
            ...localItem,
            syncState: 'synced' as const,
            driveFileId,
          };

          const driveMetaFileId = await uploadJsonToDrive(
            accessToken,
            syncFolderId,
            metadataFileName,
            JSON.stringify(updatedItem)
          );

          // Update local AsyncStorage directly without enqueuing a new sync task
          const updatedLocalList = localItems.map((item) => {
            if (item.id === localItem.id) {
              return {
                ...item,
                syncState: 'synced' as const,
                driveFileId,
                driveMetaFileId,
              };
            }
            return item;
          });
          await saveItems(updatedLocalList);

        } else if (task.action === 'UPDATE') {
          if (!localItem) continue;

          // If it was never uploaded to drive, treat as upload
          if (!localItem.driveMetaFileId) {
            task.action = 'UPLOAD';
            await processSyncQueue(); // restart queue
            return;
          }

          const metadataFileName = `item_${localItem.id}.json`;
          const updatedItem = {
            ...localItem,
            syncState: 'synced' as const,
          };

          await uploadJsonToDrive(
            accessToken,
            syncFolderId,
            metadataFileName,
            JSON.stringify(updatedItem),
            localItem.driveMetaFileId
          );

          // Update local state to synced
          const updatedLocalList = localItems.map((item) => {
            if (item.id === localItem.id) {
              return { ...item, syncState: 'synced' as const };
            }
            return item;
          });
          await saveItems(updatedLocalList);

        } else if (task.action === 'DELETE') {
          // Delete metadata file
          if (task.driveMetaFileId) {
            await deleteFileFromDrive(accessToken, task.driveMetaFileId);
          }
          // Delete binary asset if it exists
          if (task.driveFileId) {
            await deleteFileFromDrive(accessToken, task.driveFileId);
          }
        }

        // Successfully processed task, pop from queue
        await dequeueTask(task.id);
      } catch (err: any) {
        // Halt queue processing on network/connection failure
        const isNetworkError = axios.isAxiosError(err) && (!err.response || err.response.status >= 500);
        if (isNetworkError || err.message?.includes('Network Request Failed') || err.message?.includes('Network Error')) {
          console.warn('Network error during Google Drive sync. Pausing queue.');
          updateSyncStatus({ isSyncing: false, error: 'Connection offline. Sync will resume when online.' });
          isProcessingQueue = false;
          return;
        }

        console.error('Error syncing individual task:', err);
        // For other unrecoverable errors (403, 404), remove task so it doesn't block the queue indefinitely
        await dequeueTask(task.id);
      }
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const lastSyncedLabel = `${dateStr} @ ${timeStr}`;

    updateSyncStatus({ isSyncing: false, error: null, lastSynced: lastSyncedLabel });
  } catch (err: any) {
    console.error('Failed to run sync queue:', err);
    updateSyncStatus({ isSyncing: false, error: 'Sync failed: ' + (err.message || String(err)) });
  } finally {
    isProcessingQueue = false;
  }
};

const dequeueTask = async (taskId: string) => {
  const queue = await getSyncQueue();
  const filtered = queue.filter((t) => t.id !== taskId);
  await saveSyncQueue(filtered);
};
