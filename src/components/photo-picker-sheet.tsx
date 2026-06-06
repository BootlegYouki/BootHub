import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { FolderOpen, ShieldAlert } from 'lucide-react-native';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface PhotoPickerSheetProps {
  onClose: () => void;
  onAddPhotos: (uris: string[]) => void;
  triggerSelectAll?: number;
  triggerSort?: number;
  onStateChange?: (state: { isAllSelected: boolean; sortAscending: boolean }) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_MARGIN = 2;
const NUM_COLUMNS = 3;
const IMAGE_SIZE = (screenWidth - COLUMN_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

export const PhotoPickerSheet: React.FC<PhotoPickerSheetProps> = ({
  onClose,
  onAddPhotos,
  triggerSelectAll = 0,
  triggerSort = 0,
  onStateChange,
}) => {
  const { colors, isDark } = useTheme();

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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

  // Sorting state
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  const sortedPhotos = React.useMemo(() => {
    return sortAscending ? [...photos].reverse() : photos;
  }, [photos, sortAscending]);

  useEffect(() => {
    if (triggerSelectAll > 0) {
      handleToggleSelectAll();
    }
  }, [triggerSelectAll]);

  useEffect(() => {
    if (triggerSort > 0) {
      setSortAscending((prev) => !prev);
    }
  }, [triggerSort]);

  useEffect(() => {
    const isAll = photos.length > 0 && photos.every((p) => selectedUris.includes(p.uri));
    onStateChange?.({ isAllSelected: isAll, sortAscending });
  }, [photos, selectedUris, sortAscending]);

  const handleToggleSelectAll = () => {
    const allSelected = photos.length > 0 && photos.every((p) => selectedUris.includes(p.uri));
    if (allSelected) {
      setSelectedUris((prev) => prev.filter((uri) => !photos.some((p) => p.uri === uri)));
    } else {
      setSelectedUris((prev) => {
        const next = [...prev];
        photos.forEach((p) => {
          if (!next.includes(p.uri)) {
            next.push(p.uri);
          }
        });
        return next;
      });
    }
  };

  useEffect(() => {
    // Delay checking permissions and loading photos until the bottom sheet slide-in transition (250ms) completes
    const timer = setTimeout(() => {
      checkPermission(false);
    }, 210);
    return () => clearTimeout(timer);
  }, []);

  const checkPermission = async (request = false) => {
    try {
      const response = request
        ? await MediaLibrary.requestPermissionsAsync()
        : await MediaLibrary.getPermissionsAsync();

      if (!isMounted.current) return;

      const granted = response.status === 'granted';
      setHasPermission(granted);
      setIsLimited(response.accessPrivileges === 'limited');

      if (granted) {
        loadPhotos(true);
      }
    } catch (e) {
      console.warn('Failed to check/request media library permissions:', e);
      if (isMounted.current) {
        setHasPermission(false);
      }
    }
  };

  const loadPhotos = async (reset = false) => {
    if (isLoading) return;
    if (!reset && !hasNextPage) return;

    if (!isMounted.current) return;
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

      if (!isMounted.current) return;

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
      if (isMounted.current) {
        setIsLoading(false);
      }
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
        loadPhotos(true);
      } catch (e) {
        console.warn('Failed to present permissions picker:', e);
      }
    }
  };

  const renderPhotoCell = ({ item }: { item: MediaLibrary.Asset }) => {
    const isSelected = selectedUris.includes(item.uri);
    const selectIndex = selectedUris.indexOf(item.uri);

    return (
      <Pressable
        onPress={() => handleToggleSelect(item.uri)}
        style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, margin: COLUMN_MARGIN }}
      >
        <Image source={{ uri: item.uri }} style={styles.gridImage} contentFit="cover" transition={0} />
        {isSelected && (
          <>
            {/* Darkened overlay so the number is readable */}
            <View style={styles.selectedOverlay} />
            {/* Centered number badge */}
            <View style={[styles.numberBadge, { backgroundColor: colors.primary, borderColor: '#FFFFFF' }]}>
              <TuiText weight="bold" style={[styles.badgeText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                {selectIndex + 1}
              </TuiText>
            </View>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* CONTENT AREA */}
      <View style={styles.contentContainer}>
        {hasPermission === false ? (
          <View style={styles.permissionContainer}>
            <ShieldAlert size={36} color={colors.primary} style={{ marginBottom: 8 }} />
            <TuiText weight="bold" size="sm" style={styles.centerText}>
              Permission Required
            </TuiText>
            <Pressable
              onPress={() => checkPermission(true)}
              style={[
                styles.primaryActionBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <TuiText weight="bold" size="xs" style={{ color: '#000000' }}>
                Grant Permission
              </TuiText>
            </Pressable>
            <Pressable
              onPress={handleOpenSystemGallery}
              style={[styles.fallbackBtn, { borderColor: colors.primary }]}
            >
              <TuiText weight="bold" size="xs" style={{ color: colors.primary }}>
                Open System Gallery
              </TuiText>
            </Pressable>
          </View>
        ) : (hasPermission === null || (photos.length === 0 && isLoading)) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              data={sortedPhotos}
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

            {/* FLOATING ACTION BUTTON (like the Send button in Messenger) */}
            {selectedUris.length > 0 && (
              <View style={styles.floatingButtonContainer}>
                <Pressable
                  onPress={handleConfirmSelection}
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor: isDark ? '#000000' : '#FFFFFF',
                      borderColor: isDark ? '#FFFFFF' : '#000000',
                    },
                  ]}
                >
                  <TuiText
                    weight="bold"
                    style={[
                      styles.confirmBtnText,
                      { color: isDark ? '#FFFFFF' : '#000000' },
                    ]}
                  >
                    ADD {selectedUris.length} {selectedUris.length === 1 ? 'PHOTO' : 'PHOTOS'}
                  </TuiText>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryActionBtn: {
    borderWidth: 1.5,
    height: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '80%',
  },
  fallbackBtn: {
    borderWidth: 1.5,
    height: 36,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '80%',
  },
  gridContent: {
    paddingHorizontal: COLUMN_MARGIN,
    paddingTop: COLUMN_MARGIN,
    paddingBottom: 72, // Space to clear the floating button
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00000010',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadge: {
    position: 'absolute',
    // center in parent
    top: '50%',
    left: '50%',
    marginTop: -18,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    paddingTop: 5,
    paddingLeft: 1
  },
  unselectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: '#FFFFFFB0',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  gridFooterLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 35,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  confirmBtn: {
    borderWidth: 1.5,
    height: 48,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  confirmBtnText: {
    fontSize: 13,
    fontFamily: 'JetBrainsMono_700Bold',
    letterSpacing: 0.5,
  },
});
