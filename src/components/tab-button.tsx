import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';
import { SegmentedBorders } from './segmented-borders';

interface TabButtonProps {
  isActive: boolean;
  onPress: () => void;
  label: string;
  Icon: React.ComponentType<any>;
}

export const TabButton: React.FC<TabButtonProps> = ({ isActive, onPress, label, Icon }) => {
  const { colors, isDark } = useTheme();
  const [buttonWidth, setButtonWidth] = useState(0);
  const [legendWidth, setLegendWidth] = useState(0);

  const borderAccent = colors.primary;
  const topSegmentWidth = Math.max(0, (buttonWidth - legendWidth) / 2);

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
      style={[
        styles.tabSquare,
        { backgroundColor: isActive ? (isDark ? '#27272A' : '#E4E4E7') : colors.card },
      ]}
    >
      <SegmentedBorders borderAccent={borderAccent} topSegmentWidth={topSegmentWidth} />

      <View
        onLayout={(e) => setLegendWidth(e.nativeEvent.layout.width)}
        style={styles.legendWrapper}
      >

        <TuiText
          weight="bold"
          style={[styles.legendText, { color: isActive ? colors.primary : colors.mutedForeground }]}
        >
          {label}
        </TuiText>
      </View>

      <View style={styles.tabContent} pointerEvents="none">
        <Icon size={24} color={isActive ? colors.primary : colors.mutedForeground} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tabSquare: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  legendWrapper: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 2,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  legendText: { fontSize: 14, letterSpacing: 0.2 },
  tabContent: { alignItems: 'center', justifyContent: 'center' },
});
