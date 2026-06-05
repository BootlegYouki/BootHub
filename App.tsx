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
  Animated as RNAnimated,
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
  LinearTransition,
  FadeIn,
  FadeOut,
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
  X,
  Paperclip,
  Search,
  MoreHorizontal,
  Folder,
  FolderPlus,
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
import { getItems, deleteItem, addItem, updateItem, addMultiplePhotos, setItemFolder, DumpItem, DumpType } from './src/utils/storage';
import { ensureFileUri, getActualType, extractAudioArtwork } from './src/utils/helpers';
import { LinksScreen } from './src/screens/LinksScreen';
import { TextsScreen } from './src/screens/TextsScreen';
import { PhotosScreen, PhotoLayout } from './src/screens/PhotosScreen';
import { FilesScreen } from './src/screens/FilesScreen';
import { PhotoPickerSheet } from './src/components/photo-picker-sheet';
import { TabButton } from './src/components/tab-button';
import { ContextMenuOverlay } from './src/components/context-menu-overlay';
import { FullscreenPhotoViewer } from './src/components/fullscreen-photo-viewer';
import { SplashIcon } from './src/components/splash-icon';

// Bottom bar transition settings (manually customize duration/delay here)
const BAR_SLIDE_DURATION = 100; // milliseconds
const BAR_SLIDE_DELAY = 150;    // milliseconds
const BAR_FADE_DURATION = 250;  // milliseconds
const BAR_FADE_DELAY = 100;     // milliseconds

// ─── Main App ─────────────────────────────────────────────────────────────────

