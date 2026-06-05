import AsyncStorage from '@react-native-async-storage/async-storage';

export type DumpType = 'link' | 'text' | 'photo' | 'file' | 'folder';

export interface DumpItem {
  id: string;
  type: DumpType;
  label: string; // Timestamp label, e.g. "06-04-2026 @ 10m ago"
  value: string; // The URL, raw text, or local/remote image URI, or JSON for files/folders
  folderId?: string;
}

const STORAGE_KEY = '@boothub_dump_items';

const defaultSeedItems: DumpItem[] = [];

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

    const newItem: DumpItem = {
      id: Date.now().toString(),
      type,
      label,
      value,
      ...(folderId ? { folderId } : {}),
    };

    const updated = [newItem, ...currentItems];
    await saveItems(updated);
    return updated;
  } catch (e) {
    console.error('Failed to add item:', e);
    return [];
  }
};

export const deleteItem = async (id: string): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    const updated = currentItems
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.folderId === id) {
          const { folderId, ...rest } = item;
          return rest;
        }
        return item;
      });
    await saveItems(updated);
    return updated;
  } catch (e) {
    console.error('Failed to delete item:', e);
    return [];
  }
};

export const updateItem = async (id: string, value: string): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    const updated = currentItems.map((item) => {
      if (item.id === id) {
        if (item.type === 'file') {
          try {
            const fileObj = JSON.parse(item.value);
            fileObj.name = value;
            return { ...item, value: JSON.stringify(fileObj) };
          } catch {
            return { ...item, value };
          }
        }
        if (item.type === 'folder') {
          try {
            const folderObj = JSON.parse(item.value);
            folderObj.name = value;
            return { ...item, value: JSON.stringify(folderObj) };
          } catch {
            return { ...item, value };
          }
        }
        return { ...item, value };
      }
      return item;
    });
    await saveItems(updated);
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
    }));

    const updated = [...newItems, ...currentItems];
    await saveItems(updated);
    return updated;
  } catch (e) {
    console.error('Failed to add multiple photos:', e);
    return [];
  }
};

export const setItemFolder = async (id: string, folderId: string | undefined): Promise<DumpItem[]> => {
  try {
    const currentItems = await getItems();
    const updated = currentItems.map((item) => {
      if (item.id === id) {
        if (folderId === undefined) {
          const { folderId: _, ...rest } = item;
          return rest;
        }
        return { ...item, folderId };
      }
      return item;
    });
    await saveItems(updated);
    return updated;
  } catch (e) {
    console.error('Failed to set item folder:', e);
    return [];
  }
};
