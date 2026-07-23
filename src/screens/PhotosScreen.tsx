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
import { useFolderNavigation, getFolderDetails } from '../utils/folder-navigation';
import { FolderHeader } from '../components/folder-header';
import { EmptyFolderPlaceholder } from '../components/empty-folder';


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
  tappingRef: React.MutableRefObject<boolean>;
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
  tappingRef,
}) => {
  const { colors, isDark } = useTheme();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    if (item.syncState !== 'pending') {
      setUploadProgress(0);
    }
  }, [item.id, item.syncState]);

  const scale = useSharedValue(1);
  // Timer that delays scale-up so it only plays during a long press, not a quick tap
  const scaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScaleTimer = () => {
    if (scaleTimer.current) {
      clearTimeout(scaleTimer.current);
      scaleTimer.current = null;
    }
  };

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
      onPressIn={() => {
        if (isSelectionMode) return;
        // Begin scale-up after 150ms — will only fully play if finger stays down for long press.
        // A quick tap cancels this timer before it fires.
        cancelScaleTimer();
        scaleTimer.current = setTimeout(() => {
          scale.value = withTiming(1.08, { duration: 180 });
        }, 150);
      }}
      onPress={() => {
        // Quick tap: cancel scale timer (finger lifted before 150ms), no scale plays
        cancelScaleTimer();
        if (isSelectionMode) {
          toggleSelect(item.id);
          return;
        }
        if (!onPhotoPress) return;
        if (tappingRef.current) return;
        tappingRef.current = true;
        itemRefs.current[item.id]?.measureInWindow(
          (x: number, y: number, width: number, height: number) => {
            if (width > 0 && height > 0) {
              onPhotoPress(item, { x, y, width, height });
            }
            setTimeout(() => { tappingRef.current = false; }, 600);
          }
        );
      }}
      onLongPress={
        !isSelectionMode && onPhotoLongPress
          ? () => {
              // Scale is already building from the 150ms timer — trigger preview
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
      onPressOut={() => {
        cancelScaleTimer();
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
          source={{ uri: ensureFileUri(item.value, item.id) }}
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
  // Shared tap-lock: ensures only one photo can fire at a time
  const tappingRef = useRef(false);

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

  const {
    activeFolder,
    activeFolderName,
    activeFolderChildren,
    topLevelItems,
    handleBack,
    handleOpenSubFolder,
    breadcrumb,
  } = useFolderNavigation(sortedItems, expandedFolders, setExpandedFolders);

  // Calculate dynamic width for 3 columns with 8px gaps and 16px horizontal screen margins
  const { width: windowWidth } = Dimensions.get('window');
  const availableWidth = windowWidth - 32;
  const gap = 8;
  const itemWidth = Math.floor((availableWidth - (gap * 2)) / 3);

  if (activeFolder) {
    const folderChildren = activeFolderChildren.filter((child) => child.type === 'folder');
    const photoChildren = activeFolderChildren.filter((child) => child.type !== 'folder');

    return (
      <View style={{ width: '100%' }}>
        {activeFolderChildren.length === 0 ? (
          <EmptyFolderPlaceholder />
        ) : (
          <>
            {folderChildren.map((child) => {
              const subFolderName = getFolderDetails(child).name;
              const subChildren = sortedItems.filter((x) => x.folderId === child.id);
              return (
                <FolderItem
                  key={child.id}
                  id={child.id}
                  name={subFolderName}
                  count={subChildren.length}
                  isExpanded={false}
                  onToggleExpand={() => handleOpenSubFolder(child.id)}
                  onLongPress={(bounds) => onPhotoLongPress?.(child, bounds)}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelectionMode && selectedIds.has(child.id)}
                  onPress={() => toggleSelect(child.id)}
                />
              );
            })}

            {photoChildren.length > 0 && (
              <View style={styles.gridContainer}>
                {photoChildren.map((child) => (
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
                  tappingRef={tappingRef}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );
  }

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

  return (
    <View style={styles.gridContainer}>
      {topLevelItems.map((item) => {
        if (item.type === 'folder') {
          const folderName = getFolderDetails(item).name;
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
              isSelectionMode={isSelectionMode}
              isSelected={isSelectionMode && selectedIds.has(item.id)}
              onPress={() => toggleSelect(item.id)}
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
                  tappingRef={tappingRef}
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
            tappingRef={tappingRef}
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
  photoSyncBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    zIndex: 10,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
});

