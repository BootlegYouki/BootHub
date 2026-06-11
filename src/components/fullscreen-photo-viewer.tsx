import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  FlatList,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share, Trash2 } from 'lucide-react-native';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';
import { DumpItem } from '../utils/storage';
import { PhotoLayout } from '../screens/PhotosScreen';
import { ensureFileUri } from '../utils/helpers';

export interface FullscreenPhotoViewerProps {
  activeFullscreenPhotoIndex: number;
  setActiveFullscreenPhotoIndex: (index: number | null) => void;
  sortedItems: DumpItem[];
  startBounds: PhotoLayout | null;
  imageSizes: Record<string, { width: number; height: number }>;
  onShare: () => void;
  onDelete: () => void;
  measurePhotoRef: React.RefObject<((id: string, callback: (bounds: PhotoLayout | null) => void) => void) | null>;
}

export const calculateFullscreenImageBounds = (
  item: DumpItem,
  imageSizes: Record<string, { width: number; height: number }>
): PhotoLayout => {
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const size = imageSizes[item.id];
  const r = size ? size.width / size.height : 1.0;
  const screenAspectRatio = windowWidth / windowHeight;

  let targetWidth, targetHeight, targetLeft, targetTop;

  if (r > screenAspectRatio) {
    targetWidth = windowWidth;
    targetHeight = windowWidth / r;
    targetLeft = 0;
    targetTop = (windowHeight - targetHeight) / 2;
  } else {
    targetHeight = windowHeight;
    targetWidth = windowHeight * r;
    targetLeft = (windowWidth - targetWidth) / 2;
    targetTop = 0;
  }

  return {
    x: targetLeft,
    y: targetTop,
    width: targetWidth,
    height: targetHeight,
  };
};

