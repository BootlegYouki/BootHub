import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { ensureFileUri } from '../utils/helpers';
import { FolderItem } from '../components/folder-item';

export interface PhotoLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PhotoItemProps {
  item: DumpItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  onPhotoPress?: (item: DumpItem, startBounds: PhotoLayout) => void;
  onPhotoLongPress?: (item: DumpItem, startBounds: PhotoLayout) => void;
  activePhotoId?: string | null;
  itemWidth: number;
  itemRefs: React.MutableRefObject<Record<string, any>>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PhotoItem: React.FC<PhotoItemProps> = ({
  item,
  isSelected,
  isSelectionMode,
  toggleSelect,
  onPhotoPress,
  onPhotoLongPress,
  activePhotoId,
  itemWidth,
  itemRefs,
}) => {
  const { colors, isDark } = useTheme();

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      ref={(ref) => {
        if (ref) {
          itemRefs.current[item.id] = ref;
        } else {
          delete itemRefs.current[item.id];
        }
      }}
      onPress={
        isSelectionMode
          ? () => toggleSelect(item.id)
          : onPhotoPress
          ? () => {
              itemRefs.current[item.id]?.measureInWindow(
                (x: number, y: number, width: number, height: number) => {
                  if (width > 0 && height > 0) {
                    onPhotoPress(item, { x, y, width, height });
                  }
                }
              );
            }
          : undefined
      }
      onLongPress={
        !isSelectionMode && onPhotoLongPress
          ? () => {
              itemRefs.current[item.id]?.measureInWindow(
                (x: number, y: number, width: number, height: number) => {
                  if (width > 0 && height > 0) {
                    onPhotoLongPress(item, { x, y, width, height });
                  }
                }
              );
            }
          : undefined
      }
      delayLongPress={350}
      onPressIn={() => {
        if (!isSelectionMode) {
          scale.value = withTiming(1.1, { duration: 150 });
        }
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
      style={[
        styles.photoCard,
        {
          width: itemWidth,
          height: itemWidth,
          borderColor: isSelected ? colors.primary : colors.primary + (isDark ? '40' : '26'),
          backgroundColor: colors.card,
        },
        isSelected && { backgroundColor: isDark ? '#27272A' : '#E4E4E7' },
        item.id === activePhotoId && { opacity: 0 },
        animatedStyle,
      ]}
    >
      <View style={styles.imageWrapper} pointerEvents="none">
        <Image
          source={{ uri: ensureFileUri(item.value) }}
          style={styles.photoImage}
          contentFit="cover"
          transition={0}
        />
        {isSelected && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.35)',
              },
            ]}
          />
        )}
      </View>
    </AnimatedPressable>
  );
};

interface PhotosScreenProps {
  sortedItems: DumpItem[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onPhotoPress?: (item: DumpItem, startBounds: PhotoLayout) => void;
  onPhotoLongPress?: (item: DumpItem, startBounds: PhotoLayout) => void;
  activePhotoId?: string | null;
  registerMeasureFn?: (
    fn: (id: string, callback: (bounds: PhotoLayout | null) => void) => void
  ) => void;
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const PhotosScreen: React.FC<PhotosScreenProps> = ({
  sortedItems,
  isSelectionMode,
  selectedIds,
  toggleSelect,
  onPhotoPress,
  onPhotoLongPress,
  activePhotoId,
  registerMeasureFn,
  expandedFolders,
  setExpandedFolders,
}) => {
  const { colors } = useTheme();
  const itemRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    if (registerMeasureFn) {
      registerMeasureFn((id: string, callback: (bounds: PhotoLayout | null) => void) => {
        const el = itemRefs.current[id];
        if (el) {
          el.measureInWindow((x: number, y: number, width: number, height: number) => {
            if (width > 0 && height > 0) {
              callback({ x, y, width, height });
            } else {
              callback(null);
            }
          });
        } else {
          callback(null);
        }
      });
    }
  }, [registerMeasureFn, sortedItems]);

  if (sortedItems.length === 0) {
    return (
      <TuiText
        size="sm"
        style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 32 }}
      >
        No photos dumped yet.
      </TuiText>
    );
  }

  // Calculate dynamic width for 3 columns with 8px gaps and 16px horizontal screen margins
  const { width: windowWidth } = Dimensions.get('window');
  const availableWidth = windowWidth - 32;
  const gap = 8;
  const itemWidth = Math.floor((availableWidth - (gap * 2)) / 3);

  // Filter top-level items: items without folderId
  const topLevelItems = sortedItems.filter((item) => !item.folderId);

  return (
    <View style={styles.gridContainer}>
      {topLevelItems.map((item) => {
        if (item.type === 'folder') {
          let folderName = 'New Folder';
          try {
            folderName = JSON.parse(item.value).name || 'New Folder';
          } catch {}
          
          const children = sortedItems.filter((child) => child.folderId === item.id);
          const isExpanded = !!expandedFolders[item.id];
          
          return (
            <FolderItem
              key={item.id}
              id={item.id}
              name={folderName}
              count={children.length}
              isExpanded={isExpanded}
              onToggleExpand={() => setExpandedFolders((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              onLongPress={(bounds) => onPhotoLongPress?.(item, bounds)}
              childrenContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                paddingLeft: 0,
                borderLeftWidth: 0,
                marginTop: 8,
              }}
            >
              {children.map((child) => (
                <PhotoItem
                  key={child.id}
                  item={child}
                  isSelected={isSelectionMode && selectedIds.has(child.id)}
                  isSelectionMode={isSelectionMode}
                  toggleSelect={toggleSelect}
                  onPhotoPress={onPhotoPress}
                  onPhotoLongPress={onPhotoLongPress}
                  activePhotoId={activePhotoId}
                  itemWidth={itemWidth}
                  itemRefs={itemRefs}
                />
              ))}
            </FolderItem>
          );
        }

        return (
          <PhotoItem
            key={item.id}
            item={item}
            isSelected={isSelectionMode && selectedIds.has(item.id)}
            isSelectionMode={isSelectionMode}
            toggleSelect={toggleSelect}
            onPhotoPress={onPhotoPress}
            onPhotoLongPress={onPhotoLongPress}
            activePhotoId={activePhotoId}
            itemWidth={itemWidth}
            itemRefs={itemRefs}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 0,
    paddingBottom: 6,
  },
  photoCard: {
    borderWidth: 1.5,
    padding: 6,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00000010',
  },
});
