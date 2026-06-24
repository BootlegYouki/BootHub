import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import type { DumpItem, DumpType } from './storage';
import { getGoogleUserInfo } from './google-auth';
import { supabase } from './supabase';
import { ensureFileUri, formatSyncTimestamp } from './helpers';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { RealtimeChannel } from '@supabase/supabase-js';

let realtimeChannel: RealtimeChannel | null = null;
let realtimeActiveEmail: string | null = null;

export const initializeRealtimeSync = async (): Promise<void> => {
  try {
    const userInfo = await getGoogleUserInfo();
    if (!userInfo || !userInfo.email) {
      closeRealtimeSync();
      return;
    }

    const email = userInfo.email.trim().toLowerCase();
    if (realtimeChannel && realtimeActiveEmail === email) {
      return;
    }

    if (realtimeChannel) {
      closeRealtimeSync();
    }

    realtimeActiveEmail = email;
    console.log('[Realtime Sync] Subscribing to Supabase changes for', email);

    realtimeChannel = supabase
      .channel(`public:items:email=eq.${email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `email=eq.${email}`,
        },
        async (payload) => {
          console.log('[Realtime Sync] Received realtime change:', payload.eventType);
          pullChangesFromDrive().catch((err) => {
            console.error('[Realtime Sync] Pull failed:', err);
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime Sync] Subscription status:', status);
      });
  } catch (err) {
    console.error('[Realtime Sync] Failed to initialize:', err);
  }
};

export const closeRealtimeSync = (): void => {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
  realtimeActiveEmail = null;
  console.log('[Realtime Sync] Closed connection.');
};

export const notifyRemoteDevicesOfChange = async (): Promise<void> => {
  // No-op since Supabase Postgres changes automatically notify all subscribers in real-time
};

export interface SyncTask {
  id: string; // Unique task ID (timestamp-based)
  action: 'UPLOAD' | 'DELETE' | 'UPDATE';
  itemId: string; // The local item ID
  itemType: DumpType;
  fileUri?: string; // Local URI (only for photos/files)
  driveMetaFileId?: string; // Kept for compatibility / interface matching
  driveFileId?: string; // Kept for compatibility / interface matching
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
        const activeTask = activeSyncTasks.get(itemId);
        if (activeTask) {
          try {
            activeTask.abort();
          } catch {}
          activeSyncTasks.delete(itemId);
        }

        updatedQueue = updatedQueue.filter((t) => t.itemId !== itemId);
        const newTask: SyncTask = {
          id: uniqueId,
          action,
          itemId,
          itemType,
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

export const enqueueSyncTask = async (
  action: 'UPLOAD' | 'DELETE' | 'UPDATE',
  itemId: string,
  itemType: DumpType,
  extras?: Partial<SyncTask>
): Promise<void> => {
  await enqueueSyncTasks([{ action, itemId, itemType, extras }]);
};

export const enqueueUnsyncedLocalItems = async (): Promise<void> => {
  const userInfo = await getGoogleUserInfo();
  if (!userInfo || !userInfo.email) return;

  const { getItems, saveItems } = require('./storage') as typeof import('./storage');

  await runLockedQueueOperation(async () => {
    const items = await getItems();
    const queue = await getSyncQueue();

    const unsyncedItems = items.filter((item) => {
      const isLegacyDriveItem = item.syncState === 'synced' && (!item.driveFileId || !item.driveFileId.includes('/'));
      const needsSync = item.syncState !== 'synced' || isLegacyDriveItem;
      const isAlreadyQueued = queue.some((t) => t.itemId === item.id && (t.action === 'UPLOAD' || t.action === 'UPDATE'));
      return needsSync && !isAlreadyQueued;
    });

    if (unsyncedItems.length === 0) return;

    const updatedItems = items.map((item) => {
      const isUnsynced = unsyncedItems.some((u) => u.id === item.id);
      if (isUnsynced) {
        return { ...item, syncState: 'pending' as const };
      }
      return item;
    });
    await saveItems(updatedItems);

    const tasksToEnqueue = unsyncedItems.map((item) => ({
      action: 'UPLOAD' as const,
      itemId: item.id,
      itemType: item.type,
      extras: { fileUri: item.type === 'photo' || item.type === 'file' ? item.value : undefined },
    }));

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

export const processSyncQueue = async (): Promise<void> => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  updateSyncStatus({ isSyncing: true, error: null });

  try {
    const { getItems, saveItems } = require('./storage') as typeof import('./storage');
    const userInfo = await getGoogleUserInfo();
    if (!userInfo || !userInfo.email) {
      updateSyncStatus({ isSyncing: false, error: 'Sign-in required to synchronize.' });
      isProcessingQueue = false;
      return;
    }

    const email = userInfo.email.trim().toLowerCase();

    while (true) {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        break;
      }

      for (const task of [...queue]) {
        let isAborted = false;
        activeSyncTasks.set(task.itemId, { abort: () => { isAborted = true; } });

        try {
          const localItems = await getItems();
          const localItem = localItems.find((item) => item.id === task.itemId);

          if (!localItem && task.action !== 'DELETE') {
            await dequeueTask(task.id);
            continue;
          }

          if (task.action === 'UPLOAD' || task.action === 'UPDATE') {
            if (!localItem) continue;

            let storagePath = localItem.driveFileId || ''; // reuse driveFileId as storagePath field mapping

            if ((localItem.type === 'photo' || localItem.type === 'file') && !storagePath) {
              let localFileUri = '';
              let mimeType = 'application/octet-stream';

              if (localItem.type === 'photo') {
                localFileUri = await resolveLocalFile(localItem.value);
                mimeType = localFileUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
              } else {
                const fileObj = JSON.parse(localItem.value);
                localFileUri = ensureFileUri(fileObj.uri);
                mimeType = fileObj.mimeType || 'application/octet-stream';
              }

              if (isAborted) throw new Error('Aborted');

              // Read local file and upload to Supabase Storage
              const response = await fetch(localFileUri);
              const blob = await response.blob();

              const path = `${email}/${localItem.id}`;
              const { error: uploadErr } = await supabase.storage
                .from('files')
                .upload(path, blob, {
                  contentType: mimeType,
                  upsert: true,
                });

              if (uploadErr) {
                throw new Error(`Storage upload failed: ${uploadErr.message}`);
              }

              storagePath = path;
            }

            if (isAborted) throw new Error('Aborted');

            // Upsert in Supabase public.items table
            const { error: upsertErr } = await supabase
              .from('items')
              .upsert({
                id: localItem.id,
                email,
                type: localItem.type,
                label: localItem.label,
                value: localItem.value,
                folder_id: localItem.folderId || null,
                storage_path: storagePath || null,
                updated_at: new Date().toISOString(),
              });

            if (upsertErr) {
              throw new Error(`Database upsert failed: ${upsertErr.message}`);
            }

            // Mark as synced locally
            const latestItems = await getItems();
            const updatedLocalList = latestItems.map((item) => {
              if (item.id === localItem.id) {
                return {
                  ...item,
                  syncState: 'synced' as const,
                  driveFileId: storagePath, // Map driveFileId to storagePath
                };
              }
              return item;
            });
            await saveItems(updatedLocalList);

          } else if (task.action === 'DELETE') {
            // Delete from Supabase Database
            const { error: deleteDbErr } = await supabase
              .from('items')
              .delete()
              .eq('id', task.itemId)
              .eq('email', email);

            if (deleteDbErr) {
              throw new Error(`Database delete failed: ${deleteDbErr.message}`);
            }

            // Delete asset from Storage
            const path = `${email}/${task.itemId}`;
            await supabase.storage.from('files').remove([path]);
          }

          await dequeueTask(task.id);
        } catch (err: any) {
          if (err.message === 'Aborted') {
            console.log(`[Sync Engine] Task ${task.id} was aborted.`);
            await dequeueTask(task.id);
            continue;
          }
          console.error('[Sync Engine] Error syncing task:', err);
          updateSyncStatus({ isSyncing: false, error: 'Sync error: ' + err.message });
          isProcessingQueue = false;
          return;
        } finally {
          activeSyncTasks.delete(task.itemId);
        }
      }
    }

    updateSyncStatus({ isSyncing: false, error: null, lastSynced: formatSyncTimestamp() });
  } catch (err: any) {
    console.error('[Sync Engine] Queue processor error:', err);
    updateSyncStatus({ isSyncing: false, error: 'Sync processor failed: ' + err.message });
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

export const pullChangesFromDrive = async (): Promise<void> => {
  const userInfo = await getGoogleUserInfo();
  if (!userInfo || !userInfo.email) {
    console.warn('Cannot pull changes: User not signed in.');
    return;
  }

  const email = userInfo.email.trim().toLowerCase();

  try {
    // Fetch all items for this user from Supabase
    const { data: remoteItems, error } = await supabase
      .from('items')
      .select('*')
      .eq('email', email);

    if (error) {
      throw new Error(error.message);
    }

    const { getItems, saveItems } = require('./storage') as typeof import('./storage');
    const localItems = await getItems();

    const remoteItemIds = new Set((remoteItems || []).map((x) => x.id));

    // Identify remote deletions (only for items synced to Supabase)
    const itemsDeletedRemotely = localItems.filter((item) => {
      const isSupabaseSynced = item.syncState === 'synced' && item.driveFileId && item.driveFileId.includes('/');
      return isSupabaseSynced && !remoteItemIds.has(item.id);
    });

    const updatedLocalItems: DumpItem[] = [];

    // Apply remote deletions
    for (const localItem of localItems) {
      const isDeletedRemotely = itemsDeletedRemotely.some((x) => x.id === localItem.id);
      if (isDeletedRemotely) {
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
        continue;
      }
      updatedLocalItems.push(localItem);
    }

    // Add or merge remote items
    for (const remote of remoteItems || []) {
      const localIndex = updatedLocalItems.findIndex((x) => x.id === remote.id);
      let localValue = remote.value;

      if ((remote.type === 'photo' || remote.type === 'file') && remote.storage_path) {
        try {
          let filename = '';
          if (remote.type === 'photo') {
            filename = `photo_${remote.id}.jpg`;
          } else {
            const fileObj = JSON.parse(remote.value);
            filename = fileObj.name || `file_${remote.id}`;
          }

          const localUri = FileSystem.documentDirectory + filename;
          const fileInfo = await FileSystem.getInfoAsync(localUri);

          // Download if local file does not exist
          if (!fileInfo.exists) {
            if (FileSystem.documentDirectory) {
              const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory, { intermediates: true });
              }
            }

            console.log(`[Sync Engine] Downloading missing file binary for item: ${remote.id}`);
            const { data: publicUrlData } = supabase.storage
              .from('files')
              .getPublicUrl(remote.storage_path);

            await FileSystem.downloadAsync(publicUrlData.publicUrl, localUri);
          }

          if (remote.type === 'photo') {
            localValue = localUri;
          } else {
            const fileObj = JSON.parse(remote.value);
            fileObj.uri = localUri;
            localValue = JSON.stringify(fileObj);
          }
        } catch (downloadErr) {
          console.error(`Failed to download binary asset for item ${remote.id}:`, downloadErr);
        }
      }

      const mappedItem: DumpItem = {
        id: remote.id,
        type: remote.type as DumpType,
        label: remote.label,
        value: localValue,
        folderId: remote.folder_id || undefined,
        syncState: 'synced',
        driveFileId: remote.storage_path || undefined,
      };

      if (localIndex >= 0) {
        const localItem = updatedLocalItems[localIndex];
        if (localItem.syncState === 'pending') {
          continue; // Keep local changes
        }
        updatedLocalItems[localIndex] = {
          ...localItem,
          ...mappedItem,
        };
      } else {
        updatedLocalItems.push(mappedItem);
      }
    }

    await saveItems(updatedLocalItems);
  } catch (err) {
    console.error('[Sync Engine] Pull changes failed:', err);
    throw err;
  }
};
