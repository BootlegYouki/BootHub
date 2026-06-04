import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const TuiCheckbox: React.FC<TuiCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const getColors = () => {
    const foregroundColor = colors.foreground;
    const backgroundColor = colors.background;
    
    if (disabled) {
      return {
        border: isDark ? 'rgba(250, 250, 250, 0.3)' : 'rgba(9, 9, 9, 0.3)',
        bg: 'transparent',
        text: isDark ? '#71717A' : '#A1A1AA',
        check: isDark ? '#71717A' : '#A1A1AA',
      };
    }
    return {
      border: checked ? foregroundColor : (isDark ? 'rgba(250, 250, 250, 0.6)' : 'rgba(9, 9, 9, 0.6)'),
      bg: checked ? foregroundColor : backgroundColor,
      text: foregroundColor,
      check: backgroundColor,
    };
  };

  const boxColors = getColors();

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.checkboxBox,
          {
            borderColor: boxColors.border,
            backgroundColor: boxColors.bg,
          },
        ]}
      >
        {checked && (
          <Svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke={boxColors.check}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Polyline points="20 6 9 17 4 12" />
          </Svg>
        )}
      </View>
      
      <TuiText
        weight="bold"
        style={[
          styles.label,
          {
            color: boxColors.text,
          },
        ]}
      >
        {label.toUpperCase()}
      </TuiText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.8,
  },
  checkboxBox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
