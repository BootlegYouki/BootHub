import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { ensureFileUri } from '../utils/helpers';

interface PhotosScreenProps {
  sortedItems: DumpItem[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
}

export const PhotosScreen: React.FC<PhotosScreenProps> = ({
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
          No photos dumped yet.
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
              <Image
                source={{ uri: ensureFileUri(item.value) }}
                style={styles.photoImage}
                resizeMode="cover"
              />
            </View>
          </TuiContainer>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  photoImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#00000010',
  },
});
