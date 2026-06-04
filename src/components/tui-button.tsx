import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'accent' | 'destructive' | 'outline';
  disabled?: boolean;
}

export const TuiButton: React.FC<TuiButtonProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();

  const getColors = (pressed: boolean) => {
    if (disabled) {
      return {
        bg: isDark ? '#18181B' : '#F4F4F5',
        border: isDark ? '#27272A' : '#E4E4E7',
        text: isDark ? '#52525B' : '#A1A1AA',
      };
    }

    // Monochromatic button colors with inversion logic on press
    switch (variant) {
      case 'accent':
        return {
          bg: pressed ? 'transparent' : colors.primary,
          border: colors.primary,
          text: pressed ? colors.primary : colors.primaryForeground,
        };
      case 'destructive':
        return {
          bg: pressed ? 'transparent' : colors.destructive,
          border: colors.destructive,
          text: pressed ? colors.destructive : '#FFFFFF',
        };
      case 'outline':
        return {
          bg: pressed ? colors.primary + '15' : 'transparent',
          border: colors.primary,
          text: colors.primary,
        };
      default:
        return {
          bg: pressed ? colors.primary : 'transparent',
          border: colors.primary,
          text: pressed ? colors.primaryForeground : colors.foreground,
        };
    }
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getColors(pressed).bg,
          borderColor: getColors(pressed).border,
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <TuiText
          weight="bold"
          style={{
            color: getColors(pressed).text,
            textAlign: 'center',
          }}
        >
          {children}
        </TuiText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    width: '100%',
  },
});
