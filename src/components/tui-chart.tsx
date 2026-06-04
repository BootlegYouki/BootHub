import React from 'react';
import { View, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';


// ----------------------------------------------------
// TELEMETRY METER: [██████░░░░] style progress bar
// ----------------------------------------------------
interface TuiProgressMeterProps {
  progress: number; // 0 to 1
  label?: React.ReactNode;
  style?: ViewStyle;
  totalBlocks?: number;
  color?: string;
  mode?: 'deplete' | 'grow';
}

export const TuiProgressMeter: React.FC<TuiProgressMeterProps> = ({
  progress,
  label,
  style,
  totalBlocks = 44,
  color,
  mode = 'deplete',
}) => {
  const { colors, isDark } = useTheme();
  const cappedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(cappedProgress * 100);

  const activeBlocks = mode === 'grow'
    ? Math.round(cappedProgress * totalBlocks)
    : Math.round((1 - cappedProgress) * totalBlocks);
  const baseColor = color ?? colors.primary;
  const barColor = cappedProgress >= 0.9 ? colors.destructive : baseColor;

  return (
    <View style={[styles.meterContainer, style]}>
      <View style={styles.meterHeader}>
        {label && (
          typeof label === 'string' ? (
            <TuiText size="sm" weight="bold" style={styles.meterLabel}>
              {label}
            </TuiText>
          ) : (
            label
          )
        )}
        <TuiText size="sm" weight="bold" style={{ color: barColor }}>
          {percentage}%
        </TuiText>
      </View>

      {/* Main segmented progress bar */}
      <View style={styles.barRow}>
        {Array.from({ length: totalBlocks }).map((_, index) => {
          const isActive = index < activeBlocks;
          return (
            <View
              key={index}
              style={[
                styles.barSegment,
                {
                  backgroundColor: isActive ? barColor : (isDark ? '#27272A' : '#E4E4E7'),
                  marginRight: index === totalBlocks - 1 ? 0 : 1.5,
                  ...(isDark ? {} : { borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.55)' }),
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

// ----------------------------------------------------
// SEGMENTED METER: Multi-color bar (one color per category)
// ----------------------------------------------------
export interface MeterSegment {
  color: string;
  value: number; // amount this segment contributes (limit or spent)
}

interface TuiSegmentedMeterProps {
  segments: MeterSegment[];
  totalLimit: number;   // sum of all category limits
  totalSpent: number;   // sum of all spending
  label?: React.ReactNode;
  style?: ViewStyle;
  totalBlocks?: number;
  startAnimation?: boolean;
  animateMode?: 'once' | 'always' | 'none';
  animationDirection?: 'grow' | 'deplete';
}

let hasAnimatedBudget = false;

export const TuiSegmentedMeter: React.FC<TuiSegmentedMeterProps> = ({
  segments,
  totalLimit,
  totalSpent,
  label,
  style,
  totalBlocks = 44,
  startAnimation = true,
  animateMode = 'always',
  animationDirection = 'grow',
}) => {
  const { colors, isDark } = useTheme();
  const percentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const overallProgress = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const headerColor = overallProgress >= 0.9 ? colors.destructive : colors.mutedForeground;

  // Generate list of colors for each block based on segment weights
  const blockColors: string[] = [];
  segments.forEach((seg) => {
    const raw = totalLimit > 0 ? (seg.value / totalLimit) * totalBlocks : 0;
    const count = Math.round(raw);
    for (let i = 0; i < count; i++) {
      blockColors.push(seg.color);
    }
  });

  // Pad or slice to match exactly totalBlocks
  const inactiveColor = isDark ? '#27272A' : '#E4E4E7';
  while (blockColors.length < totalBlocks) {
    blockColors.push(inactiveColor);
  }
  const finalColors = blockColors.slice(0, totalBlocks);
  const activeBlocksCount = finalColors.filter(c => c !== inactiveColor).length;

  // Find how many blocks belong to the unspent segment (colored with colors.primary)
  const unspentSegment = segments.find(seg => seg.color === colors.primary);
  const unspentBlocksCount = unspentSegment && totalLimit > 0
    ? Math.min(totalBlocks, Math.round((unspentSegment.value / totalLimit) * totalBlocks))
    : 0;

  const blockActiveColorsRef = React.useRef<string[]>([]);
  
  // Track last active color of each segment to prevent visual snaps on state updates
  finalColors.forEach((color, index) => {
    if (color !== inactiveColor) {
      blockActiveColorsRef.current[index] = color;
    } else if (!blockActiveColorsRef.current[index]) {
      blockActiveColorsRef.current[index] = colors.primary;
    }
  });

  const willAnimate = animateMode === 'always' || !hasAnimatedBudget;

  const getInitialActiveCount = () => {
    if (!willAnimate) return animationDirection === 'deplete' ? unspentBlocksCount : activeBlocksCount;
    return animationDirection === 'deplete' ? totalBlocks : 0;
  };

  const activeCountAnim = React.useRef(
    new Animated.Value(getInitialActiveCount())
  ).current;

  const isFirstRenderRef = React.useRef(true);
  const prevActiveCountRef = React.useRef(activeBlocksCount);

  const [displayPercentage, setDisplayPercentage] = React.useState(
    willAnimate ? 0 : percentage
  );

  React.useEffect(() => {
    const listenerId = activeCountAnim.addListener(({ value }) => {
      let progress = 0;
      if (animationDirection === 'deplete') {
        const denominator = totalBlocks - unspentBlocksCount;
        progress = denominator > 0 ? (totalBlocks - value) / denominator : 1;
      } else {
        progress = activeBlocksCount > 0 ? value / activeBlocksCount : 1;
      }
      
      const currentPct = Math.round(progress * percentage);
      setDisplayPercentage(currentPct);
    });

    return () => {
      activeCountAnim.removeListener(listenerId);
    };
  }, [activeBlocksCount, unspentBlocksCount, totalBlocks, percentage, animationDirection]);

  React.useEffect(() => {
    if (!startAnimation) return;

    const animateOnce = animateMode === 'once';
    const targetValue = animationDirection === 'deplete' ? unspentBlocksCount : activeBlocksCount;

    const shouldSkip = animateMode === 'none' || (animateOnce && hasAnimatedBudget);

    if (shouldSkip) {
      activeCountAnim.setValue(targetValue);
      prevActiveCountRef.current = targetValue;
      setDisplayPercentage(percentage);
      isFirstRenderRef.current = false;
      return;
    } else if (animateOnce) {
      hasAnimatedBudget = true;
    }

    const fromValue = isFirstRenderRef.current
      ? (animationDirection === 'deplete' ? totalBlocks : 0)
      : prevActiveCountRef.current;
      
    isFirstRenderRef.current = false;

    activeCountAnim.setValue(fromValue);
    Animated.timing(activeCountAnim, {
      toValue: targetValue,
      duration: fromValue === 0 || fromValue === totalBlocks ? 1200 : 500, // 1200ms on startup, 500ms on subsequent updates
      easing: fromValue === 0 || fromValue === totalBlocks ? Easing.bezier(0.16, 1, 0.3, 1) : Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    prevActiveCountRef.current = targetValue;
  }, [activeBlocksCount, unspentBlocksCount, startAnimation]);
  const getInterpolatedColor = (index: number) => {
    const finalColor = finalColors[index];
    const unspentColor = colors.primary;

    if (animationDirection === 'deplete') {
      return activeCountAnim.interpolate({
        inputRange: [index, index + 1],
        outputRange: [finalColor, unspentColor],
        extrapolate: 'clamp',
      });
    } else {
      return activeCountAnim.interpolate({
        inputRange: [index, index + 1],
        outputRange: [inactiveColor, finalColor],
        extrapolate: 'clamp',
      });
    }
  };

  return (
    <View style={[styles.meterContainer, style]}>
      <View style={styles.meterHeader}>
        {label && (
          typeof label === 'string' ? (
            <TuiText size="sm" weight="bold" style={styles.meterLabel}>
              {label}
            </TuiText>
          ) : (
            label
          )
        )}
        <TuiText size="sm" weight="bold" style={{ color: headerColor }}>
          {displayPercentage}%
        </TuiText>
      </View>

      {/* Multi-color segmented progress bar */}
      <View style={styles.barRow}>
        {finalColors.map((color, index) => {
          const animatedBgColor = getInterpolatedColor(index);
          return (
            <Animated.View
              key={index}
              style={[
                styles.barSegment,
                {
                  backgroundColor: animatedBgColor,
                  marginRight: index === totalBlocks - 1 ? 0 : 1.5,
                  ...(isDark ? {} : { borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.55)' }),
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};


export interface ChartItem {
  id?: string;
  label: string;
  value: number;
  total: number; // For percentage comparison
  formattedValue: string;
  date?: string;
}

interface TuiBarChartProps {
  data: ChartItem[];
  style?: ViewStyle;
}

export const TuiBarChart: React.FC<TuiBarChartProps> = ({ data, style }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.chartContainer, style]}>
      {data.map((item, index) => {
        return (
          <View
            key={index}
            style={[
              styles.chartRow,
              {
                borderBottomWidth: index === data.length - 1 ? 0 : 1,
                borderColor: isDark ? '#27272A' : '#E4E4E7',
              },
            ]}
          >
            {/* Left Box (Icon + Category Label & Date) */}
            <View style={styles.chartLeft}>
              {item.id && (
                <View
                  style={[
                    styles.iconBox,
                    {
                      borderColor: isDark ? '#3F3F46' : '#000000',
                      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                    },
                  ]}
                >
                  <TuiText size="xs" weight="bold" style={{ color: isDark ? '#FAFAFA' : '#000000' }}>■</TuiText>
                </View>
              )}
              <View style={styles.labelContainer}>
                <TuiText size="sm" weight="bold" style={styles.chartLabel}>
                  {item.label}
                </TuiText>
                {item.date && item.id && (
                  <TuiText size="sm" variant="muted" style={styles.chartDate}>
                    {item.date} | {item.id ? (item.id.charAt(0).toUpperCase() + item.id.slice(1)) : ''}
                  </TuiText>
                )}
              </View>
            </View>

            {/* Value display */}
            <TuiText size="sm" weight="bold" style={styles.chartValue}>
              {item.formattedValue}
            </TuiText>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // Progress Meter
  meterContainer: {
    marginVertical: 5,
    width: '100%',
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  meterLabel: {
    letterSpacing: 0.5,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 28,
    marginVertical: 2,
  },
  barSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 1,
  },

  // Bar Chart
  chartContainer: {
    width: '100%',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  chartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  labelContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  chartLabel: {
    letterSpacing: 0.5,
  },
  chartDate: {
    marginTop: 1,
  },
  chartValue: {
    letterSpacing: 0.5,
  },
});

