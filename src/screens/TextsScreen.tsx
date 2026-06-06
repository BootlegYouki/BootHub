import React, { useRef, useState } from 'react';
import { View, StyleSheet, UIManager, findNodeHandle } from 'react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { FolderItem } from '../components/folder-item';
import { useFolderNavigation, getFolderDetails } from '../utils/folder-navigation';
import { FolderHeader } from '../components/folder-header';
import { EmptyFolderPlaceholder } from '../components/empty-folder';

interface TextsScreenProps {
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

interface TextItemProps {
  item: DumpItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  isEditing: boolean;
}

const TextItem: React.FC<TextItemProps> = ({
  item, isSelected, isSelectionMode, toggleSelect, onLongPress,
  isEditing,
}) => {
  const { colors, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const itemRef = useRef<View>(null);

  const handleLongPress = () => {
    if (!onLongPress || isSelectionMode) return;
    const node = findNodeHandle(itemRef.current);
    if (node != null) {
      UIManager.measure(node, (_x, _y, width, height, pageX, pageY) => {
        onLongPress(item, { x: pageX, y: pageY, width, height });
      });
    }
  };

  return (
    <View ref={itemRef}>
      <TuiContainer
        label={item.label}
        accentBorder={isEditing || isSelected}
        style={
          isEditing
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : isSelected
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : undefined
        }
        onPress={isSelectionMode ? () => toggleSelect(item.id) : () => setIsExpanded(!isExpanded)}
        onLongPress={!isSelectionMode && !isEditing ? handleLongPress : undefined}
      >
        <View pointerEvents={isSelectionMode ? 'none' : 'auto'}>
          <TuiText size="md" style={styles.itemText} numberOfLines={isExpanded ? undefined : 3}>
            {item.value}
          </TuiText>
        </View>
      </TuiContainer>
    </View>
  );
};

export const TextsScreen: React.FC<TextsScreenProps> = ({
  sortedItems,
  isSelectionMode,
  selectedIds,
  toggleSelect,
  onLongPress,
  editingItemId,
  searchQuery,
  expandedFolders,
  setExpandedFolders,
}) => {
  const { colors } = useTheme();

  const {
    activeFolder,
    activeFolderName,
    activeFolderChildren,
    topLevelItems,
    handleBack,
    handleOpenSubFolder,
  } = useFolderNavigation(sortedItems, expandedFolders, setExpandedFolders);

  if (activeFolder) {
    return (
      <>
        <FolderHeader
          name={activeFolderName}
          count={activeFolderChildren.length}
          onBack={handleBack}
        />

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
                />
              );
            }
            return (
              <TextItem
                key={child.id}
                item={child}
                isSelected={isSelectionMode && selectedIds.has(child.id)}
                isSelectionMode={isSelectionMode}
                toggleSelect={toggleSelect}
                onLongPress={onLongPress}
                isEditing={editingItemId === child.id}
              />
            );
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
        {searchQuery ? 'No matching texts found.' : 'No texts dumped yet.'}
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
            >
              {children.map((child) => (
                <TextItem
                  key={child.id}
                  item={child}
                  isSelected={isSelectionMode && selectedIds.has(child.id)}
                  isSelectionMode={isSelectionMode}
                  toggleSelect={toggleSelect}
                  onLongPress={onLongPress}
                  isEditing={editingItemId === child.id}
                />
              ))}
            </FolderItem>
          );
        }

        return (
          <TextItem
            key={item.id}
            item={item}
            isSelected={isSelectionMode && selectedIds.has(item.id)}
            isSelectionMode={isSelectionMode}
            toggleSelect={toggleSelect}
            onLongPress={onLongPress}
            isEditing={editingItemId === item.id}
          />
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  itemText: {
    flex: 1,
    textAlign: 'justify',
  },
});

