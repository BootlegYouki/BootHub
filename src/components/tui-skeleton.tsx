import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, TrendingUp, FileText, Landmark, Plus, LayoutGrid } from 'lucide-react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiContainer } from './tui-container';
import { TuiText } from './tui-text';

export const TuiSkeletonLoader: React.FC = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous breathing pulse loop for the skeleton blocks
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.65],
  });

  const borderAccent = isDark ? colors.primary : '#000000';
  const skeletonMutedBorder = isDark ? '#27272A' : '#E4E4E7';

  // Helper component to render pulsing skeleton text/bars
  const PulseText: React.FC<{
    children: React.ReactNode;
    style?: any;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    weight?: 'regular' | 'bold';
    variant?: 'default' | 'muted' | 'accent';
  }> = ({ children, style, size = 'xs', weight = 'bold', variant = 'muted' }) => {
    return (
      <Animated.View style={{ opacity }}>
        <TuiText size={size} weight={weight} variant={variant} style={style}>
          {children}
        </TuiText>
      </Animated.View>
    );
  };

  // Static items matching the 4 tabs of TuiTabBar, with all text blocked
  const menuItems = [
    { label: '████', Icon: LayoutGrid },
    { label: '██████', Icon: FileText },
    { label: '██████', Icon: TrendingUp },
    { label: '█████', Icon: Landmark },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      
      {/* 01: FIXED HEADER STATUS BAR */}
      <View style={[styles.statusBarHeader, { borderColor: borderAccent, backgroundColor: colors.card }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Wallet size={18} color={colors.mutedForeground} style={{ marginRight: 6 }} />
          <PulseText size="md" weight="bold" variant="accent">
            ████████
          </PulseText>
          <PulseText size="md" weight="bold" variant="muted" style={{ marginLeft: 8 }}>
            // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          </PulseText>
        </View>

        {/* Muted static theme button representing loading */}
        <Animated.View
          style={[
            styles.headerThemeBtn,
            {
              borderColor: borderAccent,
              backgroundColor: isDark ? '#27272A' : '#E4E4E7',
              opacity,
            }
          ]}
        >
          <TuiText size="xs" weight="bold" style={{ color: colors.mutedForeground, fontSize: 12 }}>
            ████
          </TuiText>
        </Animated.View>
      </View>

      {/* 02: BALANCES CARD CONTAINER (FIXED TOP) */}
      <View style={[styles.fixedTopSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TuiContainer label="████████">
          {/* Main Balance skeleton value using solid blocks */}
          <PulseText size="3xl" weight="bold" style={{ marginVertical: 4 }}>
            ██████████
          </PulseText>
          {/* Income / Expense details using shaded progress blocks */}
          <PulseText size="xs" style={{ marginTop: 2 }}>
            ███████████████████████████████████████
          </PulseText>
        </TuiContainer>
      </View>

      {/* 03: SCROLLABLE BODY */}
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: 90 + insets.bottom }]}>
        
        {/* Overall Stats Card */}
        <TuiContainer label="██████████████" badge="████">
          <View style={styles.meterContainer}>
            <View style={styles.meterHeader}>
              <PulseText size="xs" weight="bold">
                ██████████████████████████████
              </PulseText>
              <PulseText size="xs" weight="bold">
                ███
              </PulseText>
            </View>
            {/* Shaded ASCII progress meter skeleton bar */}
            <PulseText style={styles.asciiProgressText} size="md">
              ████████████████░░░░░░░░░░░░░░░░
            </PulseText>
          </View>
        </TuiContainer>

        {/* My Debts Card */}
        <TuiContainer label="████████">
          <View style={styles.debtsGrid}>
            <View style={[styles.debtCol, { borderRightWidth: 1, borderColor: colors.border }]}>
              <View style={styles.titleRow}>
                <Landmark size={12} color={colors.mutedForeground} style={styles.titleIcon} />
                <PulseText size="xs" weight="bold">█████</PulseText>
              </View>
              <PulseText size="lg" weight="bold" style={{ marginTop: 4 }}>
                ██████████
              </PulseText>
            </View>

            <View style={[styles.debtCol, { paddingLeft: 12 }]}>
              <View style={styles.titleRow}>
                <Landmark size={12} color={colors.mutedForeground} style={styles.titleIcon} />
                <PulseText size="xs" weight="bold">███████</PulseText>
              </View>
              <PulseText size="lg" weight="bold" style={{ marginTop: 4 }}>
                ██████████
              </PulseText>
            </View>
          </View>
        </TuiContainer>

        {/* Recent Transactions Card */}
        <TuiContainer label="███████████████████">
          <View style={styles.logsList}>
            {/* Render 3 static transaction skeleton rows */}
            {[1, 2, 3].map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.logRow,
                  {
                    borderColor: skeletonMutedBorder,
                    borderBottomWidth: idx === 2 ? 0 : 1,
                  },
                ]}
              >
                {/* Visual Category Icon Square Skeleton */}
                <Animated.View
                  style={[
                    styles.rowIconContainer,
                    {
                      borderColor: isDark ? '#3F3F46' : '#000000',
                      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                      opacity,
                    },
                  ]}
                >
                  <TuiText size="xs" style={{ color: colors.mutedForeground }}>▒</TuiText>
                </Animated.View>

                {/* Left Description/Date Block */}
                <View style={styles.logLeft}>
                  <PulseText weight="bold" size="sm">
                    █████████████
                  </PulseText>
                  <PulseText size="xs" style={{ marginTop: 2 }}>
                    ██████████████████
                  </PulseText>
                </View>

                {/* Right Amount block */}
                <View style={styles.logRight}>
                  <PulseText weight="bold" style={{ marginRight: 6 }}>
                    ████████
                  </PulseText>
                </View>
              </View>
            ))}
          </View>
        </TuiContainer>

      </ScrollView>

      {/* 04: FIXED FOOTER STATIC TAB BAR */}
      <View style={[styles.shadowWrapper, { bottom: 5 + insets.bottom }]}>
        <View style={styles.navRow}>
          {menuItems.map((item, idx) => {
            // Distribute uniform sizes roughly matching 70px width tabs
            const topSegmentWidth = (screenWidth - 40 - 52 - 14 - 12) / 8; // Est matching top border segments

            return (
              <Animated.View
                key={idx}
                style={[
                  styles.tabSquare,
                  {
                    backgroundColor: colors.card,
                    marginRight: idx === menuItems.length - 1 ? 14 : 4,
                    opacity,
                  },
                ]}
              >
                {/* Segmented Borders */}
                <View style={[styles.borderLeft, { backgroundColor: borderAccent }]} />
                <View style={[styles.borderRight, { backgroundColor: borderAccent }]} />
                <View style={[styles.borderBottom, { backgroundColor: borderAccent }]} />
                <View style={[styles.borderTopLeft, { backgroundColor: borderAccent, width: topSegmentWidth }]} />
                <View style={[styles.borderTopRight, { backgroundColor: borderAccent, width: topSegmentWidth }]} />

                {/* Tab Label Legend */}
                <View style={styles.legendWrapper}>
                  <TuiText weight="bold" style={[styles.legendText, { color: colors.mutedForeground }]}>
                    {item.label}
                  </TuiText>
                </View>

                {/* Tab Icon */}
                <View style={styles.tabContent}>
                  <item.Icon size={18} color={colors.mutedForeground} />
                </View>
              </Animated.View>
            );
          })}

          {/* Standalone LOG Plus Button Skeleton */}
          <Animated.View
            style={[
              styles.plusBtnSquare,
              {
                backgroundColor: colors.card,
                opacity,
              },
            ]}
          >
            <View style={[styles.borderLeft, { backgroundColor: borderAccent }]} />
            <View style={[styles.borderRight, { backgroundColor: borderAccent }]} />
            <View style={[styles.borderBottom, { backgroundColor: borderAccent }]} />
            <View style={[styles.borderTopLeft, { backgroundColor: borderAccent, width: 14 }]} />
            <View style={[styles.borderTopRight, { backgroundColor: borderAccent, width: 14 }]} />

            <View style={styles.legendWrapper}>
              <TuiText weight="bold" style={[styles.legendText, { color: colors.mutedForeground }]}>
                ███
              </TuiText>
            </View>

            <View style={styles.tabContent}>
              <Plus size={18} color={colors.mutedForeground} />
            </View>
          </Animated.View>
        </View>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  statusBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    zIndex: 10,
  },
  headerThemeBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedTopSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  
  // Progress Meter skeleton
  meterContainer: {
    marginVertical: 6,
    width: '100%',
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  asciiProgressText: {
    lineHeight: 22,
    letterSpacing: 1.5,
    marginVertical: 6,
    textAlign: 'center',
  },

  // Debts grid skeleton
  debtsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  debtCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 4,
  },

  // Transactions list skeleton
  logsList: {
    marginTop: 4,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowIconContainer: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logLeft: {
    flex: 1.2,
  },
  logRight: {
    flex: 0.8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  // Tab bar skeleton
  shadowWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 99,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  tabSquare: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusBtnSquare: {
    height: 52,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 1.5,
    zIndex: 5,
  },
  borderTopRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 1.5,
    zIndex: 5,
  },
  legendWrapper: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    paddingHorizontal: 2,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
