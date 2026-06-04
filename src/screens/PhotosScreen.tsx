import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { ensureFileUri } from '../utils/helpers';

export interface PhotoLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
}) => {
  const { colors, isDark } = useTheme();
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
      <TuiContainer label="empty">
        <TuiText
          size="sm"
          style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 12 }}
        >
          No photos dumped yet.
        </TuiText>
      </TuiContainer>
    );
  }

  // Calculate dynamic width for 3 columns with 8px gaps and 16px horizontal screen margins
  const { width: windowWidth } = Dimensions.get('window');
  const availableWidth = windowWidth - 32;
  const gap = 8;
  const itemWidth = Math.floor((availableWidth - (gap * 2)) / 3);

  return (
    <View style={styles.gridContainer}>
      {sortedItems.map((item) => {
        const isSelected = isSelectionMode && selectedIds.has(item.id);
        return (
          <Pressable
            key={item.id}
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
            delayLongPress={250}
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
          </Pressable>
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
    paddingTop: 10,
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
