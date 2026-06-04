import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface TuiTextProps extends TextProps {
  weight?: 'regular' | 'bold';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'muted' | 'accent' | 'destructive' | 'inverse';
}

export const TuiText: React.FC<TuiTextProps> = ({
  children,
  style,
  weight = 'regular',
  size = 'md',
  variant = 'default',
  ...props
}) => {
  const { colors } = useTheme();

  const getFontFamily = () => {
    return weight === 'bold' ? 'JetBrainsMono_700Bold' : 'JetBrainsMono_400Regular';
  };

  const getFontSize = () => {
    switch (size) {
      case 'xs': return 12;
      case 'sm': return 14;
      case 'md': return 16; // Default standard body size
      case 'lg': return 18;
      case 'xl': return 21;
      case '2xl': return 26;
      case '3xl': return 32;
      default: return 16;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'muted': return colors.mutedForeground;
      case 'accent': return colors.primary;
      case 'destructive': return colors.destructive;
      case 'inverse': return colors.primaryForeground;
      default: return colors.foreground;
    }
  };

  return (
    <Text
      style={[
        {
          fontFamily: getFontFamily(),
          fontSize: getFontSize(),
          color: getTextColor(),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
