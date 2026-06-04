import React from 'react';
import { View, StyleSheet } from 'react-native';

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
}

export const LinksScreen: React.FC<LinksScreenProps> = ({
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
          No links dumped yet.
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
            noPadding={true}
            accentBorder={isSelected}
            style={isSelected ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' } : undefined}
            onPress={isSelectionMode ? () => toggleSelect(item.id) : undefined}
          >
            <View
              style={styles.urlPadding}
              pointerEvents={isSelectionMode ? 'none' : 'auto'}
            >
              <TuiText
                size="md"
                weight="bold"
                onPress={isSelectionMode ? undefined : () => handleOpenUrl(item.value)}
                style={{ color: colors.primary, textDecorationLine: 'underline' }}
              >
                {formatBreakAll(item.value)}
              </TuiText>
            </View>
            <View pointerEvents={isSelectionMode ? 'none' : 'auto'}>
              <LinkPreview url={item.value} />
            </View>
          </TuiContainer>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  urlPadding: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
});
