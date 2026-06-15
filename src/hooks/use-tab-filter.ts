import { useMemo } from 'react';
import { DumpItem, DumpType } from '../utils/storage';
import { getActualType } from '../utils/helpers';

// ─── Folder helpers ───────────────────────────────────────────────────────────

export function getFolderTab(item: DumpItem): string | null {
  if (item.type !== 'folder') return null;
  try {
    const obj = JSON.parse(item.value);
    return obj.tab;
  } catch {
    return null;
  }
}

export function getFolderName(item: DumpItem): string {
  if (item.type !== 'folder') return '';
  try {
    const obj = JSON.parse(item.value);
    return obj.name || 'New Folder';
  } catch {
    return 'New Folder';
  }
}

function matchItem(item: DumpItem, q: string, tabItems: DumpItem[]): boolean {
  if (item.type === 'folder') {
    const name = getFolderName(item).toLowerCase();
    if (name.includes(q)) return true;
    const children = tabItems.filter((child) => child.folderId === item.id);
    return children.some((child) => matchItem(child, q, tabItems));
  }

  if (item.type === 'file') {
    let fileName = '';
    try {
      fileName = JSON.parse(item.value).name || '';
    } catch (e) {
      fileName = item.value.split('/').pop() || '';
    }
    return (
      fileName.toLowerCase().includes(q) ||
      !!(item.label && item.label.toLowerCase().includes(q))
    );
  }

  return (
    item.value.toLowerCase().includes(q) ||
    !!(item.label && item.label.toLowerCase().includes(q))
  );
}

function sortTabItems(itemsList: DumpItem[], sortAscending: boolean): DumpItem[] {
  const folders = itemsList.filter((x) => x.type === 'folder');
  const nonFolders = itemsList.filter((x) => x.type !== 'folder');

  const compareFn = (a: DumpItem, b: DumpItem) =>
    sortAscending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);

  folders.sort(compareFn);
  nonFolders.sort(compareFn);

  return [...folders, ...nonFolders];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTabFilterReturn {
  sortedLinkItems: DumpItem[];
  sortedTextItems: DumpItem[];
  sortedPhotoItems: DumpItem[];
  sortedFileItems: DumpItem[];
  /** Active-tab sorted+filtered items — used for select-all, counts, etc. */
  sortedItems: DumpItem[];
}

interface UseTabFilterOptions {
  items: DumpItem[];
  activeTab: DumpType;
  sortAscending: boolean;
  searchQuery: string;
  editingItemId: string | null;
  editText: string;
}

export function useTabFilter({
  items,
  activeTab,
  sortAscending,
  searchQuery,
  editingItemId,
  editText,
}: UseTabFilterOptions): UseTabFilterReturn {
  const TAB_ORDER: DumpType[] = ['link', 'text', 'photo', 'file'];

  const linkItems = useMemo(() =>
    items
      .filter((item) => {
        const type = getActualType(item.value, item.type);
        return type === 'link' || (item.type === 'folder' && getFolderTab(item) === 'link');
      })
      .map((item) =>
        item.id === editingItemId
          ? { ...item, value: item.type === 'folder' ? JSON.stringify({ name: editText, tab: 'link' }) : editText }
          : item
      ),
  [items, editingItemId, editText]);

  const textItems = useMemo(() =>
    items
      .filter((item) => {
        const type = getActualType(item.value, item.type);
        return type === 'text' || (item.type === 'folder' && getFolderTab(item) === 'text');
      })
      .map((item) =>
        item.id === editingItemId
          ? { ...item, value: item.type === 'folder' ? JSON.stringify({ name: editText, tab: 'text' }) : editText }
          : item
      ),
  [items, editingItemId, editText]);

  const photoItems = useMemo(() =>
    items.filter((item) => {
      const type = getActualType(item.value, item.type);
      return type === 'photo' || (item.type === 'folder' && getFolderTab(item) === 'photo');
    }),
  [items]);

  const fileItems = useMemo(() =>
    items
      .filter((item) => {
        const type = getActualType(item.value, item.type);
        return type === 'file' || (item.type === 'folder' && getFolderTab(item) === 'file');
      })
      .map((item) =>
        item.id === editingItemId
          ? { ...item, value: item.type === 'folder' ? JSON.stringify({ name: editText, tab: 'file' }) : editText }
          : item
      ),
  [items, editingItemId, editText]);

  const query = searchQuery.trim().toLowerCase();

  const sortedLinkItems = useMemo(() => {
    const filtered = query ? linkItems.filter((item) => matchItem(item, query, linkItems)) : linkItems;
    return sortTabItems(filtered, sortAscending);
  }, [linkItems, query, sortAscending]);

  const sortedTextItems = useMemo(() => {
    const filtered = query ? textItems.filter((item) => matchItem(item, query, textItems)) : textItems;
    return sortTabItems(filtered, sortAscending);
  }, [textItems, query, sortAscending]);

  const sortedPhotoItems = useMemo(() => {
    const filtered = query ? photoItems.filter((item) => matchItem(item, query, photoItems)) : photoItems;
    return sortTabItems(filtered, sortAscending);
  }, [photoItems, query, sortAscending]);

  const sortedFileItems = useMemo(() => {
    const filtered = query ? fileItems.filter((item) => matchItem(item, query, fileItems)) : fileItems;
    return sortTabItems(filtered, sortAscending);
  }, [fileItems, query, sortAscending]);

  // Active-tab sorted items for bulk select-all, count badges etc.
  const sortedItems = useMemo(() => {
    const tabMap: Partial<Record<DumpType, DumpItem[]>> = {
      link: sortedLinkItems,
      text: sortedTextItems,
      photo: sortedPhotoItems,
      file: sortedFileItems,
    };
    return tabMap[activeTab] ?? [];
  }, [activeTab, sortedLinkItems, sortedTextItems, sortedPhotoItems, sortedFileItems]);

  return {
    sortedLinkItems,
    sortedTextItems,
    sortedPhotoItems,
    sortedFileItems,
    sortedItems,
  };
}
