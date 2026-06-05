import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Share2, Pencil, Trash2, Folder, FolderPlus } from 'lucide-react-native';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';
import { LinkPreview, previewCache } from './link-preview';
import { DumpItem } from '../utils/storage';
import { PhotoLayout } from '../screens/PhotosScreen';
import { getFileIcon, getFileTypeLabel } from '../screens/FilesScreen';
import { ensureFileUri, formatBytes } from '../utils/helpers';

export interface ContextMenuOverlayProps {
  contextMenuPhoto: { item: DumpItem; bounds: PhotoLayout };
  imageSizes: Record<string, { width: number; height: number }>;
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onMoveToFolder?: () => void;
  onRemoveFromFolder?: () => void;
}

export const ContextMenuOverlay: React.FC<ContextMenuOverlayProps> = ({
  contextMenuPhoto,
  imageSizes,
  onClose,
  onCopy,
  onShare,
  onEdit,
  onDelete,
  onMoveToFolder,
  onRemoveFromFolder,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const { item, bounds } = contextMenuPhoto;

  const isPhoto = item.type === 'photo';
  // Photos: grow in (0.9 → 1.0) — zoom reveal
  // Links/Texts: press down (1.0 → 0.95) — card squish effect
  const scale = useSharedValue(isPhoto ? 0.9 : 1.0);
  const targetScale = isPhoto ? 1.0 : 0.95;
  const closeScale = isPhoto ? 0.9 : 1.0;
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(targetScale, { duration: 150 });
    opacity.value = withTiming(1, { duration: 150 });
  }, []);

  const isClosingRef = useRef(false);

  const handleAction = (callback: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    scale.value = withTiming(closeScale, { duration: 150 });
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(callback)();
      }
    });
  };

  const animatedPreviewStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Calculate preview dimensions
  const maxPreviewWidth = screenWidth * 0.88;
  const maxPreviewHeight = screenHeight * 0.55;

  let previewWidth: number;
  let previewHeight: number;
  let previewLeft: number;

  if (item.type === 'photo') {
    const size = imageSizes[item.id];
    const r = size ? size.width / size.height : 1.0;
    previewWidth = maxPreviewWidth;
    previewHeight = maxPreviewWidth / r;
    if (previewHeight > maxPreviewHeight) {
      previewHeight = maxPreviewHeight;
      previewWidth = maxPreviewHeight * r;
    }
    // Center on the photo card's horizontal center
    const cardCenter = bounds.x + bounds.width / 2;
    previewLeft = cardCenter - previewWidth / 2;
    if (previewLeft < 16) previewLeft = 16;
    else if (previewLeft + previewWidth > screenWidth - 16) previewLeft = screenWidth - 16 - previewWidth;
  } else if (item.type === 'file') {
    let fileObj: any = {};
    try {
      fileObj = JSON.parse(item.value);
    } catch {}
    const isImageFile = /\.(png|jpe?g|gif|webp|heic)$/i.test(fileObj.name || '');
    const hasPhoto = !!(fileObj.artwork || (isImageFile ? fileObj.uri : null));

    previewWidth = bounds.width;
    previewLeft = bounds.x;
    if (hasPhoto) {
      const squareSize = Math.min(bounds.width, maxPreviewHeight - 68);
      previewHeight = 68 + squareSize;
    } else {
      previewHeight = 68;
    }
  } else if (item.type === 'folder') {
    previewWidth = bounds.width;
    previewLeft = bounds.x;
    previewHeight = 68;
  } else {
    // Estimate the full text height so the preview displays the entire value (not truncated)
    // Average character width is ~10.2px for JetBrains Mono at size 14 with styling. Card has 24px horizontal padding.
    const charsPerLine = Math.max(15, Math.floor((bounds.width - 24) / 10.2));
    const lines = Math.ceil(item.value.length / charsPerLine);

    let linkOffset = 26;
    if (item.type === 'link') {
      if (previewCache.has(item.value)) {
        const cached = previewCache.get(item.value);
        if (cached) {
          if (cached.image) {
            linkOffset = 284; // URL + Image section + Info tray
          } else if (cached.title || cached.description) {
            linkOffset = 65;  // URL + Info tray (no image)
          } else {
            linkOffset = 20;  // URL only
          }
        } else {
          linkOffset = 20;    // Fetched but has no preview data (like a broken/custom link)
        }
      } else {
        // Not cached yet (loading) — assume it might have an image to be safe
        linkOffset = 265;
      }
    }
    const estimatedTextHeight = lines * 22 + linkOffset;

    previewWidth = bounds.width;
    previewLeft = bounds.x;
    previewHeight = Math.min(estimatedTextHeight, maxPreviewHeight);
  }

  // Horizontal position of Menu centered relative to the preview
  const menuWidth = 240;
  let menuLeft = previewLeft + (previewWidth - menuWidth) / 2;
  if (menuLeft < 16) {
    menuLeft = 16;
  } else if (menuLeft + menuWidth > screenWidth - 16) {
    menuLeft = screenWidth - 16 - menuWidth;
  }

  // Vertical position centered relative to the original card's vertical center
  const cardVerticalCenter = bounds.y + bounds.height / 2;
  let previewTop = cardVerticalCenter - previewHeight / 2;

  const isFolder = item.type === 'folder';
  let menuHeight = 220; // Default height for 5 rows
  if (isFolder) {
    menuHeight = 88; // Folders only have 2 rows (Rename, Delete)
  } else if (isPhoto) {
    menuHeight = 176; // Photos have 4 rows (Copy, Share, Move, Delete)
  }
  
  const spaceAbove = previewTop - insets.top;
  const spaceBelow = screenHeight - insets.bottom - (previewTop + previewHeight);
  const showBelow = spaceBelow > spaceAbove;

  let menuTop = 0;
  const menuGap = isPhoto
    ? 16
    : Math.max(1, Math.round(15 - 0.025 * (previewHeight + menuHeight)));
  if (showBelow) {
    menuTop = previewTop + previewHeight + menuGap;
    // If menu overflows the bottom of the screen, shift both preview and menu up
    const overflow = (menuTop + menuHeight) - (screenHeight - insets.bottom - 16);
    if (overflow > 0) {
      previewTop -= overflow;
      menuTop -= overflow;
    }
  } else {
    menuTop = previewTop - menuHeight - menuGap;
    // If menu overflows the top of the screen, shift both preview and menu down
    const overflow = (insets.top + 16) - menuTop;
    if (overflow > 0) {
      previewTop += overflow;
      menuTop += overflow;
    }
  }

  // Final safety checks to make sure the preview itself stays fully on screen
  if (previewTop < insets.top + 16) {
    const shift = (insets.top + 16) - previewTop;
    previewTop += shift;
    menuTop += shift;
  } else if (previewTop + previewHeight > screenHeight - insets.bottom - 16) {
    const shift = (previewTop + previewHeight) - (screenHeight - insets.bottom - 16);
    previewTop -= shift;
    menuTop -= shift;
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1500 }]}>
      {/* Backdrop */}
      <Pressable onPress={() => handleAction(onClose)} style={StyleSheet.absoluteFillObject}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            animatedBackdropStyle,
            {
              backgroundColor: 'rgba(0,0,0,0.6)',
            },
          ]}
        />
      </Pressable>

      {/* Lifted Preview — image for photos, text card for links/texts */}
      <Animated.View
        style={[
          animatedPreviewStyle,
          {
            position: 'absolute',
            left: previewLeft,
            top: previewTop,
            width: previewWidth,
            height: previewHeight,
            zIndex: 1600,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          },
        ]}
      >
        {item.type === 'photo' ? (
          <Image
            source={{ uri: ensureFileUri(item.value) }}
            style={{
              width: '100%',
              height: '100%',
              borderWidth: 1.5,
              borderColor: colors.primary,
              borderRadius: 0,
            }}
            contentFit="contain"
            transition={0}
          />
        ) : (
          /* TuiContainer replica — exact card size, no label */
          <View style={{ width: '100%', height: '100%', backgroundColor: colors.card, overflow: 'hidden' }}>
            {/* Segmented borders matching TuiContainer — zIndex:5 keeps them above content */}
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1.5, backgroundColor: colors.primary, zIndex: 5 }} />
            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1.5, backgroundColor: colors.primary, zIndex: 5 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, backgroundColor: colors.primary, zIndex: 5 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, backgroundColor: colors.primary, zIndex: 5 }} />

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={item.type === 'file' ? undefined : { paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {item.type === 'link' ? (
                /* Link card — URL text + link preview, matches real card */
                <>
                  <View style={{ paddingTop: 12, paddingHorizontal: 12 }}>
                    <TuiText size="md" weight="bold" style={{ color: colors.primary, textDecorationLine: 'underline', lineHeight: 22 }}>
                      {item.value}
                    </TuiText>
                  </View>
                  <LinkPreview url={item.value} />
                </>
              ) : item.type === 'file' ? (
                /* File card replica */
                (() => {
                  let fileObj: any = { uri: '', name: 'File', size: 0, mimeType: '' };
                  try {
                    fileObj = JSON.parse(item.value);
                  } catch {}
                  const FileIconComponent = getFileIcon(fileObj.name);
                  const typeLabel = getFileTypeLabel(fileObj.name);
                  const isImageFile = /\.(png|jpe?g|gif|webp|heic)$/i.test(fileObj.name);
                  const artworkUri = fileObj.artwork || (isImageFile ? fileObj.uri : null);
                  const squareSize = Math.min(bounds.width, maxPreviewHeight - 68);
                  return (
                    <View style={{ flex: 1 }}>
                      {/* Top File info row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, height: 68 }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderWidth: 1.5,
                          borderColor: colors.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          overflow: 'hidden',
                        }}>
                          {artworkUri ? (
                            <Image
                              source={{ uri: ensureFileUri(artworkUri) }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                              transition={100}
                            />
                          ) : (
                            <FileIconComponent size={20} color={colors.primary} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <TuiText size="md" weight="bold" style={{ color: colors.foreground }} numberOfLines={1}>
                            {fileObj.name}
                          </TuiText>
                          <TuiText size="sm" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                            {typeLabel} {fileObj.size > 0 ? `• ${formatBytes(fileObj.size)}` : ''}
                          </TuiText>
                        </View>
                      </View>

                      {/* Large Square Image Preview section (if file has photo) */}
                      {artworkUri && (
                        <>
                          {/* Divider line matching LinkPreview */}
                          <View style={{ height: 1.5, backgroundColor: colors.primary + '30' }} />
                          <View style={{ width: '100%', height: squareSize - 1.5, backgroundColor: '#00000010' }}>
                            <Image
                              source={{ uri: ensureFileUri(artworkUri) }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                              transition={200}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  );
                })()
              ) : item.type === 'folder' ? (
                /* Folder card preview */
                (() => {
                  let folderObj: any = { name: 'Folder', tab: '' };
                  try {
                    folderObj = JSON.parse(item.value);
                  } catch {}
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, height: 68 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Folder size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TuiText size="md" weight="bold" style={{ color: colors.foreground }} numberOfLines={1}>
                          {folderObj.name || 'New Folder'}
                        </TuiText>
                        <TuiText size="sm" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                          Folder • {folderObj.tab ? folderObj.tab.charAt(0).toUpperCase() + folderObj.tab.slice(1) + 's' : ''}
                        </TuiText>
                      </View>
                    </View>
                  );
                })()
              ) : (
                /* Text card — content padded like TuiContainer */
                <View style={{ paddingTop: 12, paddingHorizontal: 12 }}>
                  <TuiText size="md" style={{ color: colors.foreground, lineHeight: 22, textAlign: 'justify' }}>
                    {item.value}
                  </TuiText>
                </View>
              )}
            </ScrollView>
          </View>
        )}

      </Animated.View>

      {/* Context Menu Container */}
      <Animated.View
        style={[
          animatedPreviewStyle,
          {
            position: 'absolute',
            left: menuLeft,
            top: menuTop,
            width: menuWidth,
            height: menuHeight,
            zIndex: 1700,
            borderRadius: 0, // No radius!
            borderWidth: 1.5,
            borderColor: colors.primary,
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            overflow: 'hidden',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 12,
          },
        ]}
      >
        {item.type !== 'folder' && (
          <>
            {/* Copy Row */}
            <Pressable
              onPress={() => handleAction(onCopy)}
              style={({ pressed }) => [
                styles.menuRow,
                {
                  backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.primary + '20',
                },
              ]}
            >
              <TuiText size="sm" style={{ color: colors.foreground }}>
                Copy
              </TuiText>
              <Copy size={16} color={colors.foreground} />
            </Pressable>

            {/* Share Row */}
            <Pressable
              onPress={() => handleAction(onShare)}
              style={({ pressed }) => [
                styles.menuRow,
                {
                  backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.primary + '20',
                },
              ]}
            >
              <TuiText size="sm" style={{ color: colors.foreground }}>
                Share
              </TuiText>
              <Share2 size={16} color={colors.foreground} />
            </Pressable>
          </>
        )}

        {/* Edit Row — only for folders, or link/text/file items */}
        {onEdit && (
          <Pressable
            onPress={() => handleAction(onEdit)}
            style={({ pressed }) => [
              styles.menuRow,
              {
                backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: colors.primary + '20',
              },
            ]}
          >
            <TuiText size="sm" style={{ color: colors.foreground }}>
              {item.type === 'folder' ? 'Rename' : 'Edit'}
            </TuiText>
            <Pencil size={16} color={colors.foreground} />
          </Pressable>
        )}

        {/* Move to / Remove from Folder Row — only for items, not folders */}
        {item.type !== 'folder' && (
          item.folderId ? (
            onRemoveFromFolder && (
              <Pressable
                onPress={() => handleAction(onRemoveFromFolder)}
                style={({ pressed }) => [
                  styles.menuRow,
                  {
                    backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: colors.primary + '20',
                  },
                ]}
              >
                <TuiText size="sm" style={{ color: colors.foreground }}>
                  Remove from Folder
                </TuiText>
                <Folder size={16} color={colors.foreground} />
              </Pressable>
            )
          ) : (
            onMoveToFolder && (
              <Pressable
                onPress={() => handleAction(onMoveToFolder)}
                style={({ pressed }) => [
                  styles.menuRow,
                  {
                    backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: colors.primary + '20',
                  },
                ]}
              >
                <TuiText size="sm" style={{ color: colors.foreground }}>
                  Move to Folder
                </TuiText>
                <FolderPlus size={16} color={colors.foreground} />
              </Pressable>
            )
          )
        )}

        {/* Delete Row */}
        <Pressable
          onPress={() => handleAction(onDelete)}
          style={({ pressed }) => [
            styles.menuRow,
            {
              backgroundColor: pressed ? (colors.destructive || '#EF4444') + '15' : 'transparent',
            },
          ]}
        >
          <TuiText size="sm" style={{ color: colors.destructive || '#EF4444' }}>
            Delete
          </TuiText>
          <Trash2 size={16} color={colors.destructive || '#EF4444'} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  menuRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});