export const FullscreenPhotoViewer: React.FC<FullscreenPhotoViewerProps> = ({
  activeFullscreenPhotoIndex,
  setActiveFullscreenPhotoIndex,
  sortedItems,
  startBounds,
  imageSizes,
  onShare,
  onDelete,
  measurePhotoRef,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

  const activeFullscreenPhoto =
    activeFullscreenPhotoIndex >= 0 && activeFullscreenPhotoIndex < sortedItems.length
      ? sortedItems[activeFullscreenPhotoIndex]
      : null;

  // Initial bounds calculation for transition targets
  const initialEndBounds = activeFullscreenPhoto
    ? calculateFullscreenImageBounds(activeFullscreenPhoto, imageSizes)
    : { x: 0, y: 0, width: 0, height: 0 };

  // Zoom and swipe states
  const [isZooming, setIsZooming] = useState<'in' | 'out' | null>(
    activeFullscreenPhoto && startBounds ? 'in' : null
  );
  const [isSwipingDown, setIsSwipingDown] = useState<boolean>(false);

  // Shared values for transitions initialized directly to prevent the one-frame flash/blink on mount
  const startX = useSharedValue(startBounds ? startBounds.x : 0);
  const startY = useSharedValue(startBounds ? startBounds.y : 0);
  const startWidth = useSharedValue(startBounds ? startBounds.width : 0);
  const startHeight = useSharedValue(startBounds ? startBounds.height : 0);

  const endX = useSharedValue(initialEndBounds.x);
  const endY = useSharedValue(initialEndBounds.y);
  const endWidth = useSharedValue(initialEndBounds.width);
  const endHeight = useSharedValue(initialEndBounds.height);

  const animationProgress = useSharedValue(0);
  const zoomPhase = useSharedValue(
    activeFullscreenPhoto && startBounds ? 1 : 0
  ); // 0 = idle/open, 1 = zooming-in, 2 = zooming-out
  const controlsOpacity = useSharedValue(0);
  const barBackgroundOpacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const controlsVisible = useRef<boolean>(true);
  const hasZoomedIn = useRef<boolean>(false);

  // Keep a ref to the latest active photo so the stale-closure PanResponder
  // can always read the current value without being re-created on every render.
  const activeFullscreenPhotoRef = useRef(activeFullscreenPhoto);
  useEffect(() => {
    activeFullscreenPhotoRef.current = activeFullscreenPhoto;
  });

  // Mutable ref that always points to the latest handleCloseFullscreen.
  const handleCloseRef = useRef<() => void>(() => {});

  // Initialize transition targets
  useEffect(() => {
    if (!hasZoomedIn.current && activeFullscreenPhoto && startBounds) {
      hasZoomedIn.current = true;
      const endBounds = calculateFullscreenImageBounds(activeFullscreenPhoto, imageSizes);

      startX.value = startBounds.x;
      startY.value = startBounds.y;
      startWidth.value = startBounds.width;
      startHeight.value = startBounds.height;

      endX.value = endBounds.x;
      endY.value = endBounds.y;
      endWidth.value = endBounds.width;
      endHeight.value = endBounds.height;

      animationProgress.value = 0;
      controlsOpacity.value = 0;
      controlsVisible.current = true;
      zoomPhase.value = 1;
      barBackgroundOpacity.value = 1;

      setIsZooming('in');
    }
  }, [activeFullscreenPhotoIndex]);

  const startAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startZoomInAnimation = () => {
    if (startAnimationTimeoutRef.current) {
      clearTimeout(startAnimationTimeoutRef.current);
      startAnimationTimeoutRef.current = null;
    }
    if (animationProgress.value === 0) {
      animationProgress.value = withTiming(1, { duration: 250 }, () => {
        zoomPhase.value = 0;
        runOnJS(setIsZooming)(null);
        // Fade controls in after zoom fully completes
        controlsOpacity.value = withTiming(1, { duration: 120 });
      });
    }
  };

  // Trigger zoom-in animation only after the fullscreen overlay has mounted
  useEffect(() => {
    if (isZooming === 'in') {
      animationProgress.value = 0;
      controlsOpacity.value = 0;
      
      // Fallback timeout to guarantee the animation runs even if onLoad doesn't fire
      startAnimationTimeoutRef.current = setTimeout(() => {
        startZoomInAnimation();
      }, 100);
    }
    return () => {
      if (startAnimationTimeoutRef.current) {
        clearTimeout(startAnimationTimeoutRef.current);
      }
    };
  }, [isZooming]);

  // Reset zoomPhase after the overlay has fully unmounted
  useEffect(() => {
    if (activeFullscreenPhotoIndex === null) {
      zoomPhase.value = 0;
    }
  }, [activeFullscreenPhotoIndex]);

  // Pan dismiss handlers
  const touchInitiallyHorizontalRef = useRef<boolean>(false);
  const touchInitiallyVerticalRef = useRef<boolean>(false);
  const currentScrollX = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);

  useEffect(() => {
    currentScrollX.current = activeFullscreenPhotoIndex * windowWidth;
  }, [activeFullscreenPhotoIndex]);

  const shouldSetPanResponder = (gestureState: any) => {
    if (isScrollingRef.current) {
      touchInitiallyHorizontalRef.current = true;
      touchInitiallyVerticalRef.current = false;
      return false;
    }

    const offsetFromPage = currentScrollX.current % windowWidth;
    const isMidScroll = Math.abs(offsetFromPage) > 2 && Math.abs(offsetFromPage) < windowWidth - 2;

    if (isMidScroll) {
      touchInitiallyHorizontalRef.current = true;
      touchInitiallyVerticalRef.current = false;
      return false;
    }

    const absX = Math.abs(gestureState.dx);
    const absY = Math.abs(gestureState.dy);

    if (!touchInitiallyHorizontalRef.current && !touchInitiallyVerticalRef.current) {
      if (absX > 5) {
        touchInitiallyHorizontalRef.current = true;
      } else if (absY > 20) {
        touchInitiallyVerticalRef.current = true;
      }
    }

    if (touchInitiallyHorizontalRef.current) {
      return false;
    }

    if (touchInitiallyVerticalRef.current) {
      return gestureState.dy > 15;
    }

    return false;
  };

  const handleCloseFullscreen = () => {
    // Read from ref so that the stale-closure PanResponder always gets the
    // photo that is *currently* displayed, not the one that was tapped first.
    const photo = activeFullscreenPhotoRef.current;
    if (!photo) return;

    if (measurePhotoRef.current) {
      measurePhotoRef.current(photo.id, (gridBounds) => {
        const fallbackBounds = {
          x: windowWidth / 2 - 50,
          y: windowHeight / 2 - 50,
          width: 100,
          height: 100,
        };

        const targetBounds = gridBounds || fallbackBounds;
        const currentBounds = calculateFullscreenImageBounds(photo, imageSizes);

        const currentYOffset = translateY.value;
        startX.value = targetBounds.x;
        startY.value = targetBounds.y;
        startWidth.value = targetBounds.width;
        startHeight.value = targetBounds.height;

        endX.value = currentBounds.x;
        endY.value = currentBounds.y + currentYOffset;
        endWidth.value = currentBounds.width;
        endHeight.value = currentBounds.height;

        setIsZooming('out');
        zoomPhase.value = 2;
        controlsOpacity.value = 0;
        animationProgress.value = 1;
        animationProgress.value = withTiming(0, { duration: 250 }, () => {
          runOnJS(setActiveFullscreenPhotoIndex)(null);
          runOnJS(setIsZooming)(null);
          translateY.value = 0;
        });
      });
    } else {
      setActiveFullscreenPhotoIndex(null);
      translateY.value = 0;
    }
  };

  // Keep the ref in sync every render so PanResponder always calls the latest version.
  handleCloseRef.current = handleCloseFullscreen;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
        return false;
      },
      onStartShouldSetPanResponderCapture: () => {
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
        return false;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return shouldSetPanResponder(gestureState);
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return shouldSetPanResponder(gestureState);
      },
      onPanResponderGrant: () => {
        setIsSwipingDown(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 120) {
          handleCloseRef.current();
        } else {
          translateY.value = withTiming(0, { duration: 200 });
        }
        setIsSwipingDown(false);
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
      },
      onPanResponderTerminate: () => {
        translateY.value = withTiming(0, { duration: 200 });
        setIsSwipingDown(false);
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
      },
    })
  ).current;

  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: isZooming ? 0 : translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    if (zoomPhase.value === 2) {
      return { opacity: 0 };
    }
    if (zoomPhase.value === 1) {
      return { opacity: animationProgress.value };
    }
    return {
      opacity: interpolate(translateY.value, [0, 120], [1, 0], 'clamp'),
    };
  });

  const controlsStyle = useAnimatedStyle(() => {
    if (zoomPhase.value === 1 || zoomPhase.value === 2) {
      return { opacity: 0 };
    }
    const baseOpacity = interpolate(translateY.value, [0, 100], [1, 0], 'clamp');
    return {
      opacity: controlsOpacity.value * baseOpacity,
    };
  });

  const barBgStyle = useAnimatedStyle(() => {
    return {
      opacity: barBackgroundOpacity.value,
    };
  });

  const animatedTransitionStyle = useAnimatedStyle(() => {
    const progress = animationProgress.value;

    const scaleX = interpolate(
      progress,
      [0, 1],
      [startWidth.value / Math.max(endWidth.value, 1), 1]
    );
    const scaleY = interpolate(
      progress,
      [0, 1],
      [startHeight.value / Math.max(endHeight.value, 1), 1]
    );

    const centerX_start = startX.value + startWidth.value / 2;
    const centerX_end = endX.value + endWidth.value / 2;
    const centerY_start = startY.value + startHeight.value / 2;
    const centerY_end = endY.value + endHeight.value / 2;

    const translateX_start = centerX_start - centerX_end;
    const translateY_start = centerY_start - centerY_end;

    const translateX = interpolate(progress, [0, 1], [translateX_start, 0]);
    const translateY_val = interpolate(progress, [0, 1], [translateY_start, 0]);

    const borderWidth = interpolate(progress, [0, 1], [1.5, 0]);
    const padding = interpolate(progress, [0, 1], [6, 0]);

    const opacity = isZooming ? 1 : 0;

    return {
      position: 'absolute',
      left: endX.value,
      top: endY.value,
      width: endWidth.value,
      height: endHeight.value,
      borderWidth,
      padding,
      borderColor: colors.primary + (isDark ? '40' : '26'),
      backgroundColor: 'transparent',
      overflow: 'hidden',
      opacity,
      transform: [
        { translateX },
        { translateY: translateY_val },
        { scaleX },
        { scaleY },
      ],
    };
  });

  if (!activeFullscreenPhoto) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 900,
        },
        containerStyle,
      ]}
    >
      {/* Dark Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          backdropStyle,
          { backgroundColor: colors.background }
        ]}
        pointerEvents="none"
      />

      {/* Transparent background flatlist for page browsing */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: isZooming ? 0 : 1 }
        ]}
        pointerEvents={isZooming ? 'none' : 'auto'}
      >
        <FlatList
          data={sortedItems}
          horizontal
          pagingEnabled
          scrollEnabled={!isSwipingDown}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          initialScrollIndex={activeFullscreenPhotoIndex}
          getItemLayout={(data, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
          onScroll={(e) => {
            currentScrollX.current = e.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            isScrollingRef.current = true;
          }}
          onScrollEndDrag={(e) => {
            const velocityX = e.nativeEvent.velocity ? e.nativeEvent.velocity.x : 0;
            if (velocityX === 0) {
              isScrollingRef.current = false;
            }
          }}
          onMomentumScrollEnd={(e) => {
            isScrollingRef.current = false;
            const contentOffset = e.nativeEvent.contentOffset.x;
            currentScrollX.current = contentOffset;
            const layoutWidth = e.nativeEvent.layoutMeasurement.width;
            const index = Math.round(contentOffset / layoutWidth);
            if (index >= 0 && index < sortedItems.length) {
              setActiveFullscreenPhotoIndex(index);
            }
          }}
          renderItem={({ item }) => (
            <View style={{ width: windowWidth, height: windowHeight, justifyContent: 'center', alignItems: 'center' }}>
              <Pressable
                onPress={() => {
                  const next = !controlsVisible.current;
                  controlsVisible.current = next;
                  controlsOpacity.value = withTiming(next ? 1 : 0, { duration: 150 });
                }}
                style={{ width: '100%', height: '100%' }}
              >
                <Image
                  source={{ uri: ensureFileUri(item.value) }}
                  style={{ width: windowWidth, height: windowHeight }}
                  contentFit="contain"
                  transition={0}
                  cachePolicy="memory-disk"
                />
              </Pressable>
            </View>
          )}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      {/* Transition Zoom Image */}
      <Animated.View style={animatedTransitionStyle} pointerEvents="none">
        <Image
          source={{ uri: ensureFileUri(activeFullscreenPhoto.value) }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={0}
          cachePolicy="memory-disk"
          onLoad={startZoomInAnimation}
        />
      </Animated.View>

      {/* Top Header Bar Container */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top > 0 ? insets.top + 56 : 64,
            zIndex: 950,
            opacity: 0,
          },
          controlsStyle,
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: colors.background,
              borderBottomWidth: 1.5,
              borderBottomColor: colors.primary + (isDark ? '40' : '26'),
            },
            barBgStyle,
          ]}
        />

        <View
          style={{
            flex: 1,
            paddingTop: insets.top > 0 ? insets.top : 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={handleCloseFullscreen}
            style={({ pressed }) => [
              styles.headerActionBtn,
              {
                borderColor: colors.primary,
                backgroundColor: pressed ? colors.primary + '25' : colors.card + '80',
              },
            ]}
          >
            <ArrowLeft size={16} color={colors.primary} />
          </Pressable>

          <View
            style={{
              backgroundColor: colors.card + '80',
              borderWidth: 1.5,
              borderColor: colors.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <TuiText weight="bold" size="sm" style={{ color: colors.primary }}>
              {activeFullscreenPhoto.label}
            </TuiText>
          </View>

          <View style={{ width: 40, height: 40 }} />
        </View>
      </Animated.View>

      {/* Bottom Footer Bar Container */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom > 0 ? insets.bottom + 64 : 72,
            zIndex: 950,
            opacity: 0,
          },
          controlsStyle,
        ]}
      >
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
          }}
        >
          <Pressable
            onPress={onShare}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: colors.primary,
                backgroundColor: pressed ? colors.primary + '25' : colors.card + '80',
              },
            ]}
          >
            <Share size={16} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={onDelete}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: colors.destructive || '#EF4444',
                backgroundColor: pressed ? (colors.destructive || '#EF4444') + '25' : colors.card + '80',
              },
            ]}
          >
            <Trash2 size={16} color={colors.destructive || '#EF4444'} />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  iconBtn: { borderWidth: 1.5, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerActionBtn: { borderWidth: 1.5, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
