import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, FolderOpen } from 'lucide-react-native';
import { TuiText } from './tui-text';
import { useTheme } from '../theme/theme-provider';

interface FolderHeaderProps {
  name: string;
  count: number;
  onBack: () => void;
}

export const FolderHeader: React.FC<FolderHeaderProps> = ({ name, count, onBack }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.folderHeaderContainer}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backBtn,
          {
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.primary + '25' : 'transparent',
          },
        ]}
      >
        <ArrowLeft size={16} color={colors.primary} />
      </Pressable>
      <View style={[styles.folderTitleContainer, { borderColor: colors.primary, backgroundColor: colors.card }]}>
        <FolderOpen size={16} color={colors.primary} style={{ marginRight: 6 }} />
        <TuiText weight="bold" size="sm" style={{ color: colors.foreground }}>
          {name} ({count})
        </TuiText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  folderHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 6,
    gap: 8,
  },
  backBtn: {
    borderWidth: 1.5,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderTitleContainer: {
    flex: 1,
    borderWidth: 1.5,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});
