import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  AppState,
  Keyboard,
  Share,
  Alert,
  FlatList,
  PanResponder,
  Dimensions,
  Image as RNImage,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  withTiming,
  runOnJS,
  withDelay,
} from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Inbox,
  Archive,
  Sun,
  Moon,
  Link2,
  FileText,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Trash2,
  Check,
  Share2,
  ListChecks,
  ArrowLeft,
  Copy,
  Pencil,
  X,
  Paperclip,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import RNShare from 'react-native-share';

import { ThemeProvider, useTheme } from './src/theme/theme-provider';
import { TuiHeader } from './src/components/tui-header';
import { TuiText } from './src/components/tui-text';
import { TuiContainer } from './src/components/tui-container';
import { getItems, deleteItem, addItem, updateItem, addMultiplePhotos, DumpItem, DumpType } from './src/utils/storage';
import { ensureFileUri, getActualType, formatBytes, extractAudioArtwork } from './src/utils/helpers';
import { LinksScreen } from './src/screens/LinksScreen';
import { TextsScreen } from './src/screens/TextsScreen';
import { PhotosScreen, PhotoLayout } from './src/screens/PhotosScreen';
import { FilesScreen, getFileIcon, getFileTypeLabel } from './src/screens/FilesScreen';
import { PhotoPickerSheet } from './src/components/photo-picker-sheet';
import { LinkPreview, previewCache } from './src/components/link-preview';

// ─── Tab Button ──────────────────────────────────────────────────────────────

