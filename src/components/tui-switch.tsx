import React from 'react';
import { Pressable, StyleSheet, View, Animated } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const TuiSwitch: React.FC<TuiSwitchProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [value]);

  const handleToggle = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const getColors = () => {
    if (disabled) {
      return {
        trackBorder: isDark ? '#27272A' : '#E4E4E7',
        trackBg: isDark ? '#1C1C1E' : '#F4F4F5',
        thumbBorder: isDark ? '#27272A' : '#D4D4D8',
        thumbBg: isDark ? '#27272A' : '#E4E4E7',
        textColor: isDark ? '#71717A' : '#A1A1AA',
      };
    }
    return {
      trackBorder: value ? colors.primary : (isDark ? 'rgba(39, 39, 42, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
      trackBg: value ? colors.primary : colors.muted,
      thumbBorder: value ? colors.primaryForeground : colors.border,
      thumbBg: colors.background,
      textColor: colors.foreground,
    };
  };

  const { trackBorder, trackBg, thumbBorder, thumbBg, textColor } = getColors();

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 24],
  });

  return (
    <Pressable
      disabled={disabled}
      onPress={handleToggle}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <TuiText style={styles.label}>{label}</TuiText>

      <View style={styles.switchRow}>
        <View
          style={[
            styles.switchTrack,
            {
              borderColor: trackBorder,
              backgroundColor: trackBg,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.switchThumb,
              {
                backgroundColor: thumbBg,
                borderColor: thumbBorder,
                transform: [{ translateX }],
              },
            ]}
          />
        </View>
        
        <TuiText
          weight="bold"
          style={[
            styles.statusText,
            {
              color: textColor,
            },
          ]}
        >
          {value ? 'ON' : 'OFF'}
        </TuiText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingVertical: 4,
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  switchThumb: {
    position: 'absolute',
    top: 4,
    width: 14,
    height: 14,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    marginLeft: 12,
    width: 28,
  },
});
