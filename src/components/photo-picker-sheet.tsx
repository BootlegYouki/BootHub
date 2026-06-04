import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { X, FolderOpen, Image as ImageIcon, ShieldAlert } from 'lucide-react-native';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';
import { TuiContainer } from './tui-container';

interface PhotoPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPhotos: (uris: string[]) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = 480;
const COLUMN_MARGIN = 2;
const NUM_COLUMNS = 3;
const IMAGE_SIZE = (screenWidth - COLUMN_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

export const PhotoPickerSheet: React.FC<PhotoPickerSheetProps> = ({
  isOpen,
  onClose,
  onAddPhotos,
}) => {
  const { colors, isDark } = useTheme();

  // Permissions state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLimited, setIsLimited] = useState<boolean>(false);

  // Photos state
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selection state
  const [selectedUris, setSelectedUris] = useState<string[]>([]);

  // Animation values
  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    if (isOpen) {
      // Slide up
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      checkPermission(false);
    } else {
      // Slide down
      translateY.value = withSpring(SHEET_HEIGHT);
      setSelectedUris([]);
    }
  }, [isOpen]);

  const checkPermission = async (request = false) => {
    try {
      const response = request
        ? await MediaLibrary.requestPermissionsAsync()
        : await MediaLibrary.getPermissionsAsync();

      const granted = response.status === 'granted';
      setHasPermission(granted);
      setIsLimited(response.accessPrivileges === 'limited');

      if (granted) {
        loadPhotos(true);
      }
    } catch (e) {
      console.warn('Failed to check/request media library permissions:', e);
      setHasPermission(false);
    }
  };

  const loadPhotos = async (reset = false) => {
    if (isLoading) return;
    if (!reset && !hasNextPage) return;

    setIsLoading(true);
    try {
      const fetchParams: MediaLibrary.AssetsOptions = {
        first: 30,
        mediaType: 'photo',
        sortBy: ['creationTime'],
      };
      if (!reset && endCursor) {
        fetchParams.after = endCursor;
      }

      const result = await MediaLibrary.getAssetsAsync(fetchParams);

      if (reset) {
        setPhotos(result.assets);
      } else {
        setPhotos((prev) => [...prev, ...result.assets]);
      }
      setEndCursor(result.endCursor);
      setHasNextPage(result.hasNextPage);
    } catch (e) {
      console.warn('Failed to get photos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (uri: string) => {
    setSelectedUris((prev) => {
      if (prev.includes(uri)) {
        return prev.filter((u) => u !== uri);
      } else {
        return [...prev, uri];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (selectedUris.length > 0) {
      onAddPhotos(selectedUris);
      onClose();
    }
  };

  const handleOpenSystemGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((asset) => asset.uri);
        onAddPhotos(uris);
        onClose();
      }
    } catch (e) {
      console.warn('Failed to open system gallery:', e);
    }
  };

  const handleManageAccess = async () => {
    if (Platform.OS === 'ios') {
      try {
        await MediaLibrary.presentPermissionsPickerAsync();
        // Refresh the lists
        loadPhotos(true);
      } catch (e) {
        console.warn('Failed to present permissions picker:', e);
      }
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderPhotoCell = ({ item }: { item: MediaLibrary.Asset }) => {
    const isSelected = selectedUris.includes(item.uri);
    const selectIndex = selectedUris.indexOf(item.uri);

    return (
      <Pressable
        onPress={() => handleToggleSelect(item.uri)}
        style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, margin: COLUMN_MARGIN }}
      >
        <Image source={{ uri: item.uri }} style={styles.gridImage} />
        {isSelected ? (
          <View style={styles.selectedOverlay}>
            <View style={[styles.numberBadge, { backgroundColor: colors.primary }]}>
              <TuiText weight="bold" style={styles.badgeText}>
                {selectIndex + 1}
              </TuiText>
            </View>
          </View>
        ) : (
          <View style={styles.unselectedBadge} />
        )}
      </Pressable>
    );
  };

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        animatedStyle,
        {
          backgroundColor: colors.background,
          borderColor: colors.primary,
          borderTopColor: colors.primary,
        },
      ]}
    >
      {/* HEADER SECTION */}
      <View style={[styles.header, { borderBottomColor: colors.primary + '20' }]}>
        <View style={styles.dragIndicator} />
        <View style={styles.headerRow}>
          <ImageIcon size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <TuiText weight="bold" size="md" style={{ color: colors.foreground }}>
            Select Photos
          </TuiText>
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* CONTENT AREA */}
      <View style={styles.contentContainer}>
        {hasPermission === false ? (
          <View style={styles.permissionContainer}>
            <ShieldAlert size={48} color={colors.primary} style={{ marginBottom: 12 }} />
            <TuiText weight="bold" size="md" style={styles.centerText}>
              Photo Library Permission Required
            </TuiText>
            <TuiText size="sm" style={[styles.centerText, { color: colors.mutedForeground }]}>
              Allow BootHub to access your photo library in settings, or use the fallback system file picker.
            </TuiText>

            <Pressable
              onPress={() => checkPermission(true)}
              style={[
                styles.primaryActionBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <TuiText weight="bold" style={{ color: '#000000' }}>
                Grant Permission
              </TuiText>
            </Pressable>

            <Pressable
              onPress={handleOpenSystemGallery}
              style={[styles.fallbackBtn, { borderColor: colors.primary }]}
            >
              <FolderOpen size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <TuiText weight="bold" style={{ color: colors.primary }}>
                Open System Gallery
              </TuiText>
            </Pressable>
          </View>
        ) : hasPermission === null ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhotoCell}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            onEndReached={() => loadPhotos(false)}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.gridContent}
            ListFooterComponent={
              isLoading ? (
                <View style={styles.gridFooterLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* BOTTOM ACTION BAR */}
      <View
        style={[
          styles.sheetFooter,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.primary + '30',
            paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          },
        ]}
      >
        {selectedUris.length > 0 ? (
          <Pressable
            onPress={handleConfirmSelection}
            style={[styles.confirmBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <TuiText weight="bold" style={styles.confirmBtnText}>
              ADD {selectedUris.length} {selectedUris.length === 1 ? 'PHOTO' : 'PHOTOS'}
            </TuiText>
          </Pressable>
        ) : (
          <View style={styles.footerRow}>
            {isLimited && (
              <Pressable
                onPress={handleManageAccess}
                style={[styles.secondaryBtn, { borderColor: colors.primary, marginRight: 8 }]}
              >
                <TuiText weight="bold" size="sm" style={{ color: colors.primary }}>
                  Manage Access
                </TuiText>
              </Pressable>
            )}
            <Pressable
              onPress={handleOpenSystemGallery}
              style={[styles.secondaryBtn, { borderColor: colors.primary, flex: 1 }]}
            >
              <FolderOpen size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <TuiText weight="bold" size="sm" style={{ color: colors.primary }}>
                Open System Gallery
              </TuiText>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 1000,
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  header: {
    height: 48,
    borderBottomWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#88888840',
    marginTop: 6,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
    marginBottom: 10,
  },
  primaryActionBtn: {
    borderWidth: 1.5,
    height: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    width: '80%',
  },
  fallbackBtn: {
    borderWidth: 1.5,
    height: 40,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexDirection: 'row',
    width: '80%',
  },
  gridContent: {
    paddingHorizontal: COLUMN_MARGIN,
    paddingTop: COLUMN_MARGIN,
    paddingBottom: 72, // Space to scroll past sticky footer
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00000010',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  badgeText: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 14,
  },
  unselectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFFB0',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  gridFooterLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirmBtn: {
    borderWidth: 1.5,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  confirmBtnText: {
    color: '#000000',
    fontSize: 14,
    letterSpacing: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
});