interface TabButtonProps {
  isActive: boolean;
  onPress: () => void;
  label: string;
  Icon: React.ComponentType<any>;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onPress, label, Icon }) => {
  const { colors, isDark } = useTheme();
  const [buttonWidth, setButtonWidth] = useState(0);
  const [legendWidth, setLegendWidth] = useState(0);

  const borderAccent = colors.primary;
  const topSegmentWidth = Math.max(0, (buttonWidth - legendWidth) / 2);

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
      style={[
        styles.tabSquare,
        { backgroundColor: isActive ? (isDark ? '#27272A' : '#E4E4E7') : colors.card },
      ]}
    >
      <View style={[styles.borderLeft, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderRight, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderBottom, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderTopLeft, { backgroundColor: borderAccent, width: topSegmentWidth }]} />
      <View style={[styles.borderTopRight, { backgroundColor: borderAccent, width: topSegmentWidth }]} />

      <View
        onLayout={(e) => setLegendWidth(e.nativeEvent.layout.width)}
        style={styles.legendWrapper}
      >
        <TuiText
          weight="bold"
          style={[styles.legendText, { color: isActive ? colors.primary : colors.mutedForeground }]}
        >
          {label}
        </TuiText>
      </View>

      <View style={styles.tabContent} pointerEvents="none">
        <Icon size={24} color={isActive ? colors.primary : colors.mutedForeground} />
      </View>
    </Pressable>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

function MainApp() {
  const { colors, isDark, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DumpType>('link');
  const [items, setItems] = useState<DumpItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [contextMenuPhoto, setContextMenuPhoto] = useState<{ item: DumpItem; bounds: PhotoLayout } | null>(null);
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState<boolean>(false);
  const [isSwipingDown, setIsSwipingDown] = useState<boolean>(false);
  const [photoSheetState, setPhotoSheetState] = useState({ isAllSelected: false, sortAscending: false });
  const [photoSheetTriggerSelectAll, setPhotoSheetTriggerSelectAll] = useState(0);
  const [photoSheetTriggerSort, setPhotoSheetTriggerSort] = useState(0);
  const photoSheetHeight = useSharedValue(0);
  const [activeFullscreenPhotoIndex, setActiveFullscreenPhotoIndex] = useState<number | null>(null);

  const [imageSizes, setImageSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [isZooming, setIsZooming] = useState<'in' | 'out' | null>(null);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startWidth = useSharedValue(0);
  const startHeight = useSharedValue(0);

  const endX = useSharedValue(0);
  const endY = useSharedValue(0);
  const endWidth = useSharedValue(0);
  const endHeight = useSharedValue(0);

  const animationProgress = useSharedValue(0);
  // 0 = idle/open, 1 = zooming-in, 2 = zooming-out
  // This is a shared value (UI-thread-synchronous) so useAnimatedStyle never
  // reads a stale JS-state snapshot on the first frame.
  const zoomPhase = useSharedValue(0);
  // Separate opacity for the header/footer controls so they can fade in
  // independently after the zoom completes, not during it.
  const controlsOpacity = useSharedValue(0);
  const isHoldingPhoto = useSharedValue(0);
  const barBackgroundOpacity = useSharedValue(1);
  // Tracks whether controls are currently visible (toggled by tapping the photo)
  const controlsVisible = useRef<boolean>(true);
  const measurePhotoRef = useRef<
    ((id: string, callback: (bounds: PhotoLayout | null) => void) => void) | null
  >(null);

  // Pre-fetch image sizes in background
  useEffect(() => {
    const photos = items.filter((item) => item.type === 'photo');
    photos.forEach((photo) => {
      if (!imageSizes[photo.id]) {
        RNImage.getSize(
          ensureFileUri(photo.value),
          (width: number, height: number) => {
            setImageSizes((prev) => {
              if (prev[photo.id]) return prev;
              return { ...prev, [photo.id]: { width, height } };
            });
          },
          (error: any) => {
            console.warn(`Failed to get size for photo ${photo.id}:`, error);
          }
        );
      }
    });
  }, [items]);

  const calculateFullscreenImageBounds = (item: DumpItem): PhotoLayout => {
    const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
    const size = imageSizes[item.id];
    const r = size ? size.width / size.height : 1.0;
    const screenAspectRatio = windowWidth / windowHeight;

    let targetWidth, targetHeight, targetLeft, targetTop;

    if (r > screenAspectRatio) {
      targetWidth = windowWidth;
      targetHeight = windowWidth / r;
      targetLeft = 0;
      targetTop = (windowHeight - targetHeight) / 2;
    } else {
      targetHeight = windowHeight;
      targetWidth = windowHeight * r;
      targetLeft = (windowWidth - targetWidth) / 2;
      targetTop = 0;
    }

    return {
      x: targetLeft,
      y: targetTop,
      width: targetWidth,
      height: targetHeight,
    };
  };

  // ─── Per-tab items (each tab filters independently so all tabs stay live) ────
  const TAB_ORDER: DumpType[] = ['link', 'text', 'photo', 'file'];

  const linkItems = items
    .filter((item) => getActualType(item.value, item.type) === 'link')
    .map((item) => item.id === editingItemId ? { ...item, value: editText } : item);
  const textItems = items
    .filter((item) => getActualType(item.value, item.type) === 'text')
    .map((item) => item.id === editingItemId ? { ...item, value: editText } : item);
  const photoItems = items.filter((item) => getActualType(item.value, item.type) === 'photo');
  const fileItems = items
    .filter((item) => getActualType(item.value, item.type) === 'file')
    .map((item) => item.id === editingItemId ? { ...item, value: editText } : item);

  const sortedLinkItems = sortAscending ? [...linkItems].reverse() : linkItems;
  const sortedTextItems = sortAscending ? [...textItems].reverse() : textItems;
  const sortedPhotoItems = sortAscending ? [...photoItems].reverse() : photoItems;
  const sortedFileItems = sortAscending ? [...fileItems].reverse() : fileItems;

  // Keep legacy `sortedItems` pointing at the active tab so existing downstream
  // code (select-all, section count, etc.) doesn't need to change.
  const filteredItems = items
    .filter((item) => getActualType(item.value, item.type) === activeTab)
    .map((item) => item.id === editingItemId ? { ...item, value: editText } : item);
  const sortedItems = sortAscending ? [...filteredItems].reverse() : filteredItems;

  // ─── Tab pager refs ───────────────────────────────────────────────────────────
  const tabPagerRef = useRef<ScrollView>(null);
  const isTabScrollingRef = useRef<boolean>(false);

  const scrollToTab = (tab: DumpType, animated = true) => {
    const index = TAB_ORDER.indexOf(tab);
    if (index === -1) return;
    tabPagerRef.current?.scrollTo({ x: index * windowWidth, y: 0, animated });
  };

  const switchTab = (tab: DumpType) => {
    setActiveTab(tab);
    scrollToTab(tab);
  };


  const activeFullscreenPhoto =
    activeFullscreenPhotoIndex !== null && activeFullscreenPhotoIndex >= 0 && activeFullscreenPhotoIndex < sortedItems.length
      ? sortedItems[activeFullscreenPhotoIndex]
      : null;

  const handleToggleSelectAll = () => {
    if (sortedItems.length === 0) return;
    const allSelected = sortedItems.every((item) => selectedIds.has(item.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        sortedItems.forEach((item) => next.delete(item.id));
      } else {
        sortedItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  useEffect(() => {
    if (isPhotoSheetOpen) {
      photoSheetHeight.value = withTiming(360, { duration: 250 });
    } else {
      photoSheetHeight.value = withTiming(0, { duration: 200 });
    }
  }, [isPhotoSheetOpen]);

  // Per-frame keyboard height — updated every native animation frame via JSI.
  // This is the "fake spacer" approach: the Animated.View at the bottom of the
  // screen grows to match the keyboard height, squeezing SafeAreaView upward
  // in perfect sync with the keyboard animation.
  const keyboard = useAnimatedKeyboard();

  const bottomSpacerStyle = useAnimatedStyle(() => {
    const height = Math.max(keyboard.height.value, photoSheetHeight.value);
    return {
      height: height,
    };
  });

  const animatedBottomBarStyle = useAnimatedStyle(() => {
    const targetPadding = insets.bottom > 0 ? insets.bottom : 12;
    const totalHeight = Math.max(keyboard.height.value, photoSheetHeight.value);
    const padding = interpolate(
      totalHeight,
      [0, 50],
      [targetPadding + 8, 12],
      'clamp'
    );

    return {
      paddingBottom: padding,
    };
  });


  // Reset selection when tab changes
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setActiveFullscreenPhotoIndex(null);
    setEditingItemId(null);
  }, [activeTab]);

  // Sync pager position on mount (no animation so it doesn't flash)
  useEffect(() => {
    const index = ['link', 'text', 'photo'].indexOf(activeTab);
    if (index > 0) {
      tabPagerRef.current?.scrollTo({ x: index * windowWidth, y: 0, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Clear selected IDs when leaving selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedIds(new Set());
    } else {
      setActiveFullscreenPhotoIndex(null);
    }
  }, [isSelectionMode]);

  // Dismiss keyboard when app backgrounds
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        Keyboard.dismiss();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resolveToLocalFileUri = async (uri: string): Promise<string> => {
    let fileUri = uri;

    if (fileUri.startsWith('ph://')) {
      const assetId = fileUri.slice(5);
      const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
      if (assetInfo && assetInfo.localUri) {
        fileUri = assetInfo.localUri;
      } else {
        throw new Error('Could not resolve local path for photo library asset.');
      }
    }

    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      const filename = fileUri.split('/').pop()?.split('?')[0] || 'temp_image.jpg';
      const tempFileUri = `${FileSystem.cacheDirectory}${Date.now()}_${filename}`;
      const downloadResult = await FileSystem.downloadAsync(fileUri, tempFileUri);
      fileUri = downloadResult.uri;
    }

    return ensureFileUri(fileUri);
  };

  const handleCopyItem = async (item: DumpItem) => {
    try {
      if (item.type === 'photo') {
        const resolvedUri = await resolveToLocalFileUri(item.value);
        const base64 = await FileSystem.readAsStringAsync(resolvedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Clipboard.setImageAsync(base64);
      } else if (item.type === 'file') {
        let name = item.value;
        try {
          name = JSON.parse(item.value).name;
        } catch {}
        await Clipboard.setStringAsync(name);
      } else {
        await Clipboard.setStringAsync(item.value);
      }
      setContextMenuPhoto(null);
    } catch (e: any) {
      console.error('Failed to copy item:', e);
      Alert.alert('Copy Error', e?.message || String(e));
    }
  };

  const handleShareItem = async (item: DumpItem) => {
    try {
      if (item.type === 'photo') {
        const resolvedUri = await resolveToLocalFileUri(item.value);
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(ensureFileUri(resolvedUri));
        } else {
          await Share.share({ message: item.value });
        }
      } else if (item.type === 'file') {
        try {
          const fileObj = JSON.parse(item.value);
          const fileUri = ensureFileUri(fileObj.uri);
          const isSharingAvailable = await Sharing.isAvailableAsync();
          if (isSharingAvailable && fileUri) {
            await Sharing.shareAsync(fileUri);
          } else if (fileUri) {
            await RNShare.open({ url: fileUri });
          } else {
            Alert.alert('Share Error', 'Sharing is not available for this file.');
          }
        } catch (e: any) {
          const isCancelError = /user did not share|cancel|dismiss/i.test(e?.message || String(e));
          if (!isCancelError) {
            Alert.alert('Share Error', e?.message || String(e));
          }
        }
      } else if (item.type === 'link') {
        // Use the `url` field so apps like Messenger receive a real URL, not just text
        await Share.share({ url: item.value, message: item.value });
      } else {
        await Share.share({ message: item.value });
      }
      setContextMenuPhoto(null);
    } catch (e: any) {
      const isCancelError = /user did not share|cancel|dismiss/i.test(e?.message || String(e));
      if (!isCancelError) {
        console.error('Sharing failed:', e);
        Alert.alert('Share Error', e?.message || String(e));
      }
    }
  };

  const handleDeleteItem = async (item: DumpItem) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.type === 'file') {
                try {
                  const fileObj = JSON.parse(item.value);
                  if (fileObj.uri && fileObj.uri.startsWith('file://')) {
                    await FileSystem.deleteAsync(fileObj.uri, { idempotent: true });
                  }
                } catch (err) {
                  console.warn('Failed to delete file from disk:', err);
                }
              }
              const updatedList = await deleteItem(item.id);
              setItems(updatedList);
              setContextMenuPhoto(null);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  const handleBulkShare = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((item) => selectedIds.has(item.id));

    try {
      // 1. Separate file/photo paths from text/link items
      const fileUris: string[] = [];
      const links = selectedItems.filter((item) => item.type === 'link');
      const texts = selectedItems.filter((item) => item.type === 'text');

      for (const item of selectedItems) {
        if (item.type === 'file') {
          try {
            const fileObj = JSON.parse(item.value);
            if (fileObj.uri) {
              fileUris.push(ensureFileUri(fileObj.uri));
            }
          } catch (err) {
            console.warn('Failed to parse file object value:', err);
          }
        } else if (item.type === 'photo') {
          const resolvedUri = await resolveToLocalFileUri(item.value);
          fileUris.push(ensureFileUri(resolvedUri));
        }
      }

      // 2. If we have any file/photo URIs, share them as actual files
      if (fileUris.length > 0) {
        if (fileUris.length === 1) {
          const isSharingAvailable = await Sharing.isAvailableAsync();
          if (isSharingAvailable) {
            await Sharing.shareAsync(fileUris[0]);
          } else {
            await RNShare.open({ url: fileUris[0] });
          }
        } else {
          // Share multiple files
          await RNShare.open({ urls: fileUris });
        }
      } else {
        // For links: always pass the `url` field so Messenger and other apps receive
        // a real URL object (not just plain text). Pass all links as message too.
        const shareMessage = selectedItems.map((item) => item.value).join('\n');
        const firstLink = links[0]?.value;

        if (links.length === 1 && texts.length === 0) {
          // Single link — cleanest share: just url + message identical
          await Share.share({ url: firstLink, message: firstLink });
        } else if (firstLink) {
          // Multiple items including at least one link
          await Share.share({ url: firstLink, message: shareMessage });
        } else {
          // Pure text items
          await Share.share({ message: shareMessage });
        }
      }

      // Deselect items and exit selection mode after triggering share
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (e: any) {
      // Clean up selection state even if user cancels out of the share dialog
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      const isCancelError = /user did not share|cancel|dismiss/i.test(e?.message || String(e));
      if (isCancelError) return;
      console.error('Sharing failed:', e);
      Alert.alert('Share Error', e?.message || String(e));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${count === 1 ? 'this item' : `these ${count} items`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              let updatedList = items;
              for (const id of selectedIds) {
                const itemObj = items.find((x) => x.id === id);
                if (itemObj && itemObj.type === 'file') {
                  try {
                    const fileObj = JSON.parse(itemObj.value);
                    if (fileObj.uri && fileObj.uri.startsWith('file://')) {
                      await FileSystem.deleteAsync(fileObj.uri, { idempotent: true });
                    }
                  } catch (err) {
                    console.warn('Failed to delete bulk file from disk:', err);
                  }
                }
                updatedList = await deleteItem(id);
              }
              setItems(updatedList);
              setSelectedIds(new Set());
              setIsSelectionMode(false);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  const handleShareActivePhoto = async () => {
    if (!activeFullscreenPhoto) return;
    try {
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(ensureFileUri(activeFullscreenPhoto.value));
      } else {
        await Share.share({ message: activeFullscreenPhoto.value });
      }
    } catch (e: any) {
      const isCancelError = /user did not share|cancel|dismiss/i.test(e?.message || String(e));
      if (isCancelError) return;
      console.error('Sharing failed:', e);
      Alert.alert('Share Error', e?.message || String(e));
    }
  };

  const handleDeleteActivePhoto = async () => {
    if (!activeFullscreenPhoto) return;
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const idToDelete = activeFullscreenPhoto.id;
              const updatedList = await deleteItem(idToDelete);
              setItems(updatedList);
              setActiveFullscreenPhotoIndex(null);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const translateY = useSharedValue(0);

  const latestStateRef = useRef({
    activeFullscreenPhotoIndex,
    activeFullscreenPhoto,
    handleCloseFullscreen: () => { },
  });

  const handlePhotoPress = (item: DumpItem, startBounds: PhotoLayout) => {
    const endBounds = calculateFullscreenImageBounds(item);

    startX.value = startBounds.x;
    startY.value = startBounds.y;
    startWidth.value = startBounds.width;
    startHeight.value = startBounds.height;

    endX.value = endBounds.x;
    endY.value = endBounds.y;
    endWidth.value = endBounds.width;
    endHeight.value = endBounds.height;

    // Reset synchronously on the UI thread — zoomPhase=1 means "zooming in".
    // This MUST happen before React mounts the overlay so the first frame
    // never sees zoomPhase=0 (idle) with opacity=1.
    animationProgress.value = 0;
    controlsOpacity.value = 0;
    controlsVisible.current = true;
    zoomPhase.value = 1;
    barBackgroundOpacity.value = 1;

    setIsZooming('in');
    const index = sortedItems.findIndex((x) => x.id === item.id);
    if (index !== -1) {
      setActiveFullscreenPhotoIndex(index);
    }
  };

  const handleCloseFullscreen = () => {
    if (activeFullscreenPhotoIndex === null || !activeFullscreenPhoto) return;

    const item = activeFullscreenPhoto;

    if (measurePhotoRef.current) {
      measurePhotoRef.current(item.id, (gridBounds) => {
        const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
        const fallbackBounds = {
          x: windowWidth / 2 - 50,
          y: windowHeight / 2 - 50,
          width: 100,
          height: 100,
        };

        const targetBounds = gridBounds || fallbackBounds;
        const currentBounds = calculateFullscreenImageBounds(item);

        const currentYOffset = translateY.value;
        startX.value = targetBounds.x;
        startY.value = targetBounds.y;
        startWidth.value = targetBounds.width;
        startHeight.value = targetBounds.height;

        endX.value = currentBounds.x;
        endY.value = currentBounds.y + currentYOffset;
        endWidth.value = currentBounds.width;
        endHeight.value = currentBounds.height;

        setIsZooming('out');
        zoomPhase.value = 2;
        // Snap controls invisible immediately before zoom-out plays
        controlsOpacity.value = 0;
        animationProgress.value = 1;
        animationProgress.value = withTiming(0, { duration: 250 }, () => {
          // Do NOT reset zoomPhase here — it fires on the UI thread while the
          // overlay is still mounted. Resetting to 0 would make controls flash
          // for 1-2 frames before React unmounts the overlay.
          // zoomPhase resets to 0 in the useEffect below once unmounted.
          runOnJS(setActiveFullscreenPhotoIndex)(null);
          runOnJS(setIsZooming)(null);
          translateY.value = 0;
        });
      });
    } else {
      setActiveFullscreenPhotoIndex(null);
      translateY.value = 0;
    }
  };

  // Trigger zoom-in animation only after the fullscreen overlay has mounted
  useEffect(() => {
    if (isZooming === 'in') {
      animationProgress.value = 0;
      controlsOpacity.value = 0;
      // requestAnimationFrame ensures the native view has rendered and is ready
      requestAnimationFrame(() => {
        animationProgress.value = withTiming(1, { duration: 250 }, () => {
          zoomPhase.value = 0;
          runOnJS(setIsZooming)(null);
          // Fade controls in after zoom fully completes
          controlsOpacity.value = withTiming(1, { duration: 120 });
        });
      });
    }
  }, [isZooming]);

  // Reset zoomPhase after the overlay has fully unmounted.
  // This must happen here (JS thread, post-render) not in the animation callback
  // (UI thread, pre-unmount) to avoid a 1-2 frame controls flash.
  useEffect(() => {
    if (activeFullscreenPhotoIndex === null) {
      zoomPhase.value = 0;
    }
  }, [activeFullscreenPhotoIndex]);

  useEffect(() => {
    latestStateRef.current = {
      activeFullscreenPhotoIndex,
      activeFullscreenPhoto,
      handleCloseFullscreen,
    };
  }, [activeFullscreenPhotoIndex, activeFullscreenPhoto, handleCloseFullscreen]);

  const touchInitiallyHorizontalRef = useRef<boolean>(false);
  const touchInitiallyVerticalRef = useRef<boolean>(false);
  const currentScrollX = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);

  useEffect(() => {
    if (activeFullscreenPhotoIndex !== null) {
      currentScrollX.current = activeFullscreenPhotoIndex * windowWidth;
    }
  }, [activeFullscreenPhotoIndex]);

  const shouldSetPanResponder = (gestureState: any) => {
    // If the flat list is actively scrolling or being dragged horizontally,
    // lock to horizontal immediately so it doesn't get interrupted.
    if (isScrollingRef.current) {
      touchInitiallyHorizontalRef.current = true;
      touchInitiallyVerticalRef.current = false;
      return false;
    }

    const offsetFromPage = currentScrollX.current % windowWidth;
    const isMidScroll = Math.abs(offsetFromPage) > 2 && Math.abs(offsetFromPage) < windowWidth - 2;

    if (isMidScroll) {
      touchInitiallyHorizontalRef.current = true;
      touchInitiallyVerticalRef.current = false;
      return false;
    }

    const absX = Math.abs(gestureState.dx);
    const absY = Math.abs(gestureState.dy);

    // Determine dominant direction:
    // 1. Eagerly lock to horizontal if we see even a small horizontal drag (5px).
    // 2. Lock to vertical only if we see a more significant vertical drag (20px).
    if (!touchInitiallyHorizontalRef.current && !touchInitiallyVerticalRef.current) {
      if (absX > 5) {
        touchInitiallyHorizontalRef.current = true;
      } else if (absY > 20) {
        touchInitiallyVerticalRef.current = true;
      }
    }

    if (touchInitiallyHorizontalRef.current) {
      return false;
    }

    if (touchInitiallyVerticalRef.current) {
      // Capture only if swiping down (to dismiss) with at least 15px downward drag.
      // If they swipe up, we are still vertically locked (so they can't horizontal page),
      // but we return false so we don't start the dismiss animation.
      return gestureState.dy > 15;
    }

    return false;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
        return false;
      },
      onStartShouldSetPanResponderCapture: () => {
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
        return false;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return shouldSetPanResponder(gestureState);
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return shouldSetPanResponder(gestureState);
      },
      onPanResponderGrant: () => {
        setIsSwipingDown(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 120) {
          latestStateRef.current.handleCloseFullscreen();
        } else {
          translateY.value = withTiming(0, { duration: 200 });
        }
        setIsSwipingDown(false);
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
      },
      onPanResponderTerminate: () => {
        translateY.value = withTiming(0, { duration: 200 });
        setIsSwipingDown(false);
        touchInitiallyHorizontalRef.current = false;
        touchInitiallyVerticalRef.current = false;
      },
    })
  ).current;

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: isZooming ? 0 : translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    // Use zoomPhase (shared value, UI-thread-synchronous) so the first frame
    // is never stale. 0 = idle/open, 1 = zooming-in, 2 = zooming-out.
    if (zoomPhase.value === 2) {
      return { opacity: 0 };
    }
    if (zoomPhase.value === 1) {
      return { opacity: animationProgress.value };
    }
    return {
      opacity: interpolate(translateY.value, [0, 120], [1, 0], 'clamp'),
    };
  });

  const controlsStyle = useAnimatedStyle(() => {
    // While zooming in or out, keep controls fully hidden
    if (zoomPhase.value === 1 || zoomPhase.value === 2) {
      return { opacity: 0 };
    }
    // Fully open: fade-in opacity attenuated by drag-dismiss
    const baseOpacity = interpolate(translateY.value, [0, 100], [1, 0], 'clamp');
    return {
      opacity: controlsOpacity.value * baseOpacity,
    };
  });

  const barBgStyle = useAnimatedStyle(() => {
    return {
      opacity: barBackgroundOpacity.value,
    };
  });

  const animatedTransitionStyle = useAnimatedStyle(() => {
    const left = interpolate(
      animationProgress.value,
      [0, 1],
      [startX.value, endX.value]
    );
    const top = interpolate(
      animationProgress.value,
      [0, 1],
      [startY.value, endY.value]
    );
    const width = interpolate(
      animationProgress.value,
      [0, 1],
      [startWidth.value, endWidth.value]
    );
    const height = interpolate(
      animationProgress.value,
      [0, 1],
      [startHeight.value, endHeight.value]
    );

    const borderWidth = interpolate(animationProgress.value, [0, 1], [1.5, 0]);
    const padding = interpolate(animationProgress.value, [0, 1], [6, 0]);

    const opacity = isZooming ? 1 : 0;

    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      borderWidth,
      padding,
      borderColor: colors.primary + (isDark ? '40' : '26'),
      backgroundColor: 'transparent',
      overflow: 'hidden',
      opacity,
    };
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getItems();
      setItems(data);
    } catch (e) {
      console.error('Failed to refresh items:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      const data = await getItems();
      setItems(data);
    };
    loadItems();
  }, []);

  const [inputText, setInputText] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const editInputRef = useRef<TextInput>(null);

  const [toast, setToast] = useState<{ label: string; caption: string } | null>(null);
  const toastOpacity = useSharedValue(0);
  const toastTranslateY = useSharedValue(-20);

  const showToast = (label: string, caption: string) => {
    setToast({ label, caption });
    toastOpacity.value = 0;
    toastTranslateY.value = -20;

    toastOpacity.value = withTiming(1, { duration: 250 }, () => {
      toastOpacity.value = withDelay(
        2000,
        withTiming(0, { duration: 250 }, (fin) => {
          if (fin) {
            runOnJS(setToast)(null);
          }
        })
      );
    });
    toastTranslateY.value = withTiming(0, { duration: 250 }, () => {
      toastTranslateY.value = withDelay(
        2000,
        withTiming(-20, { duration: 250 })
      );
    });
  };

  const animatedToastStyle = useAnimatedStyle(() => {
    return {
      opacity: toastOpacity.value,
      transform: [{ translateY: toastTranslateY.value }],
    };
  });

  useEffect(() => {
    if (editingItemId !== null) {
      const timer = setTimeout(() => {
        editInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      Keyboard.dismiss();
    }
  }, [editingItemId]);

  const handleEditItem = (item: DumpItem) => {
    setContextMenuPhoto(null);
    setEditingItemId(item.id);
    if (item.type === 'file') {
      try {
        const fileObj = JSON.parse(item.value);
        setEditText(fileObj.name || 'File');
      } catch {
        setEditText(item.value);
      }
    } else {
      setEditText(item.value);
    }
  };

  const handleSaveEdit = async (id: string, value: string) => {
    Keyboard.dismiss();
    if (!value) return;
    try {
      const updated = await updateItem(id, value);
      setItems(updated);
      showToast('Edited!', value);
    } catch (e) {
      console.error('Failed to save edit:', e);
    } finally {
      setEditingItemId(null);
    }
  };

  const handleCancelEdit = () => {
    Keyboard.dismiss();
    setEditingItemId(null);
  };

  const handlePickImage = () => {
    setActiveFullscreenPhotoIndex(null);
    if (isPhotoSheetOpen) {
      setIsPhotoSheetOpen(false);
    } else {
      Keyboard.dismiss();
      setIsPhotoSheetOpen(true);
    }
  };

  const handlePickFile = async () => {
    try {
      setActiveFullscreenPhotoIndex(null);
      setIsPhotoSheetOpen(false);
      Keyboard.dismiss();

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const destinationUri = `${FileSystem.documentDirectory}${Date.now()}_${asset.name}`;
      await FileSystem.copyAsync({
        from: asset.uri,
        to: destinationUri,
      });

      // Extract album cover / artwork if it's an audio file
      let artwork: string | null = null;
      const isAudio = /\.(mp3|m4a|wav|flac|ogg)$/i.test(asset.name);
      if (isAudio) {
        artwork = await extractAudioArtwork(destinationUri);
      }

      const fileData: any = {
        uri: destinationUri,
        name: asset.name,
        size: asset.size || 0,
        mimeType: asset.mimeType || '',
      };

      if (artwork) {
        fileData.artwork = artwork;
      }

      const updated = await addItem('file', JSON.stringify(fileData));
      setItems(updated);
      setActiveTab('file');
      scrollToTab('file');
      showToast('Added!', asset.name);
    } catch (e) {
      console.error('Failed to pick file:', e);
      Alert.alert('File Pick Error', 'An error occurred while picking or saving the file.');
    }
  };

  const handleAddMultiplePhotos = async (uris: string[]) => {
    try {
      const updated = await addMultiplePhotos(uris);
      setItems(updated);
      setActiveTab('photo');
      scrollToTab('photo');
      showToast('Added!', `${uris.length} photo${uris.length > 1 ? 's' : ''}`);
    } catch (e) {
      console.error('Failed to add multiple photos:', e);
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    const type = getActualType(trimmed, 'text');

    try {
      const updated = await addItem(type, trimmed);
      setItems(updated);
      setActiveTab(type);
      scrollToTab(type);
      setInputText('');
      showToast('Added!', trimmed);
    } catch (e) {
      console.error('Failed to submit item:', e);
    }
  };

  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });

  if (!fontsLoaded) {
    return <View style={[styles.loaderContainer, { backgroundColor: '#18181B' }]} />;
  }

  const toggleTheme = () => {
    setEditingItemId(null);
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const dynamicSubtitle = activeTab === 'photo' ? 'photos' : activeTab + 's';
  const capitalizedTitle = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + 's';

  const themeToggle = (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.themeToggleBtn,
        {
          borderColor: colors.primary,
          backgroundColor: pressed ? colors.primary + '25' : 'transparent',
        },
      ]}
    >
      {isDark ? (
        <Sun size={16} color={colors.primary} />
      ) : (
        <Moon size={16} color={colors.primary} />
      )}
    </Pressable>
  );

  return (
    // No KeyboardAvoidingView — the Animated.View spacer below handles it
    // natively via Reanimated's useAnimatedKeyboard shared value.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colors.background }
        ]}
        edges={['top']}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* 01: HEADER */}
        <TuiHeader
          title="BootHub"
          subtitle="by BootlegYouki"
          Icon={Archive}
          rightElement={themeToggle}
        />

        {/* 02: TABS */}
        <View style={styles.topContainer}>
          <View style={styles.navRow}>
            <TabButton isActive={activeTab === 'link'} onPress={() => switchTab('link')} label="Links" Icon={Link2} />
            <TabButton isActive={activeTab === 'text'} onPress={() => switchTab('text')} label="Texts" Icon={FileText} />
            <TabButton isActive={activeTab === 'photo'} onPress={() => switchTab('photo')} label="Photos" Icon={ImageIcon} />
            <TabButton isActive={activeTab === 'file'} onPress={() => switchTab('file')} label="Files" Icon={Paperclip} />
          </View>

          {/* Section header row */}
          <View style={styles.sectionHeaderRow}>
            <TuiText size="lg" weight="bold" style={[styles.sectionTitle, { color: colors.primary }]}>
              {capitalizedTitle} : {sortedItems.length}
            </TuiText>
            <View style={styles.headerActions}>
              {isSelectionMode && (
                <Pressable
                  onPress={handleToggleSelectAll}
                  style={({ pressed }) => {
                    const allSelected = sortedItems.length > 0 && sortedItems.every((item) => selectedIds.has(item.id));
                    return [
                      styles.headerActionBtn,
                      {
                        borderColor: colors.primary,
                        backgroundColor: allSelected
                          ? colors.primary + '25'
                          : pressed
                            ? colors.primary + '15'
                            : 'transparent',
                        marginRight: 8,
                      },
                    ];
                  }}
                >
                  <ListChecks size={16} color={colors.primary} />
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  setEditingItemId(null);
                  const nextMode = !isSelectionMode;
                  setIsSelectionMode(nextMode);
                  if (!nextMode) setSelectedIds(new Set());
                }}
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: isSelectionMode
                      ? colors.primary + '25'
                      : pressed
                        ? colors.primary + '15'
                        : 'transparent',
                    marginRight: 8,
                  },
                ]}
              >
                <CheckSquare size={16} color={colors.primary} />
              </Pressable>

              <Pressable
                onPress={() => {
                  setEditingItemId(null);
                  setSortAscending(!sortAscending);
                }}
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                  },
                ]}
              >
                {sortAscending ? (
                  <ArrowUp size={16} color={colors.primary} />
                ) : (
                  <ArrowDown size={16} color={colors.primary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* 03: HORIZONTAL TAB PAGER */}
        <ScrollView
          ref={tabPagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          // Update active tab mid-drag ONLY while user's finger is actively dragging.
          // Guarding with isTabScrollingRef prevents flicker during momentum scrolls
          // and programmatic scrollTo animations triggered by tab button presses.
          onScroll={(e) => {
            if (!isTabScrollingRef.current) return;
            const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
            const tab = TAB_ORDER[Math.max(0, Math.min(index, TAB_ORDER.length - 1))];
            if (tab !== activeTab) setActiveTab(tab);
          }}
          // Block vertical dismiss PanResponder while user is swiping tabs
          onScrollBeginDrag={() => { isTabScrollingRef.current = true; }}
          onScrollEndDrag={(e) => {
            const vx = e.nativeEvent.velocity ? e.nativeEvent.velocity.x : 0;
            if (vx === 0) isTabScrollingRef.current = false;
          }}
          onMomentumScrollEnd={(e) => {
            isTabScrollingRef.current = false;
            // Always sync to final snapped page after momentum ends
            // (covers flings, partial drags that bounced back, and programmatic scrolls)
            const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
            const tab = TAB_ORDER[Math.max(0, Math.min(index, TAB_ORDER.length - 1))];
            setActiveTab(tab);
          }}
          style={{ flex: 1 }}
          // Prevent the horizontal pager from consuming native vertical scroll
          // gestures that belong to the inner per-tab vertical ScrollViews.
          directionalLockEnabled
        >
          {/* ── Page 0: Links ── */}
          <ScrollView
            style={{ width: windowWidth }}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'}
              />
            }
          >
            <LinksScreen
              sortedItems={sortedLinkItems}
              isSelectionMode={isSelectionMode && activeTab === 'link'}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              onLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })}
              editingItemId={editingItemId}
            />
          </ScrollView>

          {/* ── Page 1: Texts ── */}
          <ScrollView
            style={{ width: windowWidth }}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'}
              />
            }
          >
            <TextsScreen
              sortedItems={sortedTextItems}
              isSelectionMode={isSelectionMode && activeTab === 'text'}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              onLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })}
              editingItemId={editingItemId}
            />
          </ScrollView>

          {/* ── Page 2: Photos ── */}
          <ScrollView
            style={{ width: windowWidth }}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'}
              />
            }
          >
            <PhotosScreen
              sortedItems={sortedPhotoItems}
              isSelectionMode={isSelectionMode && activeTab === 'photo'}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              onPhotoPress={handlePhotoPress}
              onPhotoLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })}
              activePhotoId={activeFullscreenPhoto?.id}
              registerMeasureFn={(fn) => {
                measurePhotoRef.current = fn;
              }}
            />
          </ScrollView>

          {/* ── Page 3: Files ── */}
          <ScrollView
            style={{ width: windowWidth }}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'}
              />
            }
          >
            <FilesScreen
              sortedItems={sortedFileItems}
              isSelectionMode={isSelectionMode && activeTab === 'file'}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              onLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })}
              editingItemId={editingItemId}
            />
          </ScrollView>
        </ScrollView>

        {/* Fullscreen Photo Overlay with native horizontal paging and swipe-down-to-close */}
        {activeFullscreenPhotoIndex !== null && activeFullscreenPhoto && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 900,
              },
              containerStyle,
            ]}
          >
            {/* Dark Backdrop */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                backdropStyle,
                { backgroundColor: colors.background }
              ]}
              pointerEvents="none"
            />

            {/* Completely transparent background */}
            {/* FlatList mounted unconditionally inside the overlay to pre-render and load images in background */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { opacity: isZooming ? 0 : 1 }
              ]}
              pointerEvents={isZooming ? 'none' : 'auto'}
            >
              <FlatList
                data={sortedItems}
                horizontal
                pagingEnabled
                scrollEnabled={!isSwipingDown}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                initialScrollIndex={activeFullscreenPhotoIndex}
                getItemLayout={(data, index) => ({
                  length: windowWidth,
                  offset: windowWidth * index,
                  index,
                })}
                onScroll={(e) => {
                  currentScrollX.current = e.nativeEvent.contentOffset.x;
                }}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  isScrollingRef.current = true;
                }}
                onScrollEndDrag={(e) => {
                  const velocityX = e.nativeEvent.velocity ? e.nativeEvent.velocity.x : 0;
                  if (velocityX === 0) {
                    isScrollingRef.current = false;
                  }
                }}
                onMomentumScrollEnd={(e) => {
                  isScrollingRef.current = false;
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  currentScrollX.current = contentOffset;
                  const layoutWidth = e.nativeEvent.layoutMeasurement.width;
                  const index = Math.round(contentOffset / layoutWidth);
                  if (index >= 0 && index < sortedItems.length) {
                    setActiveFullscreenPhotoIndex(index);
                  }
                }}
                renderItem={({ item }) => (
                  <View style={{ width: windowWidth, height: windowHeight, justifyContent: 'center', alignItems: 'center' }}>
                    <Pressable
                      onPress={() => {
                        const next = !controlsVisible.current;
                        controlsVisible.current = next;
                        controlsOpacity.value = withTiming(next ? 1 : 0, { duration: 150 });
                      }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <Image
                        source={{ uri: ensureFileUri(item.value) }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                        transition={0}
                      />
                    </Pressable>
                  </View>
                )}
                style={{ width: '100%', height: '100%' }}
              />
            </View>

            {/* Transition Zoom Image (rendered on top of FlatList during zoom transitions, kept mounted to avoid reload flicker) */}
            <Animated.View style={animatedTransitionStyle} pointerEvents="none">
              <Image
                source={{ uri: ensureFileUri(activeFullscreenPhoto.value) }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={0}
              />
            </Animated.View>

            {/* Top Header Bar Container */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: insets.top > 0 ? insets.top + 56 : 64,
                  zIndex: 950,
                  opacity: 0,
                },
                controlsStyle,
              ]}
            >
              {/* Dynamic Theme Background */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: colors.background,
                    borderBottomWidth: 1.5,
                    borderBottomColor: colors.primary + (isDark ? '40' : '26'),
                  },
                  barBgStyle,
                ]}
              />

              {/* Top Controls Layout */}
              <View
                style={{
                  flex: 1,
                  paddingTop: insets.top > 0 ? insets.top : 8,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* Top Left: Back Button */}
                <Pressable
                  onPress={handleCloseFullscreen}
                  style={({ pressed }) => [
                    styles.headerActionBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: pressed ? colors.primary + '25' : colors.card + '80',
                    },
                  ]}
                >
                  <ArrowLeft size={16} color={colors.primary} />
                </Pressable>

                {/* Top Middle: Date/Time Stamp */}
                <View
                  style={{
                    backgroundColor: colors.card + '80',
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <TuiText weight="bold" size="sm" style={{ color: colors.primary }}>
                    {activeFullscreenPhoto.label}
                  </TuiText>
                </View>

                {/* Spacer to align center */}
                <View style={{ width: 40, height: 40 }} />
              </View>
            </Animated.View>

            {/* Bottom Footer Bar Container */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: insets.bottom > 0 ? insets.bottom + 64 : 72,
                  zIndex: 950,
                  opacity: 0,
                },
                controlsStyle,
              ]}
            >

              {/* Bottom Controls Layout */}
              <View
                style={{
                  flex: 1,
                  paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                }}
              >
                {/* Bottom Left: Share Button */}
                <Pressable
                  onPress={handleShareActivePhoto}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: pressed ? colors.primary + '25' : colors.card + '80',
                    },
                  ]}
                >
                  <Share2 size={16} color={colors.primary} />
                </Pressable>

                {/* Bottom Right: Delete Button */}
                <Pressable
                  onPress={handleDeleteActivePhoto}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: colors.destructive || '#EF4444',
                      backgroundColor: pressed ? (colors.destructive || '#EF4444') + '25' : colors.card + '80',
                    },
                  ]}
                >
                  <Trash2 size={16} color={colors.destructive || '#EF4444'} />
                </Pressable>
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {/* 04: BOTTOM BAR */}
        <Animated.View
          pointerEvents={activeFullscreenPhotoIndex !== null ? 'none' : 'auto'}
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              zIndex: activeFullscreenPhotoIndex !== null ? 0 : 1000,
            },
            animatedBottomBarStyle,
          ]}
        >
          {isSelectionMode ? (
            <View style={[styles.bottomBarRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <Pressable
                onPress={handleBulkShare}
                disabled={selectedIds.size === 0}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                    opacity: selectedIds.size === 0 ? 0.4 : 1,
                  },
                ]}
              >
                <Share2 size={16} color={colors.primary} />
              </Pressable>

              <TuiText
                size="sm"
                weight="bold"
                style={{ color: colors.primary, textAlign: 'center' }}
              >
                {selectedIds.size} selected
              </TuiText>

              <Pressable
                onPress={handleBulkDelete}
                disabled={selectedIds.size === 0}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: colors.destructive || '#EF4444',
                    backgroundColor: pressed ? (colors.destructive || '#EF4444') + '25' : 'transparent',
                    opacity: selectedIds.size === 0 ? 0.4 : 1,
                  },
                ]}
              >
                <Trash2 size={16} color={colors.destructive || '#EF4444'} />
              </Pressable>
            </View>
          ) : editingItemId !== null ? (
            <View style={styles.bottomBarRow}>
              <Pressable
                onPress={handleCancelEdit}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: colors.destructive || '#EF4444',
                    backgroundColor: pressed ? (colors.destructive || '#EF4444') + '25' : 'transparent',
                  },
                ]}
              >
                <X size={16} color={colors.destructive || '#EF4444'} />
              </Pressable>

              <TextInput
                ref={editInputRef}
                style={[
                  styles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.foreground,
                    backgroundColor: colors.card,
                  },
                ]}
                value={editText}
                onChangeText={setEditText}
                placeholder={activeTab === 'link' ? "Edit link..." : activeTab === 'file' ? "Rename file..." : "Edit text..."}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoFocus
                multiline={true}
                onFocus={() => {
                  setIsPhotoSheetOpen(false);
                  setActiveFullscreenPhotoIndex(null);
                }}
              />

              <Pressable
                onPress={() => handleSaveEdit(editingItemId, editText)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                  },
                ]}
              >
                <Check size={16} color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.bottomBarRow}>
              <Pressable
                onPress={handlePickImage}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                    marginRight: isPhotoSheetOpen ? 0 : 6,
                  },
                ]}
              >
                <ImageIcon size={16} color={colors.primary} />
              </Pressable>

              {!isPhotoSheetOpen && (
                <Pressable
                  onPress={handlePickFile}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                    },
                  ]}
                >
                  <Paperclip size={16} color={colors.primary} />
                </Pressable>
              )}

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.primary,
                    color: colors.foreground,
                    backgroundColor: colors.card,
                  },
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type Something"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                multiline={true}
                onFocus={() => {
                  setIsPhotoSheetOpen(false);
                  setActiveFullscreenPhotoIndex(null);
                }}
              />

              {isPhotoSheetOpen ? (
                <>
                  <Pressable
                    onPress={() => setPhotoSheetTriggerSelectAll((p) => p + 1)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      {
                        borderColor: colors.primary,
                        backgroundColor: photoSheetState.isAllSelected
                          ? colors.primary + '25'
                          : pressed
                            ? colors.primary + '15'
                            : 'transparent',
                        marginRight: 8,
                      },
                    ]}
                  >
                    <ListChecks size={16} color={colors.primary} />
                  </Pressable>

                  <Pressable
                    onPress={() => setPhotoSheetTriggerSort((p) => p + 1)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      {
                        borderColor: colors.primary,
                        backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                      },
                    ]}
                  >
                    {photoSheetState.sortAscending ? (
                      <ArrowUp size={16} color={colors.primary} />
                    ) : (
                      <ArrowDown size={16} color={colors.primary} />
                    )}
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={handleSubmit}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                    },
                  ]}
                >
                  <Check size={16} color={colors.primary} />
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>
      </SafeAreaView>

      {/* Backdrop overlay for closing on tap outside (covers area above the bottom bar) */}
      {isPhotoSheetOpen && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 430,
            backgroundColor: 'transparent',
            zIndex: 998,
          }}
          onPress={() => setIsPhotoSheetOpen(false)}
        />
      )}

      {/* Combined bottom spacer (acts like a keyboard spacer, but loads the custom
          photo picker inside when the photo sheet is active) */}
      <Animated.View style={[bottomSpacerStyle, { backgroundColor: colors.background, overflow: 'hidden', zIndex: 1000 }]}>
        {isPhotoSheetOpen && (
          <PhotoPickerSheet
            onClose={() => setIsPhotoSheetOpen(false)}
            onAddPhotos={handleAddMultiplePhotos}
            triggerSelectAll={photoSheetTriggerSelectAll}
            triggerSort={photoSheetTriggerSort}
            onStateChange={setPhotoSheetState}
          />
        )}
      </Animated.View>

      {/* Context Menu Overlay */}
      {contextMenuPhoto && (
        <ContextMenuOverlay
          contextMenuPhoto={contextMenuPhoto}
          imageSizes={imageSizes}
          onClose={() => setContextMenuPhoto(null)}
          onCopy={() => handleCopyItem(contextMenuPhoto.item)}
          onShare={() => handleShareItem(contextMenuPhoto.item)}
          onEdit={contextMenuPhoto.item.type !== 'photo' ? () => handleEditItem(contextMenuPhoto.item) : undefined}
          onDelete={() => handleDeleteItem(contextMenuPhoto.item)}
        />
      )}

      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: insets.top + 70,
              left: 20,
              right: 20,
              zIndex: 2500,
            },
            animatedToastStyle,
          ]}
        >
          <TuiContainer label={toast.label} accentBorder={true}>
            <TuiText size="sm" style={{ color: colors.foreground }} numberOfLines={2}>
              {toast.caption}
            </TuiText>
          </TuiContainer>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Context Menu Overlay ──────────────────────────────────────────────────────

