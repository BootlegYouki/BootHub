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

  const breadcrumb = useMemo(() => {
    if (!activeFolder) return '';
    
    let tabRoot = '';
    try {
      const obj = JSON.parse(activeFolder.value);
      const tab = obj.tab || 'folder';
      tabRoot = tab.charAt(0).toUpperCase() + tab.slice(1) + 's';
      if (tabRoot === 'Texts') tabRoot = 'Texts'; // preserve exact tab names
    } catch {
      tabRoot = 'Folders';
    }
    
    const path: string[] = [];
    let current: DumpItem | undefined = activeFolder;
    while (current) {
      try {
        const details = JSON.parse(current.value);
        path.unshift(details.name || 'Folder');
      } catch {
        path.unshift(current.label || 'Folder');
      }
      
      if (current && current.folderId) {
        current = sortedItems.find((x) => x.id === current.folderId);
      } else {
        current = undefined;
      }
    }
    
    return [tabRoot, ...path].join(' > ');
  }, [activeFolder, sortedItems]);

  return {
    activeFolder,
    activeFolderName,
    activeFolderChildren,
    topLevelItems,
    handleBack,
    handleOpenSubFolder,
    handleToggleFolder,
    breadcrumb,
  };
};
