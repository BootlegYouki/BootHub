import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { File, Link2, FileText, Folder, Check, Square } from 'lucide-react-native';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';
import { TuiContainer } from './tui-container';
import { DumpItem } from '../utils/storage';
import { ParsedShare } from '../utils/share-receiver';
import { getFileIcon, getFileTypeLabel } from '../screens/FilesScreen';
import { LinkPreview, previewCache, PreviewData } from './link-preview';
import { formatBreakAll, formatBytes, ensureFileUri } from '../utils/helpers';

interface ShareImportSheetProps {
  parsedShare: ParsedShare;
  folders: DumpItem[];
  onSave: (folderId?: string) => void;
  onCancel: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ShareImportSheet: React.FC<ShareImportSheetProps> = ({
  parsedShare,
  folders,
  onSave,
  onCancel,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(() => {
    if (parsedShare.type === 'link') {
      return previewCache.get(parsedShare.value) || null;
    }
    return null;
  });

  useEffect(() => {
    if (parsedShare.type === 'link') {
      setPreviewData(previewCache.get(parsedShare.value) || null);
    } else {
      setPreviewData(null);
    }
  }, [parsedShare]);

  useEffect(() => {
    if (parsedShare.type === 'photo') {
      const uri = ensureFileUri(parsedShare.value);
      console.log('[ShareImportSheet] Fetching image size for:', uri);
      RNImage.getSize(
        uri,
        (w, h) => {
          console.log('[ShareImportSheet] getSize success:', w, 'x', h);
          if (w > 0 && h > 0) {
            setAspectRatio(w / h);
          } else {
            setAspectRatio(1);
          }
        },
        (err) => {
          console.warn('[ShareImportSheet] getSize error:', err, 'for URI:', uri);
          setAspectRatio(1); // fallback to square to avoid loading forever
        }
      );
    }
  }, [parsedShare]);

  // Filter folders matching this shared item's target tab type
  const targetTab = parsedShare.type;
  const filteredFolders = folders.filter((f) => {
    try {
      const obj = JSON.parse(f.value);
      return obj.tab === targetTab;
    } catch {
      return false;
    }
  });

  const getFolderName = (folderItem: DumpItem) => {
    try {
      return JSON.parse(folderItem.value).name;
    } catch {
      return 'Folder';
    }
  };

  // Estimate maximum height the drawer content can occupy (e.g. 92% of screen)
  const maxDrawerContentHeight = screenHeight * 0.92;
  // Estimated height for title, labels, buttons, padding, margins
  const fixedLayoutHeight = 220; 
  const availableHeight = maxDrawerContentHeight - fixedLayoutHeight;

  // Folder row height is roughly 52px
  const folderRowHeight = 52;
  const folderListNeededHeight = filteredFolders.length === 0 
    ? 100 
    : (filteredFolders.length + 1) * folderRowHeight;

  // Calculate photo preview height dynamically
  const MIN_PHOTO_HEIGHT = 120;
  const MAX_PHOTO_HEIGHT = 350;
  const remainingForPhoto = availableHeight - folderListNeededHeight;
  const photoHeight = Math.max(MIN_PHOTO_HEIGHT, Math.min(MAX_PHOTO_HEIGHT, remainingForPhoto));

  // Determine dynamic previewHeight
  let previewHeight = 100; // default for file/text
  if (parsedShare.type === 'link') {
    previewHeight = 180;
  } else if (parsedShare.type === 'photo') {
    previewHeight = photoHeight;
  }

  // Folder list container gets remaining space
  const folderListMaxHeight = Math.max(100, availableHeight - previewHeight);
  const isFolderScrollable = folderListNeededHeight > folderListMaxHeight;

  const renderPreview = () => {
    switch (parsedShare.type) {
      case 'photo': {
        const parentWidth = screenWidth - 32; // drawer content padding is 16 on each side
        
        if (aspectRatio === null) {
          return (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: '100%',
                  height: photoHeight,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                  padding: 6,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator color={colors.primary} />
              </View>
            </View>
          );
        }

        let containerWidth: number | string = '100%';
        let containerHeight: number = photoHeight;

        if (aspectRatio > 0) {
          const fullWidthHeight = parentWidth / aspectRatio;
          if (fullWidthHeight <= photoHeight) {
            containerWidth = '100%';
            containerHeight = fullWidthHeight;
          } else {
            containerHeight = photoHeight;
            containerWidth = photoHeight * aspectRatio;
          }
        }

        return (
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: containerWidth as any,
                height: containerHeight,
                borderWidth: 1.5,
                borderColor: colors.primary,
                padding: 6,
                backgroundColor: colors.card,
              }}
            >
              <Image
                source={{ uri: ensureFileUri(parsedShare.value) }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          </View>
        );
      }
      case 'file': {
        const name = parsedShare.name || parsedShare.value.split('/').pop() || 'File';
        const size = parsedShare.size || 0;
        const FileIconComponent = getFileIcon(name);
        const typeLabel = getFileTypeLabel(name);
        const isImageFile = /\.(png|jpe?g|gif|webp|heic)$/i.test(name);
        const artworkUri = isImageFile ? parsedShare.value : null;

        return (
          <View style={{ marginBottom: 16 }}>
            <TuiContainer label="">
              <View style={styles.fileRow}>
                <View style={[styles.iconBox, { borderColor: colors.primary, overflow: 'hidden' }]}>
                  {artworkUri ? (
                    <Image
                      source={{ uri: ensureFileUri(artworkUri) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <FileIconComponent size={20} color={colors.primary} />
                  )}
                </View>
                <View style={styles.infoColumn}>
                  <TuiText size="md" weight="bold" style={{ color: colors.foreground }} numberOfLines={1}>
                    {name}
                  </TuiText>
                  <TuiText size="sm" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                    {typeLabel} {size > 0 ? `• ${formatBytes(size)}` : ''}
                  </TuiText>
                </View>
              </View>
            </TuiContainer>
          </View>
        );
      }
      case 'link': {
        const hasPhotoAndCaption = !!(previewData && previewData.image && previewData.title);

        return (
          <View style={{ marginBottom: 16 }}>
            <TuiContainer label="" noPadding={true}>
              {!hasPhotoAndCaption && (
                <View style={styles.urlPadding}>
                  <TuiText
                    size="md"
                    weight="bold"
                    style={{ color: colors.primary, textDecorationLine: 'underline' }}
                  >
                    {formatBreakAll(parsedShare.value)}
                  </TuiText>
                </View>
              )}
              <LinkPreview url={parsedShare.value} hideDivider={hasPhotoAndCaption} onLoad={setPreviewData} />
            </TuiContainer>
          </View>
        );
      }
      case 'text':
        return (
          <View style={{ marginBottom: 16 }}>
            <TuiContainer label="">
              <TuiText size="md" style={styles.itemText} numberOfLines={3}>
                {parsedShare.value}
              </TuiText>
            </TuiContainer>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderPreview()}

      <TuiText size="sm" weight="bold" style={{ color: colors.foreground, marginTop: 4, marginBottom: 8 }}>
        Select destination folder:
      </TuiText>

      <View style={styles.folderListContainer}>
        <ScrollView 
          style={[styles.folderListScroll, { maxHeight: folderListMaxHeight }]}
          contentContainerStyle={styles.folderListContent} 
          keyboardShouldPersistTaps="handled"
          scrollEnabled={isFolderScrollable}
        >
          {/* None selection (Top level) */}
          <Pressable
            onPress={() => setSelectedFolderId(undefined)}
            style={[
              styles.folderRow,
              {
                borderColor: selectedFolderId === undefined ? colors.primary : colors.primary + (isDark ? '30' : '15'),
                backgroundColor: selectedFolderId === undefined ? colors.primary + (isDark ? '20' : '10') : colors.card,
              },
            ]}
          >
            <Square size={18} color={selectedFolderId === undefined ? colors.primary : colors.mutedForeground} />
            <TuiText
              size="sm"
              weight={selectedFolderId === undefined ? 'bold' : 'regular'}
              style={{ color: selectedFolderId === undefined ? colors.foreground : colors.mutedForeground, marginLeft: 10, flex: 1 }}
            >
              None (Top Level)
            </TuiText>
            {selectedFolderId === undefined && <Check size={16} color={colors.primary} />}
          </Pressable>

          {/* Dynamic folders list */}
          {filteredFolders.map((f) => {
            const isSelected = selectedFolderId === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setSelectedFolderId(f.id)}
                style={[
                  styles.folderRow,
                  {
                    borderColor: isSelected ? colors.primary : colors.primary + (isDark ? '30' : '15'),
                    backgroundColor: isSelected ? colors.primary + (isDark ? '20' : '10') : colors.card,
                  },
                ]}
              >
                <Folder size={18} color={isSelected ? colors.primary : colors.mutedForeground} />
                <TuiText
                  size="sm"
                  weight={isSelected ? 'bold' : 'regular'}
                  style={{ color: isSelected ? colors.foreground : colors.mutedForeground, marginLeft: 10, flex: 1 }}
                >
                  {getFolderName(f)}
                </TuiText>
                {isSelected && <Check size={16} color={colors.primary} />}
              </Pressable>
            );
          })}

          {filteredFolders.length === 0 && (
            <TuiText size="xs" style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 12 }}>
              No folders created for {parsedShare.type}s yet.
            </TuiText>
          )}
        </ScrollView>
      </View>

      {/* Action Buttons fixed at the bottom */}
      <View style={styles.actionsContainer}>
        <Pressable
          onPress={onCancel}
          style={[
            styles.actionBtn,
            {
              borderColor: colors.destructive || '#EF4444',
              backgroundColor: 'transparent',
              marginRight: 10,
              flex: 1,
            },
          ]}
        >
          <TuiText weight="bold" style={{ color: colors.destructive || '#EF4444' }}>
            CANCEL
          </TuiText>
        </Pressable>

        <Pressable
          onPress={() => onSave(selectedFolderId)}
          style={[
            styles.actionBtn,
            {
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
              borderColor: isDark ? '#FFFFFF' : '#000000',
              flex: 1,
            },
          ]}
        >
          <TuiText weight="bold" style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
            SAVE DUMP
          </TuiText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  folderListContainer: {
    borderWidth: 1.5,
    borderColor: 'transparent', // helper container
  },
  folderListScroll: {
    // maxHeight is set dynamically in inline styles
  },
  folderListContent: {
    paddingBottom: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  urlPadding: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  itemText: {
    textAlign: 'justify',
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  actionsContainer: {
    marginTop: 16,
    flexDirection: 'row',
    width: '100%',
  },
  actionBtn: {
    borderWidth: 1.5,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
});
