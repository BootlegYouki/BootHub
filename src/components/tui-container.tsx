import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiContainerProps {
  children: React.ReactNode;
  label: string;
  badge?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  accentBorder?: boolean;
  onBadgePress?: () => void;
  labelSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  noPadding?: boolean;
  onPress?: () => void;
}

export const TuiContainer: React.FC<TuiContainerProps> = ({
  children,
  label,
  badge,
  style,
  contentStyle,
  accentBorder = false,
  onBadgePress,
  labelSize = 'md',
  noPadding = false,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const [legendWidth, setLegendWidth] = React.useState(0);

  const borderColor = colors.primary;
  const borderOpacity = accentBorder ? 1 : (isDark ? 0.25 : 0.15);
  const backgroundColor = colors.card;

  const containerPadding = noPadding 
    ? { paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0 } 
    : { paddingTop: 12, paddingBottom: 8, paddingHorizontal: 12 };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.outerContainer,
        containerPadding,
        {
          backgroundColor,
        },
        style,
      ]}
    >
      {/* Custom Segmented Borders to support transparent legend background without intersection */}
      <View style={[styles.borderLeft, { backgroundColor: borderColor, opacity: borderOpacity }]} />
      <View style={[styles.borderRight, { backgroundColor: borderColor, opacity: borderOpacity }]} />
      <View style={[styles.borderBottom, { backgroundColor: borderColor, opacity: borderOpacity }]} />
      <View style={[styles.borderTopLeft, { backgroundColor: borderColor, opacity: borderOpacity }]} />
      <View 
        style={[
          styles.borderTopRight, 
          { 
            backgroundColor: borderColor, 
            opacity: borderOpacity,
            left: 12 + legendWidth,
          }
        ]} 
      />

      {/* Legend Container */}
      <View
        onLayout={(e) => setLegendWidth(e.nativeEvent.layout.width)}
        style={[
          styles.legendWrapper,
          {
            backgroundColor: 'transparent',
          },
        ]}
      >
        <TuiText weight="bold" size={labelSize} style={{ color: colors.primary }}>
          {label}
        </TuiText>
        {badge && (
          <Pressable
            disabled={!onBadgePress}
            onPress={onBadgePress}
            style={({ pressed }) => [
              styles.badgeContainer,
              {
                borderColor: colors.primary,
                backgroundColor: pressed 
                  ? colors.primary + '30' 
                  : (isDark ? colors.primary + '15' : colors.primary + '10'),
              },
            ]}
          >
            <TuiText size="sm" weight="bold" style={{ color: colors.primary }}>
              {badge}
            </TuiText>
          </Pressable>
        )}
      </View>

      {/* Main Content */}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginTop: 10,
    marginBottom: 6,
    width: '100%',
    position: 'relative',
  },
  borderLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 5,
  },
  borderRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 5,
  },
  borderBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    zIndex: 5,
  },
  borderTopLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 12,
    height: 1.5,
    zIndex: 5,
  },
  borderTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: 1.5,
    zIndex: 5,
  },
  legendWrapper: {
    position: 'absolute',
    top: -11,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
  },
  badgeContainer: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  content: {
    width: '100%',
  },
});

