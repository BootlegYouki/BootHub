import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TuiText } from './tui-text';
import { useTheme } from '../theme/theme-provider';

export const EmptyFolderPlaceholder: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.emptyContainer, { borderColor: colors.primary + '35' }]}>
      <TuiText size="sm" style={{ color: colors.mutedForeground, fontStyle: 'italic' }}>
        Empty Folder
      </TuiText>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    width: '100%',
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 8,
  },
});
