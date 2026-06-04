import React from 'react';
import { View, StyleSheet } from 'react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';

interface TextsScreenProps {
  sortedItems: DumpItem[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
}

export const TextsScreen: React.FC<TextsScreenProps> = ({
  sortedItems,
  isSelectionMode,
  selectedIds,
  toggleSelect,
}) => {
  const { colors, isDark } = useTheme();

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
      {sortedItems.map((item) => {
        const isSelected = isSelectionMode && selectedIds.has(item.id);
        return (
          <TuiContainer
            key={item.id}
            label={item.label}
            accentBorder={isSelected}
            style={isSelected ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' } : undefined}
            onPress={isSelectionMode ? () => toggleSelect(item.id) : undefined}
          >
            <View pointerEvents={isSelectionMode ? 'none' : 'auto'}>
              <TuiText size="md" style={styles.itemText}>
                {item.value}
              </TuiText>
            </View>
          </TuiContainer>
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
