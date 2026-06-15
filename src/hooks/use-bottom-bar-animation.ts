import { useEffect } from 'react';
import { EdgeInsets } from 'react-native-safe-area-context';
import {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface UseBottomBarAnimationOptions {
  isPhotoSheetOpen: boolean;
  isFooterFocused: boolean;
  insets: EdgeInsets;
}

export interface UseBottomBarAnimationReturn {
  bottomSpacerStyle: ReturnType<typeof useAnimatedStyle>;
  animatedBottomBarStyle: ReturnType<typeof useAnimatedStyle>;
}

export function useBottomBarAnimation({
  isPhotoSheetOpen,
  isFooterFocused,
  insets,
}: UseBottomBarAnimationOptions): UseBottomBarAnimationReturn {
  const keyboard = useAnimatedKeyboard();
  const photoSheetHeight = useSharedValue(0);

  useEffect(() => {
    if (isPhotoSheetOpen) {
      if (keyboard.height.value > 0) {
        photoSheetHeight.value = keyboard.height.value;
      }
      photoSheetHeight.value = withTiming(360, { duration: 250 });
    } else {
      photoSheetHeight.value = withTiming(0, { duration: 300 });
    }
  }, [isPhotoSheetOpen]);

  const bottomSpacerStyle = useAnimatedStyle(() => {
    const keyboardHeight = isFooterFocused ? keyboard.height.value : 0;
    const height = keyboardHeight + (360 - keyboardHeight) * (photoSheetHeight.value / 360);
    return { height };
  });

  const animatedBottomBarStyle = useAnimatedStyle(() => {
    const targetPadding = insets.bottom > 0 ? insets.bottom : 12;
    const keyboardHeight = isFooterFocused ? keyboard.height.value : 0;
    const totalHeight = keyboardHeight + (360 - keyboardHeight) * (photoSheetHeight.value / 360);
    const padding = interpolate(totalHeight, [0, 50], [targetPadding + 8, 12], 'clamp');
    return { paddingBottom: padding };
  });

  return { bottomSpacerStyle, animatedBottomBarStyle };
}
