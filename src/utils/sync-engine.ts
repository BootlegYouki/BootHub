import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import type { DumpItem, DumpType } from './storage';
import {
  getValidAccessToken,
  getOrCreateSyncFolder,
  uploadJsonToDrive,
  uploadBinaryToDrive,
  deleteFileFromDrive,
  getOrCreateSubFolder,
  ensureFileParent,
  fetchAllMetadataFromDrive,
  downloadJsonContent,
  getGoogleUserInfo,
} from './google-drive';

let realtimeWs: WebSocket | null = null;
let realtimeReconnectTimer: any = null;
let realtimeActiveEmail: string | null = null;
let isRealtimeClosed = false;

export const initializeRealtimeSync = async (): Promise<void> => {
  try {
    const userInfo = await getGoogleUserInfo();
    if (!userInfo || !userInfo.email) {
      closeRealtimeSync();
      return;
    }

    const email = userInfo.email.trim().toLowerCase();
    if (realtimeWs && realtimeActiveEmail === email) {
      return;
    }

    if (realtimeWs) {
      closeRealtimeSync();
    }

    isRealtimeClosed = false;
    realtimeActiveEmail = email;

    let hexEmail = '';
    for (let i = 0; i < email.length; i++) {
      hexEmail += email.charCodeAt(i).toString(16);
    }
    const topic = `boothub-sync-${hexEmail}`;
    const wsUrl = `wss://ntfy.sh/${topic}/ws`;

    const connect = () => {
      if (isRealtimeClosed || realtimeActiveEmail !== email) return;
      console.log('[Realtime Sync] Connecting to', wsUrl);
      realtimeWs = new WebSocket(wsUrl);

      realtimeWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message' && data.message === 'sync') {
            console.log('[Realtime Sync] Received sync signal from remote device!');
            pullChangesFromDrive().catch((err) => {
              console.error('[Realtime Sync] Pull failed:', err);
            });
          }
        } catch (err) {
          console.error('[Realtime Sync] Error parsing WebSocket message:', err);
        }
      };

      realtimeWs.onclose = () => {
        console.log('[Realtime Sync] Connection closed.');
        if (!isRealtimeClosed && realtimeActiveEmail === email) {
          console.log('[Realtime Sync] Reconnecting in 5 seconds...');
          realtimeReconnectTimer = setTimeout(connect, 5000);
        }
      };

      realtimeWs.onerror = (err) => {
        console.error('[Realtime Sync] WebSocket error:', err);
      };
    };

    connect();
  } catch (err) {
    console.error('[Realtime Sync] Failed to initialize:', err);
  }
};

export const closeRealtimeSync = (): void => {
  isRealtimeClosed = true;
  realtimeActiveEmail = null;
  if (realtimeReconnectTimer) {
    clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = null;
  }
  if (realtimeWs) {
    realtimeWs.close();
    realtimeWs = null;
  }
  console.log('[Realtime Sync] Closed connection.');
};