interface ContextMenuOverlayProps {
  contextMenuPhoto: { item: DumpItem; bounds: PhotoLayout };
  imageSizes: Record<string, { width: number; height: number }>;
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

const ContextMenuOverlay: React.FC<ContextMenuOverlayProps> = ({
  contextMenuPhoto,
  imageSizes,
  onClose,
  onCopy,
  onShare,
  onEdit,
  onDelete,
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

  const menuHeight = isPhoto ? 136 : 180; // photos: 3 rows; link/text: 4 rows (Edit added)
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

        {/* Edit Row — only for link/text items */}
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
              Edit
            </TuiText>
            <Pencil size={16} color={colors.foreground} />
          </Pressable>
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 90 },
  bottomBar: { paddingHorizontal: 16, paddingVertical: 12 },
  bottomBarRow: { flexDirection: 'row', alignItems: 'flex-end', width: '100%' },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1.5,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
  },
  iconBtn: { borderWidth: 1.5, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  topContainer: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 5 },
  bannerWrapper: {
    width: '100%',
    aspectRatio: 412 / 94,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleBtn: {
    borderWidth: 1.5,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 6, gap: 12 },
  tabSquare: { flex: 1, height: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  borderLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1.5, zIndex: 5 },
  borderRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 1.5, zIndex: 5 },
  borderBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, zIndex: 5 },
  borderTopLeft: { position: 'absolute', left: 0, top: 0, height: 1.5, zIndex: 5 },
  borderTopRight: { position: 'absolute', right: 0, top: 0, height: 1.5, zIndex: 5 },
  legendWrapper: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 2,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  legendText: { fontSize: 14, letterSpacing: 0.2 },
  tabContent: { alignItems: 'center', justifyContent: 'center' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  sectionTitle: { letterSpacing: 1.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerActionBtn: { borderWidth: 1.5, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  menuRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});
