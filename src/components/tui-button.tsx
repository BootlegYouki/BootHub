import React from 'react';
import { Pressable, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'accent' | 'destructive' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export const TuiButton: React.FC<TuiButtonProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  disabled = false,
  loading = false,
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

    const isButtonPressed = pressed && !loading;

    // Monochromatic button colors with inversion logic on press
    switch (variant) {
      case 'accent':
        return {
          bg: isButtonPressed ? 'transparent' : colors.primary,
          border: colors.primary,
          text: isButtonPressed ? colors.primary : colors.primaryForeground,
        };
      case 'destructive':
        return {
          bg: isButtonPressed ? 'transparent' : colors.destructive,
          border: colors.destructive,
          text: isButtonPressed ? colors.destructive : '#FFFFFF',
        };
      case 'outline':
        return {
          bg: isButtonPressed ? colors.primary + '15' : 'transparent',
          border: colors.primary,
          text: colors.primary,
        };
      default:
        return {
          bg: isButtonPressed ? colors.primary : 'transparent',
          border: colors.primary,
          text: isButtonPressed ? colors.primaryForeground : colors.foreground,
        };
    }
  };

  return (
    <Pressable
      disabled={disabled || loading}
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
        loading ? (
          <ActivityIndicator size="small" color={getColors(pressed).text} />
        ) : (
          <TuiText
            weight="bold"
            style={{
              color: getColors(pressed).text,
              textAlign: 'center',
            }}
          >
            {children}
          </TuiText>
        )
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
