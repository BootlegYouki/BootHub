import { useState, useEffect } from 'react';
import { useSharedValue, withTiming, useAnimatedStyle, interpolate } from 'react-native-reanimated';

interface UseHeaderMenuOptions {
  isSelectionMode: boolean;
  setIsSelectionMode: (v: boolean) => void;
  setSelectedIds: (fn: (prev: Set<string>) => Set<string>) => void;
}

export interface UseHeaderMenuReturn {
  headerMenuExpanded: boolean;
  toggleHeaderMenu: () => void;
  folderPlusButtonStyle: ReturnType<typeof useAnimatedStyle>;
  subButtonStyle: ReturnType<typeof useAnimatedStyle>;
}

export function useHeaderMenu({
  isSelectionMode,
  setIsSelectionMode,
  setSelectedIds,
}: UseHeaderMenuOptions): UseHeaderMenuReturn {
  const [headerMenuExpanded, setHeaderMenuExpanded] = useState(false);
  const headerMenuAnimation = useSharedValue(0);
  const folderPlusAnimation = useSharedValue(1);

  const toggleHeaderMenu = () => {
    const next = !headerMenuExpanded;
    setHeaderMenuExpanded(next);
    headerMenuAnimation.value = withTiming(next ? 1 : 0, { duration: 180 });
    if (!next) {
      setIsSelectionMode(false);
      setSelectedIds(() => new Set());
      folderPlusAnimation.value = 0;
    } else {
      folderPlusAnimation.value = isSelectionMode ? 0 : 1;
    }
  };

  useEffect(() => {
    if (headerMenuExpanded) {
      folderPlusAnimation.value = withTiming(isSelectionMode ? 0 : 1, { duration: 180 });
    }
  }, [isSelectionMode, headerMenuExpanded]);

  const folderPlusButtonStyle = useAnimatedStyle(() => {
    const combinedProgress = headerMenuAnimation.value * folderPlusAnimation.value;
    return {
      width: interpolate(combinedProgress, [0, 1], [0, 48]),
      marginRight: interpolate(combinedProgress, [0, 1], [0, 8]),
      opacity: interpolate(combinedProgress, [0, 1], [0, 1]),
      transform: [{ scale: interpolate(combinedProgress, [0, 1], [0, 1]) }],
      overflow: 'hidden',
    };
  });

  const subButtonStyle = useAnimatedStyle(() => ({
    width: interpolate(headerMenuAnimation.value, [0, 1], [0, 48]),
    marginRight: interpolate(headerMenuAnimation.value, [0, 1], [0, 8]),
    opacity: interpolate(headerMenuAnimation.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(headerMenuAnimation.value, [0, 1], [0, 1]) }],
    overflow: 'hidden',
  }));

  return { headerMenuExpanded, toggleHeaderMenu, folderPlusButtonStyle, subButtonStyle };
}
