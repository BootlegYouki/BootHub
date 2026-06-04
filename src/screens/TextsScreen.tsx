import React, { useRef, useState } from 'react';
import { View, StyleSheet, UIManager, findNodeHandle } from 'react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';

interface TextsScreenProps {
  sortedItems: DumpItem[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  editingItemId: string | null;
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
}) => {
  const { colors } = useTheme();

  if (sortedItems.length === 0) {
    return (
      <TuiContainer label="empty">
        <TuiText
          size="sm"
          style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 12 }}
        >
          No texts dumped yet.
        </TuiText>
      </TuiContainer>
    );
  }

  return (
    <>
      {sortedItems.map((item) => (
        <TextItem
          key={item.id}
          item={item}
          isSelected={isSelectionMode && selectedIds.has(item.id)}
          isSelectionMode={isSelectionMode}
          toggleSelect={toggleSelect}
          onLongPress={onLongPress}
          isEditing={editingItemId === item.id}
        />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  itemText: {
    flex: 1,
    textAlign: 'justify',
  },
});