export const notifyRemoteDevicesOfChange = async (): Promise<void> => {
  try {
    const userInfo = await getGoogleUserInfo();
    if (!userInfo || !userInfo.email) return;

    const cleaned = userInfo.email.trim().toLowerCase();
    let hexEmail = '';
    for (let i = 0; i < cleaned.length; i++) {
      hexEmail += cleaned.charCodeAt(i).toString(16);
    }
    const topic = `boothub-sync-${hexEmail}`;

    console.log('[Realtime Sync] Notifying remote devices...');
    await axios.post(`https://ntfy.sh/${topic}`, 'sync', {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err) {
    console.warn('[Realtime Sync] Failed to send remote notification:', err);
  }
};
import { ensureFileUri } from './helpers';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

const CATEGORY_FOLDERS: Record<string, string> = {
  photo: 'Photos',
  file: 'Files',
  link: 'Links',
  text: 'Texts',
  folder: 'Folders',
};

const resolveUserFolderDriveId = async (
  accessToken: string,
  localFolderId: string,
  categoryFolderId: string,
  localItems: DumpItem[]
): Promise<string> => {
  const localFolder = localItems.find((item) => item.id === localFolderId && item.type === 'folder');
  if (!localFolder) {
    return categoryFolderId;
  }

  let parentDriveId = categoryFolderId;
  if (localFolder.folderId) {
    parentDriveId = await resolveUserFolderDriveId(
      accessToken,
      localFolder.folderId,
      categoryFolderId,
      localItems
    );
  }

  let folderName = 'New Folder';
  try {
    folderName = JSON.parse(localFolder.value).name || 'New Folder';
  } catch {}

  return await getOrCreateSubFolder(accessToken, parentDriveId, folderName);
};

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

export const clearSyncError = () => {
  updateSyncStatus({ error: null });
};

export const updateSyncStatus = (updates: Partial<SyncStatus>) => {
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

export interface EnqueueTaskInput {
  action: 'UPLOAD' | 'DELETE' | 'UPDATE';
  itemId: string;
  itemType: DumpType;
  extras?: Partial<SyncTask>;
}

// Registry of active in-flight request controllers, keyed by task.itemId
const activeSyncTasks = new Map<string, { abort: () => void }>();

// Promise chain lock to prevent AsyncStorage write-collision race conditions on the queue
let queueLockPromise: Promise<any> = Promise.resolve();

const runLockedQueueOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
  const nextPromise = queueLockPromise.then(async () => {
    return await operation();
  });
  queueLockPromise = nextPromise.catch(() => {});
  return nextPromise;
};

export type ProgressListener = (itemId: string, progress: number) => void;
let progressListeners: ProgressListener[] = [];

export const subscribeToUploadProgress = (listener: ProgressListener) => {
  progressListeners.push(listener);
  return () => {
    progressListeners = progressListeners.filter((l) => l !== listener);
  };
};

const notifyUploadProgress = (itemId: string, progress: number) => {
  progressListeners.forEach((l) => l(itemId, progress));
};

/**
 * Enqueue multiple sync tasks atomically. Avoids concurrency race conditions.
 */
export const enqueueSyncTasks = async (tasks: EnqueueTaskInput[]): Promise<void> => {
  if (tasks.length === 0) return;

  await runLockedQueueOperation(async () => {
    const queue = await getSyncQueue();
    let updatedQueue = [...queue];
    let counter = 0;

    for (const taskInput of tasks) {
      const { action, itemId, itemType, extras } = taskInput;
      const uniqueId = `${Date.now()}_${counter++}_${Math.random().toString(36).substr(2, 5)}`;

      if (action === 'DELETE') {
        // Cancel active in-flight request immediately if there is one
        const activeTask = activeSyncTasks.get(itemId);
        if (activeTask) {
          try {
            activeTask.abort();
            console.log(`[Sync Engine] Aborted in-flight task for item: ${itemId}`);
          } catch (err) {
            console.warn(`[Sync Engine] Failed to abort in-flight task for item ${itemId}:`, err);
          }
          activeSyncTasks.delete(itemId);
        }

        updatedQueue = updatedQueue.filter((t) => t.itemId !== itemId);
        // We always enqueue the DELETE task to let the 2nd checker clean up Google Drive!
        const newTask: SyncTask = {
          id: uniqueId,
          action,
          itemId,
          itemType,
          driveMetaFileId: extras?.driveMetaFileId,
          driveFileId: extras?.driveFileId,
        };
        updatedQueue.push(newTask);

      } else if (action === 'UPDATE') {
        const hasPendingUpload = updatedQueue.some((t) => t.itemId === itemId && t.action === 'UPLOAD');
        if (hasPendingUpload) {
          continue;
        }
        updatedQueue = updatedQueue.filter((t) => !(t.itemId === itemId && t.action === 'UPDATE'));
        const newTask: SyncTask = {
          id: uniqueId,
          action,
          itemId,
          itemType,
        };
        updatedQueue.push(newTask);

      } else {
        // UPLOAD
        const newTask: SyncTask = {
          id: uniqueId,
          action,
          itemId,
          itemType,
          fileUri: extras?.fileUri,
        };
        updatedQueue.push(newTask);
      }
    }

    await saveSyncQueue(updatedQueue);
  });
};

/**
 * Enqueue a single sync task.
 */
export const enqueueSyncTask = async (
  action: 'UPLOAD' | 'DELETE' | 'UPDATE',
  itemId: string,
  itemType: DumpType,
  extras?: Partial<SyncTask>
): Promise<void> => {
  await enqueueSyncTasks([{ action, itemId, itemType, extras }]);
};

/**
 * Scans all local items and enqueues any that have not been uploaded to Google Drive yet.
 * This is used for migrating pre-existing offline items to Google Drive once a connection is established.
 */
export const enqueueUnsyncedLocalItems = async (): Promise<void> => {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return; // User not signed in, do nothing

  const { getItems, saveItems } = require('./storage') as typeof import('./storage');

  await runLockedQueueOperation(async () => {
    const items = await getItems();
    const queue = await getSyncQueue();

    // Find local items that don't have a Google Drive metadata file ID associated
    // and aren't already queued for UPLOAD
    const unsyncedItems = items.filter((item) => {
      if (item.driveMetaFileId) return false;
      const isAlreadyQueued = queue.some((t) => t.itemId === item.id && t.action === 'UPLOAD');
      return !isAlreadyQueued;
    });

    if (unsyncedItems.length === 0) return;

    // Mark all unsynced items as pending
    const updatedItems = items.map((item) => {
      const isUnsynced = unsyncedItems.some((u) => u.id === item.id);
      if (isUnsynced) {
        return { ...item, syncState: 'pending' as const };
      }
      return item;
    });
    await saveItems(updatedItems);

    // Enqueue UPLOAD tasks for all unsynced items
    const tasksToEnqueue = unsyncedItems.map((item) => ({
      action: 'UPLOAD' as const,
      itemId: item.id,
      itemType: item.type,
      extras: { fileUri: item.type === 'photo' || item.type === 'file' ? item.value : undefined },
    }));

    // Atomically append UPLOAD tasks directly to the queue to avoid lock deadlocks
    let updatedQueue = [...queue];
    let counter = 0;
    for (const taskInput of tasksToEnqueue) {
      const uniqueId = `${Date.now()}_${counter++}_${Math.random().toString(36).substr(2, 5)}`;
      updatedQueue.push({
        id: uniqueId,
        action: taskInput.action,
        itemId: taskInput.itemId,
        itemType: taskInput.itemType,
        fileUri: taskInput.extras?.fileUri,
      });
    }
    await saveSyncQueue(updatedQueue);
  });
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

    let processedAnyTasks = false;
    const syncFolderId = await getOrCreateSyncFolder(accessToken);

    while (true) {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        break;
      }

      for (const task of [...queue]) {
        processedAnyTasks = true;
        let activeAbort = () => {};
      activeSyncTasks.set(task.itemId, { abort: () => activeAbort() });

      try {
        const localItems = await getItems();
        const localItem = localItems.find((item) => item.id === task.itemId);

        // If item was deleted locally in the meantime, and this is not a delete task, skip
        if (!localItem && task.action !== 'DELETE') {
          await dequeueTask(task.id);
          continue;
        }

        // Resolve parent folder ID inside Google Drive based on category and local folder structure
        let parentFolderId = syncFolderId;
        if (localItem) {
          let categoryName = CATEGORY_FOLDERS[localItem.type] || 'Others';
          if (localItem.type === 'folder') {
            try {
              const folderObj = JSON.parse(localItem.value);
              if (folderObj && folderObj.tab) {
                categoryName = CATEGORY_FOLDERS[folderObj.tab] || categoryName;
              }
            } catch {}
          }
          const categoryFolderId = await getOrCreateSubFolder(accessToken, syncFolderId, categoryName);
          parentFolderId = categoryFolderId;

          if (localItem.folderId) {
            parentFolderId = await resolveUserFolderDriveId(
              accessToken,
              localItem.folderId,
              categoryFolderId,
              localItems
            );
          }
        }

        if (task.action === 'UPLOAD') {
          if (!localItem) continue;

          // If the item was already uploaded (e.g. by a duplicate task or concurrent run), skip it
          if (localItem.driveMetaFileId) {
            console.log(`[Sync Engine] Item ${localItem.id} already has driveMetaFileId (${localItem.driveMetaFileId}). Skipping duplicate UPLOAD task.`);
            await dequeueTask(task.id);
            continue;
          }

          let driveFileId = localItem.driveFileId;
          
          try {
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

              const binaryAbortController = new AbortController();
              activeAbort = () => {
                binaryAbortController.abort();
              };

              driveFileId = await uploadBinaryToDrive(
                accessToken,
                parentFolderId,
                fileName,
                localFileUri,
                mimeType,
                undefined,
                (uploadTask) => {
                  activeAbort = () => {
                    binaryAbortController.abort();
                    uploadTask.cancelAsync().catch(() => {});
                  };
                },
                binaryAbortController.signal,
                (progress) => {
                  notifyUploadProgress(task.itemId, progress);
                }
              );
            } else if (localItem.type === 'folder' && !driveFileId) {
              // Create a real directory on Google Drive for this folder item
              let folderName = 'New Folder';
              try {
                folderName = JSON.parse(localItem.value).name || 'New Folder';
              } catch {}
              const folderAbortController = new AbortController();
              activeAbort = () => folderAbortController.abort();
              driveFileId = await getOrCreateSubFolder(accessToken, parentFolderId, folderName);
            }

            // 2. Upload metadata json
            const metadataFileName = `item_${localItem.id}.json`;
            
            // Update item data structure with sync info
            const updatedItem = {
              ...localItem,
              syncState: 'synced' as const,
              driveFileId,
            };

            const metadataAbortController = new AbortController();
            activeAbort = () => metadataAbortController.abort();

            const driveMetaFileId = await uploadJsonToDrive(
              accessToken,
              parentFolderId,
              metadataFileName,
              JSON.stringify(updatedItem),
              undefined,
              metadataAbortController.signal
            );

            // Fetch the latest items from AsyncStorage to avoid restoring concurrently deleted items
            const latestItems = await getItems();
            const itemStillExists = latestItems.some((item) => item.id === localItem.id);

            if (!itemStillExists) {
              console.log(`[Sync Engine] Clean up: item ${localItem.id} was deleted during upload. Deleting Drive files.`);
              if (driveFileId) {
                await deleteFileFromDrive(accessToken, driveFileId).catch(() => {});
              }
              if (driveMetaFileId) {
                await deleteFileFromDrive(accessToken, driveMetaFileId).catch(() => {});
              }
            } else {
              const updatedLocalList = latestItems.map((item) => {
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
            }
          } catch (uploadErr: any) {
            // Clean up binary file on Drive if upload task is aborted in-flight
            const isCancel = axios.isCancel(uploadErr) || uploadErr.message?.includes('cancel') || uploadErr.message?.includes('abort');
            if (isCancel && driveFileId && !localItem.driveFileId) {
              console.log(`[Sync Engine] UPLOAD task was cancelled after binary upload. Cleaning up Drive file: ${driveFileId}`);
              await deleteFileFromDrive(accessToken, driveFileId).catch((cleanupErr) => {
                console.warn('Failed to clean up Drive file after cancellation:', cleanupErr);
              });
            }
            throw uploadErr;
          }

        } else if (task.action === 'UPDATE') {
          if (!localItem) continue;

          // If it was never uploaded to drive, treat as upload
          if (!localItem.driveMetaFileId) {
            task.action = 'UPLOAD';
            await processSyncQueue(); // restart queue
            return;
          }

          // Ensure directory details and parents are aligned if folder/file details changed
          if (localItem.type === 'folder' && localItem.driveFileId) {
            let folderName = 'New Folder';
            try {
              folderName = JSON.parse(localItem.value).name || 'New Folder';
            } catch {}

            // Update folder name on Drive
            const folderUpdateAbortController = new AbortController();
            activeAbort = () => folderUpdateAbortController.abort();

            await axios.patch(
              `https://www.googleapis.com/drive/v3/files/${localItem.driveFileId}`,
              { name: folderName },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                signal: folderUpdateAbortController.signal,
              }
            );

            await ensureFileParent(accessToken, localItem.driveFileId, parentFolderId);
          }

          if ((localItem.type === 'photo' || localItem.type === 'file') && localItem.driveFileId) {
            await ensureFileParent(accessToken, localItem.driveFileId, parentFolderId);
          }

          // Ensure metadata file parent is updated
          await ensureFileParent(accessToken, localItem.driveMetaFileId, parentFolderId);

          const metadataFileName = `item_${localItem.id}.json`;
          const updatedItem = {
            ...localItem,
            syncState: 'synced' as const,
          };

          const metadataUpdateAbortController = new AbortController();
          activeAbort = () => metadataUpdateAbortController.abort();

          await uploadJsonToDrive(
            accessToken,
            parentFolderId,
            metadataFileName,
            JSON.stringify(updatedItem),
            localItem.driveMetaFileId,
            metadataUpdateAbortController.signal
          );

          // Update local state to synced using the latest list from AsyncStorage to prevent overwriting deletions
          const latestItems = await getItems();
          const updatedLocalList = latestItems.map((item) => {
            if (item.id === localItem.id) {
              return { ...item, syncState: 'synced' as const };
            }
            return item;
          });
          await saveItems(updatedLocalList);
        } else if (task.action === 'DELETE') {
          // Delete metadata file
          if (task.driveMetaFileId) {
            await deleteFileFromDrive(accessToken, task.driveMetaFileId).catch(() => {});
          }
          // Delete binary asset if it exists
          if (task.driveFileId) {
            await deleteFileFromDrive(accessToken, task.driveFileId).catch(() => {});
          }
          // 2nd Checker: Search and clean up any remaining files on Drive matching the item ID
          await deleteItemFilesFromDrive(accessToken, task.itemId);
        }

        // Successfully processed task, pop from queue
        await dequeueTask(task.id);
      } catch (err: any) {
        const isCancel = axios.isCancel(err) || err.message?.includes('cancel') || err.message?.includes('abort');
        if (isCancel) {
          console.log(`[Sync Engine] Task ${task.id} for item ${task.itemId} was cancelled.`);
          await dequeueTask(task.id);
          continue;
        }

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
      } finally {
        activeSyncTasks.delete(task.itemId);
      }
    }
  }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const lastSyncedLabel = `${dateStr} @ ${timeStr}`;

    updateSyncStatus({ isSyncing: false, error: null, lastSynced: lastSyncedLabel });

    if (processedAnyTasks) {
      notifyRemoteDevicesOfChange().catch(() => {});
    }
  } catch (err: any) {
    console.error('Failed to run sync queue:', err);
    const details = err.response?.data
      ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
      : (err.message || String(err));
    updateSyncStatus({ isSyncing: false, error: 'Sync failed: ' + details });
  } finally {
    isProcessingQueue = false;
  }
};

