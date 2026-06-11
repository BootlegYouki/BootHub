import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, FolderOpen } from 'lucide-react-native';
import { TuiText } from './tui-text';
import { useTheme } from '../theme/theme-provider';

interface FolderHeaderProps {
  name: string;
  count?: number;
  onBack: () => void;
}

export const FolderHeader: React.FC<FolderHeaderProps> = ({ name, count, onBack }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.folderHeaderContainer}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.folderTitleContainer,
          {
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.primary + '25' : colors.card,
          },
        ]}
      >
        <FolderOpen size={18} color={colors.primary} style={{ marginRight: 10 }} />
        <TuiText weight="bold" size="md" style={{ color: colors.foreground }}>
          {name}
        </TuiText>
      </Pressable>
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