function MainApp() {
  const { colors, isDark, setThemeMode, themeLoaded } = useTheme();
  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });

  const [dataLoaded, setDataLoaded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const splashOpacity = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (fontsLoaded && dataLoaded && themeLoaded) {
      setIsAppReady(true);
    }
  }, [fontsLoaded, dataLoaded, themeLoaded]);

  useEffect(() => {
    if (isAppReady) {
      RNAnimated.timing(splashOpacity, {
        toValue: 0,
        duration: 200,
        delay: 1000,
        useNativeDriver: true,
      }).start(() => {
        setSplashVisible(false);
      });
    }
  }, [isAppReady]);

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DumpType>('link');
  const [items, setItems] = useState<DumpItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [contextMenuPhoto, setContextMenuPhoto] = useState<{ item: DumpItem; bounds: PhotoLayout } | null>(null);
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState<boolean>(false);
  const { width: windowWidth } = Dimensions.get('window');
  const [photoSheetState, setPhotoSheetState] = useState({ isAllSelected: false, sortAscending: false });
  const [photoSheetTriggerSelectAll, setPhotoSheetTriggerSelectAll] = useState(0);
  const [photoSheetTriggerSort, setPhotoSheetTriggerSort] = useState(0);
  const photoSheetHeight = useSharedValue(0);
  const [activeFullscreenPhotoIndex, setActiveFullscreenPhotoIndex] = useState<number | null>(null);
  const [zoomStartBounds, setZoomStartBounds] = useState<PhotoLayout | null>(null);

  const [imageSizes, setImageSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const getActiveExpandedFolder = () => {
    const activeTabFolders = items.filter((x) => {
      if (x.type !== 'folder') return false;
      try {
        const obj = JSON.parse(x.value);
        return obj.tab === activeTab;
      } catch {}
      return false;
    });

    const expanded = activeTabFolders.find((f) => !!expandedFolders[f.id]);
    if (expanded) {
      let name = 'Folder';
      try {
        name = JSON.parse(expanded.value).name;
      } catch {}
      return { id: expanded.id, name };
    }
    return null;
  };
  const measurePhotoRef = useRef<
    ((id: string, callback: (bounds: PhotoLayout | null) => void) => void) | null
  >(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFooterFocused, setIsFooterFocused] = useState<boolean>(false);

  const [headerMenuExpanded, setHeaderMenuExpanded] = useState<boolean>(false);
  const headerMenuAnimation = useSharedValue(0);

  const toggleHeaderMenu = () => {
    const next = !headerMenuExpanded;
    setHeaderMenuExpanded(next);
    headerMenuAnimation.value = withTiming(next ? 1 : 0, { duration: 180 });
  };

  const subButtonStyle = useAnimatedStyle(() => {
    const scale = interpolate(headerMenuAnimation.value, [0, 1], [0, 1]);
    const opacity = interpolate(headerMenuAnimation.value, [0, 1], [0, 1]);
    const width = interpolate(headerMenuAnimation.value, [0, 1], [0, 48]);
    const marginRight = interpolate(headerMenuAnimation.value, [0, 1], [0, 8]);

    return {
      width,
      marginRight,
      opacity,
      transform: [{ scale }],
      overflow: 'hidden',
    };
  });


  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

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



  // ─── Per-tab items (each tab filters independently so all tabs stay live) ────
  const TAB_ORDER: DumpType[] = ['link', 'text', 'photo', 'file'];

  const getFolderTab = (item: DumpItem): string | null => {
    if (item.type !== 'folder') return null;
    try {
      const obj = JSON.parse(item.value);
      return obj.tab;
    } catch {
      return null;
    }
  };

  const getFolderName = (item: DumpItem): string => {
    if (item.type !== 'folder') return '';
    try {
      const obj = JSON.parse(item.value);
      return obj.name || 'New Folder';
    } catch {
      return 'New Folder';
    }
  };

  const linkItems = items
    .filter((item) => {
      const type = getActualType(item.value, item.type);
      return type === 'link' || (item.type === 'folder' && getFolderTab(item) === 'link');
    })
    .map((item) => item.id === editingItemId ? { ...item, value: item.type === 'folder' ? JSON.stringify({ name: editText, tab: 'link' }) : editText } : item);

  const textItems = items
    .filter((item) => {
      const type = getActualType(item.value, item.type);
      return type === 'text' || (item.type === 'folder' && getFolderTab(item) === 'text');
    })
    .map((item) => item.id === editingItemId ? { ...item, value: item.type === 'folder' ? JSON.stringify({ name: editText, tab: 'text' }) : editText } : item);

  const photoItems = items.filter((item) => {
    const type = getActualType(item.value, item.type);
    return type === 'photo' || (item.type === 'folder' && getFolderTab(item) === 'photo');
  });

  const fileItems = items
    .filter((item) => {
      const type = getActualType(item.value, item.type);
      return type === 'file' || (item.type === 'folder' && getFolderTab(item) === 'file');
    })
    .map((item) => item.id === editingItemId ? { ...item, value: item.type === 'folder' ? JSON.stringify({ name: editText, tab: 'file' }) : editText } : item);

  const query = searchQuery.trim().toLowerCase();

  const matchItem = (item: DumpItem, q: string, tabItems: DumpItem[]): boolean => {
    if (item.type === 'folder') {
      const name = getFolderName(item).toLowerCase();
      if (name.includes(q)) return true;
      const children = tabItems.filter((child) => child.folderId === item.id);
      return children.some((child) => matchItem(child, q, tabItems));
    }
    
    if (item.type === 'file') {
      let fileName = '';
      try {
        fileName = JSON.parse(item.value).name || '';
      } catch (e) {
        fileName = item.value.split('/').pop() || '';
      }
      return (
        fileName.toLowerCase().includes(q) ||
        !!(item.label && item.label.toLowerCase().includes(q))
      );
    }

    return (
      item.value.toLowerCase().includes(q) ||
      !!(item.label && item.label.toLowerCase().includes(q))
    );
  };

  const filteredLinks = query
    ? linkItems.filter((item) => matchItem(item, query, linkItems))
    : linkItems;

  const filteredTexts = query
    ? textItems.filter((item) => matchItem(item, query, textItems))
    : textItems;

  const filteredFiles = query
    ? fileItems.filter((item) => matchItem(item, query, fileItems))
    : fileItems;

  const filteredPhotos = query
    ? photoItems.filter((item) => matchItem(item, query, photoItems))
    : photoItems;

  const sortTabItems = (itemsList: DumpItem[]): DumpItem[] => {
    const folders = itemsList.filter((x) => x.type === 'folder');
    const nonFolders = itemsList.filter((x) => x.type !== 'folder');

    const compareFn = (a: DumpItem, b: DumpItem) => {
      return sortAscending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
    };

    folders.sort(compareFn);
    nonFolders.sort(compareFn);

    return [...folders, ...nonFolders];
  };

  const sortedLinkItems = sortTabItems(filteredLinks);
  const sortedTextItems = sortTabItems(filteredTexts);
  const sortedPhotoItems = sortTabItems(filteredPhotos);
  const sortedFileItems = sortTabItems(filteredFiles);

  // Keep legacy `sortedItems` pointing at the active tab so existing downstream
  // code (select-all, section count, etc.) doesn't need to change.
  const filteredItems = items
    .filter((item) => {
      const type = getActualType(item.value, item.type);
      return type === activeTab || (item.type === 'folder' && getFolderTab(item) === activeTab);
    })
    .map((item) => item.id === editingItemId ? { ...item, value: item.type === 'folder' ? JSON.stringify({ name: editText, tab: activeTab }) : editText } : item);

  const filteredSearchItems = query
    ? filteredItems.filter((item) => matchItem(item, query, filteredItems))
    : filteredItems;

  const sortedItems = sortTabItems(filteredSearchItems);

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
    scrollToTab(tab, false);
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
    const keyboardHeight = isFooterFocused ? keyboard.height.value : 0;
    const height = Math.max(keyboardHeight, photoSheetHeight.value);
    return {
      height: height,
    };
  });

  const animatedBottomBarStyle = useAnimatedStyle(() => {
    const targetPadding = insets.bottom > 0 ? insets.bottom : 12;
    const keyboardHeight = isFooterFocused ? keyboard.height.value : 0;
    const totalHeight = Math.max(keyboardHeight, photoSheetHeight.value);
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


  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsFooterFocused(false);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Reset selection when tab changes
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setActiveFullscreenPhotoIndex(null);
    setEditingItemId(null);
    Keyboard.dismiss();
    setHeaderMenuExpanded(false);
    headerMenuAnimation.value = 0;
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
    setContextMenuPhoto(null);
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
    } catch (e: any) {
      console.error('Failed to copy item:', e);
      Alert.alert('Copy Error', e?.message || String(e));
    }
  };

  const handleShareItem = async (item: DumpItem) => {
    setContextMenuPhoto(null);
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
    } catch (e: any) {
      const isCancelError = /user did not share|cancel|dismiss/i.test(e?.message || String(e));
      if (!isCancelError) {
        console.error('Sharing failed:', e);
        Alert.alert('Share Error', e?.message || String(e));
      }
    }
  };

  const handleDeleteItem = async (item: DumpItem) => {
    setContextMenuPhoto(null);
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

  const handlePhotoPress = (item: DumpItem, startBounds: PhotoLayout) => {
    setZoomStartBounds(startBounds);
    const index = sortedPhotoItems.findIndex((x) => x.id === item.id);
    if (index !== -1) {
      setActiveFullscreenPhotoIndex(index);
    }
  };

  const handleCreateFolder = async () => {
    setEditingItemId('temp-new-folder');
    setEditText('');
  };

  const handleSetItemFolder = async (itemId: string, folderId: string | undefined) => {
    setContextMenuPhoto(null);
    try {
      const updatedList = await setItemFolder(itemId, folderId);
      setItems(updatedList);
      showToast(folderId ? 'Moved to folder' : 'Removed from folder', '');
    } catch (e) {
      console.error('Failed to move item to folder:', e);
    }
  };

  const handleMoveToFolder = (item: DumpItem) => {
    setContextMenuPhoto(null);
    // Find all folders belonging to the active tab
    const tabFolders = items.filter((x) => {
      if (x.type !== 'folder') return false;
      try {
        const obj = JSON.parse(x.value);
        return obj.tab === activeTab;
      } catch {}
      return false;
    });

    if (tabFolders.length === 0) {
      Alert.alert('No Folders', 'Create a folder first.');
      return;
    }

    const options = tabFolders.map((f) => {
      let name = 'Folder';
      try {
        name = JSON.parse(f.value).name;
      } catch {}
      return {
        text: name,
        onPress: () => handleSetItemFolder(item.id, f.id),
      };
    });

    Alert.alert(
      'Move to Folder',
      'Select a folder to move this item to:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...options,
      ]
    );
  };

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
      try {
        const data = await getItems();
        setItems(data);
      } catch (e) {
        console.error('Failed to load items:', e);
      } finally {
        setDataLoaded(true);
      }
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
    } else if (item.type === 'folder') {
      try {
        const folderObj = JSON.parse(item.value);
        setEditText(folderObj.name || 'New Folder');
      } catch {
        setEditText(item.value);
      }
    } else {
      setEditText(item.value);
    }
  };

  const handleSaveEdit = async (id: string, value: string) => {
    Keyboard.dismiss();
    let finalValue = value.trim();

    if (id === 'temp-new-folder') {
      if (!finalValue) {
        finalValue = 'New Folder';
      }

      const existingNames = items
        .filter((x) => x.type === 'folder')
        .map((x) => {
          try {
            const obj = JSON.parse(x.value);
            if (obj.tab === activeTab) {
              return obj.name;
            }
          } catch {}
          return null;
        })
        .filter((name): name is string => name !== null);

      if (existingNames.includes(finalValue)) {
        let counter = 1;
        while (existingNames.includes(`${finalValue}_${counter}`)) {
          counter++;
        }
        finalValue = `${finalValue}_${counter}`;
      }

      try {
        const folderVal = JSON.stringify({ name: finalValue, tab: activeTab });
        const updatedList = await addItem('folder', folderVal);
        setItems(updatedList);
        showToast('Folder created!', finalValue);
      } catch (e) {
        console.error('Failed to create folder:', e);
      } finally {
        setEditingItemId(null);
      }
      return;
    }

    const item = items.find((x) => x.id === id);
    if (!item) return;

    if (item.type === 'folder') {
      if (!finalValue) {
        finalValue = 'New Folder';
      }

      const existingNames = items
        .filter((x) => x.type === 'folder' && x.id !== id)
        .map((x) => {
          try {
            const obj = JSON.parse(x.value);
            if (obj.tab === activeTab) {
              return obj.name;
            }
          } catch {}
          return null;
        })
        .filter((name): name is string => name !== null);

      if (existingNames.includes(finalValue)) {
        let counter = 1;
        while (existingNames.includes(`${finalValue}_${counter}`)) {
          counter++;
        }
        finalValue = `${finalValue}_${counter}`;
      }
    } else {
      if (!finalValue) return;
    }

    try {
      const updated = await updateItem(id, finalValue);
      setItems(updated);
      showToast('Edited!', finalValue);
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

      const saveFile = async (folderId?: string) => {
        const updated = await addItem('file', JSON.stringify(fileData), folderId);
        setItems(updated);
        setActiveTab('file');
        scrollToTab('file');
        showToast(folderId ? 'Added to folder!' : 'Added!', asset.name);
      };

      const folder = getActiveExpandedFolder();
      if (folder) {
        Alert.alert(
          'Add to Folder',
          `Would you like to add this to the folder "${folder.name}"?`,
          [
            {
              text: 'No (Add to top level)',
              style: 'cancel',
              onPress: () => saveFile()
            },
            {
              text: 'Yes',
              onPress: () => saveFile(folder.id)
            }
          ]
        );
      } else {
        await saveFile();
      }
    } catch (e) {
      console.error('Failed to pick file:', e);
      Alert.alert('File Pick Error', 'An error occurred while picking or saving the file.');
    }
  };

  const handleAddMultiplePhotos = async (uris: string[]) => {
    const savePhotos = async (folderId?: string) => {
      try {
        const updated = await addMultiplePhotos(uris, folderId);
        setItems(updated);
        setActiveTab('photo');
        scrollToTab('photo');
        showToast(folderId ? 'Added to folder!' : 'Added!', `${uris.length} photo${uris.length > 1 ? 's' : ''}`);
      } catch (e) {
        console.error('Failed to add multiple photos:', e);
      }
    };

    const folder = getActiveExpandedFolder();
    if (folder) {
      Alert.alert(
        'Add to Folder',
        `Would you like to add ${uris.length === 1 ? 'this photo' : `these ${uris.length} photos`} to the folder "${folder.name}"?`,
        [
          {
            text: 'No (Add to top level)',
            style: 'cancel',
            onPress: () => savePhotos()
          },
          {
            text: 'Yes',
            onPress: () => savePhotos(folder.id)
          }
        ]
      );
    } else {
      await savePhotos();
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    const type = getActualType(trimmed, 'text');

    const saveText = async (folderId?: string) => {
      try {
        const updated = await addItem(type, trimmed, folderId);
        setItems(updated);
        setActiveTab(type);
        scrollToTab(type);
        setInputText('');
        showToast(folderId ? 'Added to folder!' : 'Added!', trimmed);
      } catch (e) {
        console.error('Failed to submit item:', e);
      }
    };

    const folder = getActiveExpandedFolder();
    if (folder) {
      Alert.alert(
        'Add to Folder',
        `Would you like to add this to the folder "${folder.name}"?`,
        [
          {
            text: 'No (Add to top level)',
            style: 'cancel',
            onPress: () => saveText()
          },
          {
            text: 'Yes',
            onPress: () => saveText(folder.id)
          }
        ]
      );
    } else {
      await saveText();
    }
  };

  // Render initial dark/light splash screen until the app is ready
  if (!isAppReady) {
    const splashBg = isDark ? '#000000' : '#FFFFFF';
    const splashIconColor = isDark ? '#FFFFFF' : '#000000';
    return (
      <View style={{ flex: 1, backgroundColor: splashBg, justifyContent: 'center', alignItems: 'center' }}>
        {themeLoaded && (
          <SplashIcon color={splashIconColor} />
        )}
      </View>
    );
  }

  const toggleTheme = () => {
    setEditingItemId(null);
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const dynamicSubtitle = activeTab === 'photo' ? 'photos' : activeTab + 's';
  const capitalizedTitle = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + 's';

  const renderSearchBar = () => {
    return (
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary,
          },
        ]}
      >
        <Search size={18} color={isSearchFocused ? colors.primary : colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          placeholder="Search..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            setIsSearchFocused(true);
            setIsFooterFocused(false);
          }}
          onBlur={() => setIsSearchFocused(false)}
          style={[
            styles.searchInput,
            {
              color: colors.primary,
            },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.searchClearBtn}
          >
            <X size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>
    );
  };

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
            {renderSearchBar()}
            <View style={styles.headerActions}>
              {isSelectionMode && (
                <Animated.View style={subButtonStyle}>
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
                          width: 48,
                        },
                      ];
                    }}
                  >
                    <ListChecks size={16} color={colors.primary} />
                  </Pressable>
                </Animated.View>
              )}

              {!isSelectionMode && (
                <Animated.View style={subButtonStyle}>
                  <Pressable
                    onPress={handleCreateFolder}
                    style={({ pressed }) => [
                      styles.headerActionBtn,
                      {
                        borderColor: colors.primary,
                        backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                        width: 48,
                      },
                    ]}
                  >
                    <FolderPlus size={16} color={colors.primary} />
                  </Pressable>
                </Animated.View>
              )}

              <Animated.View style={subButtonStyle}>
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
                      width: 48,
                    },
                  ]}
                >
                  <CheckSquare size={16} color={colors.primary} />
                </Pressable>
              </Animated.View>

              <Animated.View style={subButtonStyle}>
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
                      width: 48,
                    },
                  ]}
                >
                  {sortAscending ? (
                    <ArrowUp size={16} color={colors.primary} />
                  ) : (
                    <ArrowDown size={16} color={colors.primary} />
                  )}
                </Pressable>
              </Animated.View>

              <Pressable
                onPress={toggleHeaderMenu}
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                  },
                ]}
              >
                {headerMenuExpanded ? (
                  <X size={16} color={colors.primary} />
                ) : (
                  <MoreHorizontal size={16} color={colors.primary} />
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
          keyboardShouldPersistTaps="handled"
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
            keyboardShouldPersistTaps="handled"
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
              searchQuery={searchQuery}
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
            />
          </ScrollView>

          {/* ── Page 1: Texts ── */}
          <ScrollView
            style={{ width: windowWidth }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
              searchQuery={searchQuery}
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
            />
          </ScrollView>

          {/* ── Page 2: Photos ── */}
          <ScrollView
            style={{ width: windowWidth }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
            />
          </ScrollView>

          {/* ── Page 3: Files ── */}
          <ScrollView
            style={{ width: windowWidth }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
              searchQuery={searchQuery}
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
            />
          </ScrollView>
        </ScrollView>

        {/* Fullscreen Photo Overlay with native horizontal paging and swipe-down-to-close */}
        {activeFullscreenPhotoIndex !== null && activeFullscreenPhoto && (
          <FullscreenPhotoViewer
            activeFullscreenPhotoIndex={activeFullscreenPhotoIndex}
            setActiveFullscreenPhotoIndex={setActiveFullscreenPhotoIndex}
            sortedItems={sortedPhotoItems}
            startBounds={zoomStartBounds}
            imageSizes={imageSizes}
            onShare={handleShareActivePhoto}
            onDelete={handleDeleteActivePhoto}
            measurePhotoRef={measurePhotoRef}
          />
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
                placeholder={
                  editingItemId === 'temp-new-folder' || (editingItemId && items.find(x => x.id === editingItemId)?.type === 'folder')
                    ? "Name your folder..."
                    : (activeTab === 'link' ? "Edit link..." : activeTab === 'file' ? "Rename file..." : "Edit text...")
                }
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoFocus
                multiline={true}
                blurOnSubmit={false}
                onFocus={() => {
                  setIsPhotoSheetOpen(false);
                  setActiveFullscreenPhotoIndex(null);
                  setIsFooterFocused(true);
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
              {/* Photo Button - Animation Removed */}
              <View>
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
              </View>

              {/* Attachment / File Picker */}
              {!isPhotoSheetOpen && (
                <View>
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
                </View>
              )}

              {/* Text Input */}
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
                blurOnSubmit={false}
                onFocus={() => {
                  setIsPhotoSheetOpen(false);
                  setActiveFullscreenPhotoIndex(null);
                  setIsFooterFocused(true);
                }}
              />

              {isPhotoSheetOpen ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {/* Select All Button */}
                  <View>
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
                        },
                      ]}
                    >
                      <ListChecks size={16} color={colors.primary} />
                    </Pressable>
                  </View>

                  {/* Sort Button - Animation Removed */}
                  <View>
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
                  </View>
                </View>
              ) : (
                /* Submit / Send Button - Animation Removed */
                <View key="submit-action">
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
                </View>
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
          onMoveToFolder={() => handleMoveToFolder(contextMenuPhoto.item)}
          onRemoveFromFolder={() => handleSetItemFolder(contextMenuPhoto.item.id, undefined)}
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

      {splashVisible && (
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: splashOpacity,
              zIndex: 99999,
            },
          ]}
          pointerEvents="none"
        >
          {themeLoaded && (
            <SplashIcon color={isDark ? '#FFFFFF' : '#000000'} />
          )}
        </RNAnimated.View>
      )}
    </View>
  );
}



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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 10 },
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
    lineHeight: 18
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  sectionTitle: { letterSpacing: 1.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerActionBtn: { borderWidth: 1.5, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClearBtn: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
