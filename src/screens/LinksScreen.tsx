import React, { useRef } from 'react';
import { View, StyleSheet, UIManager, findNodeHandle } from 'react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { LinkPreview } from '../components/link-preview';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { formatBreakAll, handleOpenUrl } from '../utils/helpers';

interface LinksScreenProps {
  sortedItems: DumpItem[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  editingItemId: string | null;
}

interface LinkItemProps {
  item: DumpItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  isEditing: boolean;
}

const LinkItem: React.FC<LinkItemProps> = ({
  item,
  isSelected,
  isSelectionMode,
  toggleSelect,
  onLongPress,
  isEditing,
}) => {
  const { colors, isDark } = useTheme();
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
        noPadding={true}
        accentBorder={isEditing || isSelected}
        style={
          isEditing
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : isSelected
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : undefined
        }
        onPress={
          isSelectionMode
            ? () => toggleSelect(item.id)
            : () => handleOpenUrl(item.value)
        }
        onLongPress={!isSelectionMode && !isEditing ? handleLongPress : undefined}
      >
        <View style={styles.urlPadding} pointerEvents="none">
          <TuiText
            size="md"
            weight="bold"
            style={{ color: colors.primary, textDecorationLine: 'underline' }}
          >
            {formatBreakAll(item.value)}
          </TuiText>
        </View>
        <View pointerEvents="none">
          <LinkPreview url={item.value} />
        </View>
      </TuiContainer>
    </View>
  );
};

export const LinksScreen: React.FC<LinksScreenProps> = ({
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
          No links dumped yet.
        </TuiText>
      </TuiContainer>
    );
  }

  return (
    <>
      {sortedItems.map((item) => (
        <LinkItem
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
  urlPadding: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
});
