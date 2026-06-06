import React, { useMemo } from 'react';
import { DumpItem } from './storage';

export const getFolderDetails = (folder: DumpItem) => {
  let name = 'New Folder';
  try {
    name = JSON.parse(folder.value).name || 'New Folder';
  } catch {}
  return { name };
};

export const useFolderNavigation = (
  sortedItems: DumpItem[],
  expandedFolders: Record<string, boolean>,
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) => {
  // Find the active navigated folder by traversing down the tree of expanded folders
  const activeFolder = useMemo(() => {
    let currentFolder: DumpItem | undefined = undefined;
    while (true) {
      const parentId: string | undefined = currentFolder ? currentFolder.id : undefined;
      const nextFolder: DumpItem | undefined = sortedItems.find(
        (item) =>
          item.type === 'folder' &&
          item.folderId === parentId &&
          !!expandedFolders[item.id]
      );
      if (!nextFolder) {
        break;
      }
      currentFolder = nextFolder;
    }
    return currentFolder || null;
  }, [sortedItems, expandedFolders]);

  const activeFolderName = useMemo(() => {
    if (!activeFolder) return '';
    return getFolderDetails(activeFolder).name;
  }, [activeFolder]);

  const activeFolderChildren = useMemo(() => {
    if (!activeFolder) return [];
    return sortedItems.filter((child) => child.folderId === activeFolder.id);
  }, [sortedItems, activeFolder]);

  const topLevelItems = useMemo(() => {
    return sortedItems.filter((item) => !item.folderId);
  }, [sortedItems]);

  const handleBack = () => {
    if (activeFolder) {
      setExpandedFolders((prev) => ({ ...prev, [activeFolder.id]: false }));
    }
  };

  const handleOpenSubFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
  };

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  return {
    activeFolder,
    activeFolderName,
    activeFolderChildren,
    topLevelItems,
    handleBack,
    handleOpenSubFolder,
    handleToggleFolder,
  };
};
