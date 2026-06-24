import React, { useRef, useState } from 'react';
import { View, StyleSheet, UIManager, findNodeHandle } from 'react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { BaseFolderScreen, FolderScreenProps, FolderItemProps } from '../components/base-folder-screen';

type TextsScreenProps = FolderScreenProps;

type TextItemProps = FolderItemProps;

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
        badge={
          item.syncState === 'error'
            ? 'Error'
            : undefined
        }
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

// fallow-ignore-next-line code-duplication
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
  return (
    <BaseFolderScreen
      sortedItems={sortedItems}
      isSelectionMode={isSelectionMode}
      selectedIds={selectedIds}
      toggleSelect={toggleSelect}
      onLongPress={onLongPress}
      editingItemId={editingItemId}
      searchQuery={searchQuery}
      expandedFolders={expandedFolders}
      setExpandedFolders={setExpandedFolders}
      emptyText="Texts"
      renderItem={(child) => (
        <TextItem
          key={child.id}
          item={child}
          isSelected={isSelectionMode && selectedIds.has(child.id)}
          isSelectionMode={isSelectionMode}
          toggleSelect={toggleSelect}
          onLongPress={onLongPress}
          isEditing={editingItemId === child.id}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  itemText: {
    flex: 1,
    textAlign: 'justify',
  },
});

