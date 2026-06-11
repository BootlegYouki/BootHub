import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { enqueueSyncTask, enqueueSyncTasks, processSyncQueue } from './sync-engine';

export type DumpType = 'link' | 'text' | 'photo' | 'file' | 'folder';

export interface DumpItem {
  id: string;
  type: DumpType;
  label: string; // Timestamp label, e.g. "06-04-2026 @ 10m ago"
  value: string; // The URL, raw text, or local/remote image URI, or JSON for files/folders
  folderId?: string;
  syncState?: 'synced' | 'pending' | 'error';
  driveFileId?: string;
  driveMetaFileId?: string;
}

const STORAGE_KEY = '@boothub_dump_items';

const defaultSeedItems: DumpItem[] = [];

let storageListeners: (() => void)[] = [];

export const subscribeToStorage = (listener: () => void) => {
  storageListeners.push(listener);
  return () => {
    storageListeners = storageListeners.filter((l) => l !== listener);
  };
};

const notifyStorageListeners = () => {
  storageListeners.forEach((l) => l());
};

export const getItems = async (): Promise<DumpItem[]> => {
  try {
    const rawData = await AsyncStorage.getItem(STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData) as DumpItem[];
      return parsed;
    }
    // Seed default items if storage is empty (which is empty array now)
    await saveItems(defaultSeedItems);
    return defaultSeedItems;
  } catch (e) {
    console.error('Failed to load storage items:', e);
    return defaultSeedItems;
  }
};

export const saveItems = async (items: DumpItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notifyStorageListeners();
  } catch (e) {
    console.error('Failed to save items to storage:', e);
  }
};

export const addItem = async (type: DumpType, value: string, folderId?: string): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    
    // Create simple timestamp label
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const label = `${dateStr} @ ${timeStr}`;
 
    let itemLabel = label;
    if (type === 'folder') {
      try {
        itemLabel = JSON.parse(value).name || label;
      } catch {}
    }

    const newItem: DumpItem = {
      id: Date.now().toString(),
      type,
      label: itemLabel,
      value,
      ...(folderId ? { folderId } : {}),
      syncState: 'pending',
    };

    const updated = [newItem, ...currentItems];
    await saveItems(updated);

    // Enqueue UPLOAD sync task
    enqueueSyncTask('UPLOAD', newItem.id, type, { fileUri: type === 'photo' || type === 'file' ? value : undefined })
      .then(() => processSyncQueue())
      .catch((e) => console.error('Failed to schedule item upload:', e));

    return updated;
  } catch (e) {
    console.error('Failed to add item:', e);
    return [];
  }
};

