import AsyncStorage from '@react-native-async-storage/async-storage';

export type DumpType = 'link' | 'text' | 'photo' | 'file';

export interface DumpItem {
  id: string;
  type: DumpType;
  label: string; // Timestamp label, e.g. "06-04-2026 @ 10m ago"
  value: string; // The URL, raw text, or local/remote image URI
}

const STORAGE_KEY = '@boothub_dump_items';

const defaultSeedItems: DumpItem[] = [
  {
    id: 'mock-long-text',
    type: 'text',
    label: '06-04-2026 @ Mock Data',
    value: 'This is a mock text item with extremely long lines to test multiline input auto-growing and text wrapping in both the read cards and the bottom bar edit input. ' +
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ' +
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    id: 'mock-file-txt',
    type: 'file',
    label: '06-04-2026 @ Mock Data',
    value: JSON.stringify({
      uri: 'file:///dummy/path/boothub_readme.txt',
      name: 'boothub_readme.txt',
      size: 15360,
      mimeType: 'text/plain',
    }),
  },
  {
    id: '1',
    type: 'link',
    label: '06-04-2026 @ Just Now',
    value: 'https://www.instagram.com/p/DY39qSboKXX/?igsh=Y214YTU3eHl4YW82',
  },
  {
    id: '2',
    type: 'link',
    label: '06-04-2026 @ 10m ago',
    value: 'https://github.com/achorein/expo-share-intent',
  },
  {
    id: '3',
    type: 'link',
    label: '06-04-2026 @ 2h ago',
    value: 'https://reactnative.dev/docs/navigation',
  },
  {
    id: '4',
    type: 'text',
    label: '06-04-2026 @ 1h ago',
    value: 'Remember to install expo-share-intent version 5.0.0 for Expo SDK 54!',
  },
  {
    id: '5',
    type: 'text',
    label: '06-04-2026 @ 3h ago',
    value: 'Buy groceries: milk, eggs, whole-wheat bread, coffee beans.',
  },
  {
    id: '6',
    type: 'photo',
    label: '06-03-2026 @ Yesterday',
    value: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
  },
  {
    id: '7',
    type: 'photo',
    label: '06-02-2026 @ 2 days ago',
    value: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800',
  },
];

export const getItems = async (): Promise<DumpItem[]> => {
  try {
    const rawData = await AsyncStorage.getItem(STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData) as DumpItem[];
      // Seed the mock item if it's missing from existing storage items
      let updated = [...parsed];
      let changed = false;
      
      if (!parsed.some((item) => item.id === 'mock-long-text')) {
        const mockItem: DumpItem = {
          id: 'mock-long-text',
          type: 'text',
          label: '06-04-2026 @ Mock Data',
          value: 'This is a mock text item with extremely long lines to test multiline input auto-growing and text wrapping in both the read cards and the bottom bar edit input. ' +
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
            'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
            'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ' +
            'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        };
        updated.unshift(mockItem);
        changed = true;
      }
      
      if (!parsed.some((item) => item.id === 'mock-file-txt')) {
        const mockFileItem: DumpItem = {
          id: 'mock-file-txt',
          type: 'file',
          label: '06-04-2026 @ Mock Data',
          value: JSON.stringify({
            uri: 'file:///dummy/path/boothub_readme.txt',
            name: 'boothub_readme.txt',
            size: 15360,
            mimeType: 'text/plain',
          }),
        };
        updated.unshift(mockFileItem);
        changed = true;
      }

      if (changed) {
        await saveItems(updated);
        return updated;
      }
      return parsed;
    }
    // Seed default items if storage is empty
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

export const addItem = async (type: DumpType, value: string): Promise<DumpItem[]> => {
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
    const updated = currentItems.filter((item) => item.id !== id);
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

export const addMultiplePhotos = async (uris: string[]): Promise<DumpItem[]> => {
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
    }));

    const updated = [...newItems, ...currentItems];
    await saveItems(updated);
    return updated;
  } catch (e) {
    console.error('Failed to add multiple photos:', e);
    return [];
  }
};