const dequeueTask = async (taskId: string) => {
  await runLockedQueueOperation(async () => {
    const queue = await getSyncQueue();
    const filtered = queue.filter((t) => t.id !== taskId);
    await saveSyncQueue(filtered);
  });
};

export const deleteItemFilesFromDrive = async (accessToken: string, itemId: string): Promise<void> => {
  try {
    const query = `name contains '${itemId}' and trashed = false`;
    const searchRes = await axios.get(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const files = searchRes.data.files || [];
    
    let driveFileIdToClean: string | undefined = undefined;

    // Check if there's a metadata file and try to read it to find the linked binary file/folder ID
    for (const file of files) {
      if (file.name.startsWith('item_') && file.name.endsWith('.json')) {
        try {
          const content = await downloadJsonContent(accessToken, file.id);
          if (content && content.driveFileId) {
            driveFileIdToClean = content.driveFileId;
          }
        } catch (downloadErr) {
          console.warn(`Failed to read metadata file ${file.id} for cleanup:`, downloadErr);
        }
      }
    }

    // Delete the linked binary asset or folder directory if one was found
    if (driveFileIdToClean) {
      console.log(`[Sync Engine] 2nd Checker: Found linked file/folder ${driveFileIdToClean} in metadata. Deleting.`);
      await axios.delete(`https://www.googleapis.com/drive/v3/files/${driveFileIdToClean}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch((err) => console.warn(`Failed to delete linked file/folder ${driveFileIdToClean} in 2nd checker:`, err));
    }

    // Delete the matched files (metadata file, or binary asset file matching itemId)
    for (const file of files) {
      console.log(`[Sync Engine] 2nd Checker: Deleting file ${file.name} (${file.id}) from Drive.`);
      await axios.delete(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch((err) => console.warn(`Failed to delete file ${file.id} in 2nd checker:`, err));
    }
  } catch (err) {
    console.error(`Failed to run 2nd checker deletion for item ${itemId}:`, err);
  }
};

const askConflictResolution = (count: number): Promise<'follow_drive' | 'follow_phone'> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Sync Conflict Detected',
      `We found ${count} item${count > 1 ? 's' : ''} that were deleted on Google Drive but still exist on this device. Would you like to restore them to the cloud or remove them from this device?`,
      [
        {
          text: 'Restore to Cloud',
          onPress: () => resolve('follow_phone'),
        },
        {
          text: 'Remove from Device',
          onPress: () => resolve('follow_drive'),
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  });
};

/**
 * Inbound synchronization: downloads new/updated items and folder structures from Google Drive.
 */
export const pullChangesFromDrive = async (): Promise<void> => {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.warn('Cannot pull changes from Drive: User not signed in.');
    return;
  }

  try {
    const syncFolderId = await getOrCreateSyncFolder(accessToken);
    const remoteFiles = await fetchAllMetadataFromDrive(accessToken);

    const { getItems, saveItems } = require('./storage') as typeof import('./storage');
    const localItems = await getItems();
    const lastPullTimestampStr = await AsyncStorage.getItem('@boothub_last_pull_timestamp');
    const lastPullTimestamp = lastPullTimestampStr ? parseInt(lastPullTimestampStr, 10) : 0;
    const currentPullTime = Date.now();

    // Fetch JSON content for all files in parallel
    const remoteItems: DumpItem[] = await Promise.all(
      remoteFiles.map(async (file) => {
        try {
          const localMatch = localItems.find((x) => x.driveMetaFileId === file.id);
          const remoteModTime = file.modifiedTime ? Date.parse(file.modifiedTime) : 0;

          if (localMatch && remoteModTime && remoteModTime <= lastPullTimestamp - 10000) {
            return {
              ...localMatch,
              driveMetaFileId: file.id,
            };
          }

          const data = await downloadJsonContent(accessToken, file.id);
          return {
            ...data,
            driveMetaFileId: file.id,
          };
        } catch (err) {
          console.error(`Failed to download content for file ${file.id}:`, err);
          return null;
        }
      })
    ).then((results) => results.filter((x): x is DumpItem => x !== null));

    await AsyncStorage.setItem('@boothub_last_pull_timestamp', String(currentPullTime));
    const remoteItemIds = new Set(remoteItems.map((x) => x.id));

    // Identify items deleted remotely
    const itemsDeletedRemotely = localItems.filter(
      (item) => item.driveMetaFileId && !remoteItemIds.has(item.id)
    );

    let resolveAction: 'follow_drive' | 'follow_phone' = 'follow_drive';
    if (itemsDeletedRemotely.length > 0) {
      resolveAction = await askConflictResolution(itemsDeletedRemotely.length);
    }

    const updatedLocalItems: DumpItem[] = [];

    // 1. Identify and delete items locally if they were deleted on Google Drive (or mark for re-upload)
    for (const localItem of localItems) {
      const isDeletedRemotely = itemsDeletedRemotely.some((x) => x.id === localItem.id);

      if (isDeletedRemotely) {
        if (resolveAction === 'follow_drive') {
          // Delete locally
          if (localItem.type === 'file') {
            try {
              const fileObj = JSON.parse(localItem.value);
              if (fileObj.uri && fileObj.uri.startsWith('file://')) {
                await FileSystem.deleteAsync(fileObj.uri, { idempotent: true });
              }
            } catch {}
          } else if (localItem.type === 'photo') {
            try {
              if (localItem.value.startsWith('file://')) {
                await FileSystem.deleteAsync(localItem.value, { idempotent: true });
              }
            } catch {}
          }
          continue; // Skip appending, deleting it locally
        } else {
          // Restore to Cloud (Follow Phone) -> mark as pending and reset drive IDs
          updatedLocalItems.push({
            ...localItem,
            syncState: 'pending' as const,
            driveMetaFileId: undefined,
            driveFileId: undefined,
          });
          continue;
        }
      }
      updatedLocalItems.push(localItem);
    }

    // 2. Add new items or merge/update existing items from Drive
    for (const remoteItem of remoteItems) {
      const localIndex = updatedLocalItems.findIndex((x) => x.id === remoteItem.id);

      if (localIndex >= 0) {
        const localItem = updatedLocalItems[localIndex];
        // If local item has pending changes, let the user's edits take priority
        if (localItem.syncState === 'pending') {
          continue;
        }

        updatedLocalItems[localIndex] = {
          ...localItem,
          ...remoteItem,
          syncState: 'synced' as const,
        };
      } else {
        // New remote item
        let localValue = remoteItem.value;

        if ((remoteItem.type === 'photo' || remoteItem.type === 'file') && remoteItem.driveFileId) {
          try {
            let filename = '';
            if (remoteItem.type === 'photo') {
              filename = `photo_${remoteItem.id}.jpg`;
            } else {
              const fileObj = JSON.parse(remoteItem.value);
              filename = fileObj.name || `file_${remoteItem.id}`;
            }

            const localUri = FileSystem.documentDirectory + filename;

            // Ensure documentDirectory exists before writing to it (necessary on clean iOS installs)
            if (FileSystem.documentDirectory) {
              const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory, { intermediates: true });
              }
            }

            // Remove existing file at target URI to avoid iOS lock or overwrite errors
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(localUri, { idempotent: true });
            }

            await FileSystem.downloadAsync(
              `https://www.googleapis.com/drive/v3/files/${remoteItem.driveFileId}?alt=media`,
              localUri,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
              }
            );

            if (remoteItem.type === 'photo') {
              localValue = localUri;
            } else {
              const fileObj = JSON.parse(remoteItem.value);
              fileObj.uri = localUri;
              localValue = JSON.stringify(fileObj);
            }
          } catch (downloadErr) {
            console.error(`Failed to download binary asset for item ${remoteItem.id}:`, downloadErr);
          }
        }

        updatedLocalItems.push({
          ...remoteItem,
          value: localValue,
          syncState: 'synced' as const,
        });
      }
    }

    await saveItems(updatedLocalItems);

    // If they chose to restore the items, queue the upload tasks
    if (resolveAction === 'follow_phone' && itemsDeletedRemotely.length > 0) {
      const tasksToEnqueue = itemsDeletedRemotely.map((item) => ({
        action: 'UPLOAD' as const,
        itemId: item.id,
        itemType: item.type,
        extras: { fileUri: item.type === 'photo' || item.type === 'file' ? item.value : undefined },
      }));

      await enqueueSyncTasks(tasksToEnqueue);
      processSyncQueue().catch((e) => console.error('Failed to run sync after resolving remote deletion conflict:', e));
    }
  } catch (err) {
    console.error('Failed to pull changes from Google Drive:', err);
    throw err;
  }
};