export const deleteItem = async (id: string): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    const targetItem = currentItems.find((item) => item.id === id);
    if (!targetItem) return currentItems;

    let updated: DumpItem[] = [];

    // Local helper to delete file from disk
    const deleteFileFromDisk = async (value: string) => {
      try {
        const fileObj = JSON.parse(value);
        if (fileObj.uri && fileObj.uri.startsWith('file://')) {
          await FileSystem.deleteAsync(fileObj.uri, { idempotent: true });
        }
      } catch (err) {
        // Fallback for raw URIs
        try {
          if (value.startsWith('file://')) {
            await FileSystem.deleteAsync(value, { idempotent: true });
          }
        } catch {}
      }
    };

    if (targetItem.type === 'folder') {
      // Recursive child ID retrieval
      const getRecursiveChildren = (items: DumpItem[], folderId: string): DumpItem[] => {
        let children: DumpItem[] = [];
        const directChildren = items.filter((item) => item.folderId === folderId);
        for (const child of directChildren) {
          children.push(child);
          if (child.type === 'folder') {
            children = [...children, ...getRecursiveChildren(items, child.id)];
          }
        }
        return children;
      };

      const childrenToDelete = getRecursiveChildren(currentItems, id);
      const idsToDelete = new Set([id, ...childrenToDelete.map((x) => x.id)]);

      // Delete all files among the deleted children from disk
      for (const child of childrenToDelete) {
        if (child.type === 'file') {
          await deleteFileFromDisk(child.value);
        }
      }

      updated = currentItems.filter((item) => !idsToDelete.has(item.id));
      await saveItems(updated);

      // Enqueue deletion tasks atomically for Google Drive sync
      await enqueueSyncTasks(
        [targetItem, ...childrenToDelete].map((item) => ({
          action: 'DELETE',
          itemId: item.id,
          itemType: item.type,
          extras: {
            driveMetaFileId: item.driveMetaFileId,
            driveFileId: item.driveFileId,
          },
        }))
      );
      processSyncQueue().catch((e) => console.error('Failed to run sync after folder deletion:', e));
    } else {
      // Normal item deletion
      if (targetItem.type === 'file') {
        await deleteFileFromDisk(targetItem.value);
      }
      updated = currentItems.filter((item) => item.id !== id);
      await saveItems(updated);

      // Enqueue delete task for file/link/text
      await enqueueSyncTask('DELETE', id, targetItem.type, {
        driveMetaFileId: targetItem.driveMetaFileId,
        driveFileId: targetItem.driveFileId,
      });

      processSyncQueue().catch((e) => console.error('Failed to run sync after item deletion:', e));
    }

    return updated;
  } catch (e) {
    console.error('Failed to delete item:', e);
    return [];
  }
};

export const updateItem = async (id: string, value: string): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    const targetItem = currentItems.find((item) => item.id === id);
    if (!targetItem) return currentItems;

    const updated = currentItems.map((item) => {
      if (item.id === id) {
        let finalValue = value;
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
        }
        let finalLabel = item.label;
        if (item.type === 'folder') {
          finalLabel = value;
        }
        return {
          ...item,
          label: finalLabel,
          value: finalValue,
          syncState: 'pending' as const,
        };
      }
      return item;
    });
    await saveItems(updated);

    // Enqueue update task
    enqueueSyncTask('UPDATE', id, targetItem.type)
      .then(() => processSyncQueue())
      .catch((e) => console.error('Failed to schedule item update:', e));

    return updated;
  } catch (e) {
    console.error('Failed to update item:', e);
    return [];
  }
};

export const addMultiplePhotos = async (uris: string[], folderId?: string): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const label = `${dateStr} @ ${timeStr}`;

    const newItems: DumpItem[] = uris.map((uri, index) => ({
      id: `${Date.now()}_${index}`,
      type: 'photo',
      label,
      value: uri,
      ...(folderId ? { folderId } : {}),
      syncState: 'pending',
    }));

    const updated = [...newItems, ...currentItems];
    await saveItems(updated);

    // Enqueue upload tasks atomically for each photo
    await enqueueSyncTasks(
      newItems.map((item) => ({
        action: 'UPLOAD',
        itemId: item.id,
        itemType: 'photo',
        extras: { fileUri: item.value },
      }))
    );
    processSyncQueue().catch((e) => console.error('Failed to schedule batch photo uploads:', e));

    return updated;
  } catch (e) {
    console.error('Failed to add multiple photos:', e);
    return [];
  }
};

export const setItemFolder = async (id: string, folderId: string | undefined): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    const targetItem = currentItems.find((item) => item.id === id);
    if (!targetItem) return currentItems;

    const updated = currentItems.map((item) => {
      if (item.id === id) {
        if (folderId === undefined) {
          const { folderId: _, ...rest } = item;
          return { ...rest, syncState: 'pending' as const } as DumpItem;
        }
        return { ...item, folderId, syncState: 'pending' as const };
      }
      return item;
    });
    await saveItems(updated);

    // Enqueue update task
    enqueueSyncTask('UPDATE', id, targetItem.type)
      .then(() => processSyncQueue())
      .catch((e) => console.error('Failed to schedule folder change update:', e));

    return updated;
  } catch (e) {
    console.error('Failed to set item folder:', e);
    return [];
  }
};
