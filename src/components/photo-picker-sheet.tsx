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
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { FolderOpen, ShieldAlert, Search } from 'lucide-react-native';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface PhotoPickerSheetProps {
  onClose: () => void;
  onAddPhotos: (uris: string[]) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_MARGIN = 2;
const NUM_COLUMNS = 3;
const IMAGE_SIZE = (screenWidth - COLUMN_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

export const PhotoPickerSheet: React.FC<PhotoPickerSheetProps> = ({
  onClose,
  onAddPhotos,
}) => {
  const { colors } = useTheme();

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

  useEffect(() => {
    checkPermission(false);
  }, []);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* MESSENGER-STYLE SUB-HEADER */}
      <View style={[styles.subHeader, { borderBottomColor: colors.primary + '20' }]}>
        <Search size={16} color={colors.mutedForeground} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TuiText weight="bold" size="sm" style={{ color: colors.foreground }}>
            Recents ▾
          </TuiText>
        </View>
        {isLimited ? (
          <Pressable onPress={handleManageAccess}>
            <TuiText weight="bold" size="xs" style={{ color: colors.primary }}>
              Manage
            </TuiText>
          </Pressable>
        ) : (
          <Pressable onPress={handleOpenSystemGallery}>
            <FolderOpen size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>

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
        ) : hasPermission === null ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
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

            {/* FLOATING ACTION BUTTON (like the Send button in Messenger) */}
            {selectedUris.length > 0 && (
              <View style={styles.floatingButtonContainer}>
                <Pressable
                  onPress={handleConfirmSelection}
                  style={[styles.confirmBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <TuiText weight="bold" style={styles.confirmBtnText}>
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
  subHeader: {
    height: 40,
    borderBottomWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    paddingBottom: 64, // Space to clear the floating button
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    lineHeight: 12,
  },
  unselectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
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
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  confirmBtn: {
    borderWidth: 1.5,
    height: 40,
    borderRadius: 20, // Circular border like Messenger's floating button
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  confirmBtnText: {
    color: '#000000',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
