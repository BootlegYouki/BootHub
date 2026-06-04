import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiHeaderProps {
  title: string;
  subtitle?: string;
  Icon?: React.ComponentType<any>;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const TuiHeader: React.FC<TuiHeaderProps> = ({
  title,
  subtitle,
  Icon,
  rightElement,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const borderAccent = colors.primary;

  return (
    <View style={[
      styles.headerContainer,
      {
        borderColor: borderAccent,
        backgroundColor: colors.card,
      },
      style
    ]}>
      <View style={styles.leftSection}>
        {Icon && <Icon size={18} color={colors.primary} style={styles.icon} />}
        <TuiText size="md" weight="bold" style={{ color: colors.primary }}>
          {title}
        </TuiText>
        {subtitle && (
          <TuiText size="md" weight="bold" style={{ color: colors.mutedForeground, marginLeft: 8 }}>
            // {subtitle}
          </TuiText>
        )}
      </View>
      {rightElement && (
        <View style={styles.rightSection}>
          {rightElement}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    width: '100%',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
});
