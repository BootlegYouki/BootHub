import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
  onLongPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  onLongPress,
}) => {
  const { colors, isDark } = useTheme();
  const [legendWidth, setLegendWidth] = React.useState(0);

  const scale = useSharedValue(1);

  const showLegend = !!(label || badge);

  const animatedPressableStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const borderColor = colors.primary;
  const borderOpacity = accentBorder ? 1 : (isDark ? 0.25 : 0.15);
  const backgroundColor = colors.card;

  const containerPadding = noPadding 
    ? { paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0 } 
    : { paddingTop: 12, paddingBottom: 8, paddingHorizontal: 12 };

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      onPressIn={() => {
        if (onLongPress) {
          scale.value = withTiming(1.03, { duration: 150 });
        }
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
      disabled={!onPress && !onLongPress}
      style={[
        styles.outerContainer,
        containerPadding,
        {
          backgroundColor,
        },
        style,
        animatedPressableStyle,
      ]}
    >
      {/* Custom Segmented Borders to support transparent legend background without intersection */}
      <View style={[styles.borderLeft, { backgroundColor: borderColor, opacity: borderOpacity }]} />
      <View style={[styles.borderRight, { backgroundColor: borderColor, opacity: borderOpacity }]} />
      <View style={[styles.borderBottom, { backgroundColor: borderColor, opacity: borderOpacity }]} />
      
      {showLegend ? (
        <>
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
        </>
      ) : (
        <View 
          style={[
            styles.borderTopSolid, 
            { 
              backgroundColor: borderColor, 
              opacity: borderOpacity,
            }
          ]} 
        />
      )}

      {/* Legend Container */}
      {showLegend && (
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
      )}

      {/* Main Content */}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </AnimatedPressable>
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
  borderTopSolid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
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

