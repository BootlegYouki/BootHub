import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

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
      <View style={[styles.borderLeft, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderRight, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderBottom, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderTopLeft, { backgroundColor: borderAccent, width: topSegmentWidth }]} />
      <View style={[styles.borderTopRight, { backgroundColor: borderAccent, width: topSegmentWidth }]} />

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
  borderLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1.5, zIndex: 5 },
  borderRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 1.5, zIndex: 5 },
  borderBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, zIndex: 5 },
  borderTopLeft: { position: 'absolute', left: 0, top: 0, height: 1.5, zIndex: 5 },
  borderTopRight: { position: 'absolute', right: 0, top: 0, height: 1.5, zIndex: 5 },
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
