import React from 'react';
import { DumpItem } from '../utils/storage';
import { FolderItem } from './folder-item';
import { useFolderNavigation, getFolderDetails } from '../utils/folder-navigation';
import { FolderHeader } from './folder-header';
import { EmptyFolderPlaceholder } from './empty-folder';
import { TuiText } from './tui-text';
import { useTheme } from '../theme/theme-provider';

export interface FolderScreenProps {
  sortedItems: DumpItem[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  editingItemId: string | null;
  searchQuery?: string;
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export interface FolderItemProps {
  item: DumpItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  isEditing: boolean;
}

interface BaseFolderScreenProps extends FolderScreenProps {
  emptyText: string;
  renderItem: (item: DumpItem) => React.ReactNode;
}

export const BaseFolderScreen: React.FC<BaseFolderScreenProps> = ({
  sortedItems,
  isSelectionMode,
  selectedIds,
  toggleSelect,
  onLongPress,
  editingItemId,
  searchQuery,
  expandedFolders,
  setExpandedFolders,
  emptyText,
  renderItem,
}) => {
  const { colors } = useTheme();

  const {
    activeFolder,
    activeFolderChildren,
    topLevelItems,
    handleBack,
    handleOpenSubFolder,
    breadcrumb,
  } = useFolderNavigation(sortedItems, expandedFolders, setExpandedFolders);

  if (activeFolder) {
    return (
      <>
        <FolderHeader name={breadcrumb} onBack={handleBack} />

        {activeFolderChildren.length === 0 ? (
          <EmptyFolderPlaceholder />
        ) : (
          activeFolderChildren.map((child) => {
            if (child.type === 'folder') {
              const subFolderName = getFolderDetails(child).name;
              const subChildren = sortedItems.filter((x) => x.folderId === child.id);
              return (
                <FolderItem
                  key={child.id}
                  id={child.id}
                  name={subFolderName}
                  count={subChildren.length}
                  isExpanded={false}
                  onToggleExpand={() => handleOpenSubFolder(child.id)}
                  onLongPress={(bounds) => onLongPress?.(child, bounds)}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelectionMode && selectedIds.has(child.id)}
                  onPress={() => toggleSelect(child.id)}
                  syncState={child.syncState}
                />
              );
            }
            return renderItem(child);
          })
        )}
      </>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <TuiText
        size="sm"
        style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 32 }}
      >
        {searchQuery ? `No matching ${emptyText.toLowerCase()} found.` : `No ${emptyText.toLowerCase()} dumped yet.`}
      </TuiText>
    );
  }

  return (
    <>
      {topLevelItems.map((item) => {
        if (item.type === 'folder') {
          const folderName = getFolderDetails(item).name;
          const children = sortedItems.filter((child) => child.folderId === item.id);
          const isExpanded = !!expandedFolders[item.id];

          return (
            <FolderItem
              key={item.id}
              id={item.id}
              name={folderName}
              count={children.length}
              isExpanded={isExpanded}
              onToggleExpand={() => setExpandedFolders((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              onLongPress={(bounds) => onLongPress?.(item, bounds)}
              isSelectionMode={isSelectionMode}
              isSelected={isSelectionMode && selectedIds.has(item.id)}
              onPress={() => toggleSelect(item.id)}
              syncState={item.syncState}
            >
              {children.map((child) => renderItem(child))}
            </FolderItem>
          );
        }

        return renderItem(item);
      })}
    </>
  );
};
