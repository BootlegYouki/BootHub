import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  AppState,
  Keyboard,
  Share,
  Alert,
  Dimensions,
  Image as RNImage,
  RefreshControl,
  Animated as RNAnimated,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Archive,
  Link2,
  FileText,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  X,
  Search,
  MoreHorizontal,
  FolderPlus,
  RefreshCw,
  Paperclip,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import {
  processSyncQueue,
  enqueueSyncTask,
  enqueueSyncTasks,
} from './src/utils/sync-engine';


import { ThemeProvider, useTheme } from './src/theme/theme-provider';
import { TuiHeader } from './src/components/tui-header';
import {
  getItems,
  deleteItem,
  addItem,
  addMultiplePhotos,
  setItemFolder,
  DumpItem,
  DumpType,
  registerSyncTrigger,
} from './src/utils/storage';

registerSyncTrigger(enqueueSyncTask, enqueueSyncTasks, processSyncQueue);

import { ensureFileUri, extractAudioArtwork, resolveToLocalFileUri } from './src/utils/helpers';
import { LinksScreen } from './src/screens/LinksScreen';
import { TextsScreen } from './src/screens/TextsScreen';
import { PhotosScreen, PhotoLayout } from './src/screens/PhotosScreen';
import { FilesScreen } from './src/screens/FilesScreen';
import { SyncDrawer } from './src/components/sync-drawer';
import { PhotoPickerSheet } from './src/components/photo-picker-sheet';
import { TabButton } from './src/components/tab-button';
import { ContextMenuOverlay } from './src/components/context-menu-overlay';
import { FullscreenPhotoViewer } from './src/components/fullscreen-photo-viewer';
import { processSharedItem, ParsedShare } from './src/utils/share-receiver';
import { FolderHeader } from './src/components/folder-header';
import { useFolderNavigation } from './src/utils/folder-navigation';
import { ShareImportSheet } from './src/components/share-import-sheet';
import { TuiDrawer } from './src/components/tui-drawer';
import { FolderPickerSheet } from './src/components/folder-picker-sheet';
import { AnimationLockProvider, useAnimationLock } from './src/context/animation-lock';
import { handleCopyItem as clipboardHelper } from './src/utils/clipboard-utils';
import { handleShareItem as shareHelper, handleBulkShare as bulkShareHelper } from './src/utils/share-utils';
import * as SplashScreen from 'expo-splash-screen';
import { initFilesystemSync } from './src/utils/filesystem-sync';

// ─── Hooks ────────────────────────────────────────────────────────────────────
import { useAppData } from './src/hooks/use-app-data';
import { useSync } from './src/hooks/use-sync';
import { useDeepLink } from './src/hooks/use-deep-link';
import { useTabFilter } from './src/hooks/use-tab-filter';
import { useHeaderMenu } from './src/hooks/use-header-menu';
import { useEditItem } from './src/hooks/use-edit-item';
import { useBottomBarAnimation } from './src/hooks/use-bottom-bar-animation';

// ─── Components ───────────────────────────────────────────────────────────────
import { BottomBar } from './src/components/app/bottom-bar';
import { appStyles as styles } from './src/components/app/app-styles';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Main App ─────────────────────────────────────────────────────────────────

function MainApp() {
  const { colors, isDark, setThemeMode, themeLoaded } = useTheme();
  const { isLocked, lock, locked } = useAnimationLock();
  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });

  const [isAppReady, setIsAppReady] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = Dimensions.get('window');

  // ─── Data ─────────────────────────────────────────────────────────────────
  const { items, setItems, dataLoaded, refreshing, onRefresh } = useAppData();

  // ─── Sync ─────────────────────────────────────────────────────────────────
  useSync();



  // ─── App readiness ────────────────────────────────────────────────────────
  useEffect(() => {
    initFilesystemSync().catch((err: any) => {
      console.error('[App] Filesystem initialization/sync failed:', err);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded && dataLoaded && themeLoaded) {
      setIsAppReady(true);
    }
  }, [fontsLoaded, dataLoaded, themeLoaded]);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DumpType>('link');
  const [activeView, setActiveView] = useState<'main' | 'settings'>('main');
  const [sortAscending, setSortAscending] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFooterFocused, setIsFooterFocused] = useState(false);
  const [topHeaderHeight, setTopHeaderHeight] = useState(200);
  const [topBackdropHeight, setTopBackdropHeight] = useState(100);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [imageSizes, setImageSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [inputText, setInputText] = useState('');

  // ─── Photo sheet ──────────────────────────────────────────────────────────
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [photoSheetState, setPhotoSheetState] = useState({ isAllSelected: false, sortAscending: false });
  const [photoSheetTriggerSelectAll, setPhotoSheetTriggerSelectAll] = useState(0);
  const [photoSheetTriggerSort, setPhotoSheetTriggerSort] = useState(0);

  // ─── Fullscreen photo ─────────────────────────────────────────────────────
  const [activeFullscreenPhotoIndex, setActiveFullscreenPhotoIndex] = useState<number | null>(null);
  const [zoomStartBounds, setZoomStartBounds] = useState<PhotoLayout | null>(null);
  const [fullscreenPhotoSet, setFullscreenPhotoSet] = useState<DumpItem[]>([]);
  const measurePhotoRef = useRef<((id: string, callback: (bounds: PhotoLayout | null) => void) => void) | null>(null);

  // ─── Share / move drawers ─────────────────────────────────────────────────
  const [pendingShare, setPendingShare] = useState<ParsedShare | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isMoveDrawerOpen, setIsMoveDrawerOpen] = useState(false);
  const [isMoveDrawerMounted, setIsMoveDrawerMounted] = useState(false);
  const [moveDrawerItems, setMoveDrawerItems] = useState<DumpItem[]>([]);

  // ─── Sync Drawer ──────────────────────────────────────────────────────────
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const syncDrawerProgressAnim = useRef(new RNAnimated.Value(0)).current;

  // ─── Context menu ─────────────────────────────────────────────────────────
  const [contextMenuPhoto, setContextMenuPhoto] = useState<{ item: DumpItem; bounds: PhotoLayout } | null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const tabPagerRef = useRef<ScrollView>(null);
  const isTabScrollingRef = useRef(false);
  const mainInputRef = useRef<any>(null);
  const searchInputRef = useRef<any>(null);

  // ─── Animated deck transition ─────────────────────────────────────────────
  const shareDrawerProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const moveDrawerProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const screenScaleAnim = shareDrawerProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });
  const screenTranslateYAnim = shareDrawerProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const screenBorderRadiusAnim = shareDrawerProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 16] });

  // ─── Custom hooks ─────────────────────────────────────────────────────────
  const TAB_ORDER: DumpType[] = ['link', 'text', 'photo', 'file'];

  const scrollToTab = useCallback((tab: DumpType, animated = true) => {
    const index = TAB_ORDER.indexOf(tab);
    if (index === -1) return;
    tabPagerRef.current?.scrollTo({ x: index * windowWidth, y: 0, animated });
  }, [windowWidth]);

  const getActiveExpandedFolder = useCallback(() => {
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
      try { name = JSON.parse(expanded.value).name; } catch {}
      return { id: expanded.id, name };
    }
    return null;
  }, [items, activeTab, expandedFolders]);

  const {
    editingItemId,
    setEditingItemId,
    editText,
    setEditText,
    editLabelText,
    setEditLabelText,
    editStep,
    setEditStep,
    editInputRef,
    handleEditItem,
    handleSaveEdit,
    handleCancelEdit,
    handleCreateFolder,
  } = useEditItem({ items, setItems, activeTab, getActiveExpandedFolder, scrollToTab });

  const { sortedLinkItems, sortedTextItems, sortedPhotoItems, sortedFileItems, sortedItems } = useTabFilter({
    items,
    activeTab,
    sortAscending,
    searchQuery,
    editingItemId,
    editText,
  });

  const linkNav = useFolderNavigation(sortedLinkItems, expandedFolders, setExpandedFolders);
  const textNav = useFolderNavigation(sortedTextItems, expandedFolders, setExpandedFolders);
  const photoNav = useFolderNavigation(sortedPhotoItems, expandedFolders, setExpandedFolders);
  const fileNav = useFolderNavigation(sortedFileItems, expandedFolders, setExpandedFolders);

  const { headerMenuExpanded, toggleHeaderMenu, folderPlusButtonStyle, subButtonStyle } = useHeaderMenu({
    isSelectionMode,
    setIsSelectionMode,
    setSelectedIds,
  });

  const { bottomSpacerStyle, animatedBottomBarStyle } = useBottomBarAnimation({
    isPhotoSheetOpen,
    isFooterFocused,
    insets,
  });

  const activeFullscreenPhoto =
    activeFullscreenPhotoIndex !== null &&
    activeFullscreenPhotoIndex >= 0 &&
    activeFullscreenPhotoIndex < fullscreenPhotoSet.length
      ? fullscreenPhotoSet[activeFullscreenPhotoIndex]
      : null;

  // ─── Deep link / share URL ────────────────────────────────────────────────
  useDeepLink({
    mainInputRef,
    editInputRef,
    onParsedShare: (parsed) => {
      setPendingShare(parsed);
      setIsShareSheetOpen(true);
    },
  });

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Clear pending share after sheet closes
  useEffect(() => {
    if (!isShareSheetOpen) {
      const timer = setTimeout(() => setPendingShare(null), 250);
      return () => clearTimeout(timer);
    }
  }, [isShareSheetOpen]);

  // Mount/unmount move drawer with delay
  useEffect(() => {
    if (!isMoveDrawerOpen) {
      const timer = setTimeout(() => setIsMoveDrawerMounted(false), 250);
      return () => clearTimeout(timer);
    } else {
      setIsMoveDrawerMounted(true);
    }
  }, [isMoveDrawerOpen]);

  // Clear search on tab change
  useEffect(() => { setSearchQuery(''); }, [activeTab]);

  // Reset selection on tab change
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setActiveFullscreenPhotoIndex(null);
    setEditingItemId(null);
    Keyboard.dismiss();
  }, [activeTab]);

  // Sync pager on mount
  useEffect(() => {
    const index = TAB_ORDER.indexOf(activeTab);
    if (index > 0) {
      tabPagerRef.current?.scrollTo({ x: index * windowWidth, y: 0, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear selected IDs when leaving selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedIds(new Set());
      setSelectionMenuOpen(false);
    } else {
      setActiveFullscreenPhotoIndex(null);
    }
  }, [isSelectionMode]);

  // Dismiss keyboard on background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') Keyboard.dismiss();
    });
    return () => subscription.remove();
  }, []);

  // Dismiss footer focus on keyboard hide
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => setIsFooterFocused(false));
    return () => subscription.remove();
  }, []);

  // Pre-fetch image sizes
  useEffect(() => {
    const photos = items.filter((item) => item.type === 'photo');
    photos.forEach(async (photo) => {
      if (!imageSizes[photo.id]) {
        const uri = photo.value;
        if (uri.startsWith('ph://')) {
          try {
            const assetId = uri.slice(5);
            const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
            if (assetInfo) {
              setImageSizes((prev) => {
                if (prev[photo.id]) return prev;
                return { ...prev, [photo.id]: { width: assetInfo.width, height: assetInfo.height } };
              });
            } else {
              throw new Error('Asset info returned null');
            }
          } catch (error: any) {
            setImageSizes((prev) => {
              if (prev[photo.id]) return prev;
              return { ...prev, [photo.id]: { width: 100, height: 100 } };
            });
          }
        } else {
          RNImage.getSize(
            ensureFileUri(uri, photo.id),
            (width: number, height: number) => {
              setImageSizes((prev) => {
                if (prev[photo.id]) return prev;
                return { ...prev, [photo.id]: { width, height } };
              });
            },
            () => {
              setImageSizes((prev) => {
                if (prev[photo.id]) return prev;
                return { ...prev, [photo.id]: { width: 100, height: 100 } };
              });
            }
          );
        }
      }
    });
  }, [items]);

  // ─── Tab navigation ───────────────────────────────────────────────────────

  const switchTab = (tab: DumpType) => {
    if (isLocked()) return;
    setActiveTab(tab);
    scrollToTab(tab, false);
  };

  const handleTabPress = (tab: DumpType) => {
    if (isLocked()) return;
    if (activeView === 'settings') setActiveView('main');
    switchTab(tab);
  };

  // ─── Selection handlers ───────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isLocked()) return;
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

  // ─── Item action handlers ─────────────────────────────────────────────────

  const handleCopyItem = async (item: DumpItem) => {
    await clipboardHelper(item, setContextMenuPhoto);
  };

  const handleShareItem = async (item: DumpItem) => {
    await shareHelper(item, setContextMenuPhoto);
  };

  const handleDeleteItem = async (item: DumpItem) => {
    setContextMenuPhoto(null);
    if (item.type === 'folder') {
      let folderName = 'Folder';
      try { folderName = JSON.parse(item.value).name || 'Folder'; } catch {}
      const hasChildren = items.some((x) => x.folderId === item.id);
      const message = hasChildren
        ? 'Are you sure you want to delete this folder and all its contents?'
        : 'This folder is empty. Delete it?';
      Alert.alert(
        hasChildren ? `Delete Folder: "${folderName}"` : `Delete "${folderName}"?`,
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => {
              try {
                const updatedList = await deleteItem(item.id);
                setItems(updatedList);
              } catch (e) { console.error(e); }
            },
          },
        ]
      );
    } else {
      Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              if (item.type === 'file') {
                try {
                  const fileObj = JSON.parse(item.value);
                  if (fileObj.uri && fileObj.uri.startsWith('file://')) {
                    await FileSystem.deleteAsync(fileObj.uri, { idempotent: true });
                  }
                } catch (err) { console.warn('Failed to delete file from disk:', err); }
              }
              const updatedList = await deleteItem(item.id);
              setItems(updatedList);
            } catch (e) { console.error(e); }
          },
        },
      ]);
    }
  };

  const handleBulkDelete = async () => {
    if (isLocked()) return;
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${count === 1 ? 'this item' : `these ${count} items`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              let updatedList = items;
              for (const id of selectedIds) {
                const itemObj = items.find((x) => x.id === id);
                if (itemObj?.type === 'file') {
                  try {
                    const fileObj = JSON.parse(itemObj.value);
                    if (fileObj.uri?.startsWith('file://')) {
                      await FileSystem.deleteAsync(fileObj.uri, { idempotent: true });
                    }
                  } catch (err) { console.warn('Failed to delete bulk file from disk:', err); }
                }
                updatedList = await deleteItem(id);
              }
              setItems(updatedList);
              setSelectedIds(new Set());
              setIsSelectionMode(false);
            } catch (e) { console.error(e); }
          },
        },
      ]
    );
  };

  const handleBulkShare = async () => {
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    await bulkShareHelper(selectedItems, items, isLocked, setSelectedIds, setIsSelectionMode);
  };

  const handleBulkMoveToFolder = () => {
    if (isLocked()) return;
    if (selectedIds.size === 0) return;
    setSelectionMenuOpen(false);
    const moving = items.filter((x) => selectedIds.has(x.id));
    setMoveDrawerItems(moving);
    setIsMoveDrawerOpen(true);
  };

  // ─── Photo handlers ───────────────────────────────────────────────────────

  const handlePhotoPress = (item: DumpItem, startBounds: PhotoLayout) => {
    Keyboard.dismiss();
    mainInputRef.current?.blur();
    editInputRef.current?.blur();
    searchInputRef.current?.blur();
    setIsFooterFocused(false);
    lock(700);
    setZoomStartBounds(startBounds);
    const scopedPhotos = sortedPhotoItems.filter((x) => x.type !== 'folder' && x.folderId === item.folderId);
    setFullscreenPhotoSet(scopedPhotos);
    const index = scopedPhotos.findIndex((x) => x.id === item.id);
    if (index !== -1) setActiveFullscreenPhotoIndex(index);
  };

  const handleShareActivePhoto = async () => {
    if (!activeFullscreenPhoto) return;
    try {
      const resolvedUri = await resolveToLocalFileUri(activeFullscreenPhoto.value);
      if (Platform.OS === 'ios') {
        const isPng = resolvedUri.toLowerCase().endsWith('.png');
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const base64 = await FileSystem.readAsStringAsync(resolvedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Share.share({ url: `data:${mimeType};base64,${base64}` });
      } else {
        await Sharing.shareAsync(ensureFileUri(resolvedUri));
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
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const updatedList = await deleteItem(activeFullscreenPhoto.id);
            setItems(updatedList);
            setActiveFullscreenPhotoIndex(null);
          } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  // ─── File/photo picker handlers ───────────────────────────────────────────

  const handlePickImage = () => {
    if (isLocked()) return;
    setActiveFullscreenPhotoIndex(null);
    if (isPhotoSheetOpen) {
      setIsPhotoSheetOpen(false);
    } else {
      Keyboard.dismiss();
      setIsPhotoSheetOpen(true);
    }
  };

  const handlePickFile = async () => {
    if (isLocked()) return;
    try {
      setActiveFullscreenPhotoIndex(null);
      setIsPhotoSheetOpen(false);
      Keyboard.dismiss();

      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const destinationUri = `${FileSystem.documentDirectory}${Date.now()}_${asset.name}`;
      await FileSystem.copyAsync({ from: asset.uri, to: destinationUri });

      let artwork: string | null = null;
      const isAudio = /\.(mp3|m4a|wav|flac|ogg)$/i.test(asset.name);
      if (isAudio) artwork = await extractAudioArtwork(destinationUri);

      const fileData: any = { uri: destinationUri, name: asset.name, size: asset.size || 0, mimeType: asset.mimeType || '' };
      if (artwork) fileData.artwork = artwork;

      const saveFile = async (folderId?: string) => {
        const updated = await addItem('file', JSON.stringify(fileData), folderId);
        setItems(updated);
        setActiveTab('file');
        scrollToTab('file');
      };

      const folder = getActiveExpandedFolder();
      if (folder) { await saveFile(folder.id); } else { await saveFile(); }
    } catch (e) {
      console.error('Failed to pick file:', e);
      Alert.alert('File Pick Error', 'An error occurred while picking or saving the file.');
    }
  };

  const handleAddMultiplePhotos = async (uris: string[]) => {
    const savePhotos = async (folderId?: string) => {
      try {
        const persistentUris: string[] = [];
        for (const uri of uris) {
          if (uri.startsWith('ph://')) {
            const assetId = uri.slice(5);
            const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
            if (assetInfo && assetInfo.localUri) {
              const ext = assetInfo.localUri.split('.').pop() || 'jpg';
              const dest = `${FileSystem.documentDirectory}${Date.now()}_${assetId.replace(/[^a-zA-Z0-9]/g, '')}.${ext}`;
              await FileSystem.copyAsync({ from: assetInfo.localUri, to: dest });
              persistentUris.push(dest);
            } else {
              persistentUris.push(uri);
            }
          } else if (uri.startsWith('file://') && (uri.includes('/Caches/') || uri.includes('/cache/') || uri.includes('ImagePicker'))) {
            const fileName = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
            const dest = `${FileSystem.documentDirectory}${Date.now()}_${fileName}`;
            await FileSystem.copyAsync({ from: uri, to: dest });
            persistentUris.push(dest);
          } else {
            persistentUris.push(uri);
          }
        }
        const updated = await addMultiplePhotos(persistentUris, folderId);
        setItems(updated);
        setActiveTab('photo');
        scrollToTab('photo');
      } catch (e) { console.error('Failed to add multiple photos:', e); }
    };
    const folder = getActiveExpandedFolder();
    if (folder) { await savePhotos(folder.id); } else { await savePhotos(); }
  };

  const handleLaunchCamera = async () => {
    if (isLocked()) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to capture photos and record videos.');
      return;
    }
    try {
      setActiveFullscreenPhotoIndex(null);
      setIsPhotoSheetOpen(false);
      Keyboard.dismiss();

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], allowsEditing: false, quality: 0.8 });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const isVideo = asset.type === 'video' || asset.uri.toLowerCase().endsWith('.mp4') || asset.uri.toLowerCase().endsWith('.mov');

      if (isVideo) {
        let fileSize = 0;
        try {
          const info = await FileSystem.getInfoAsync(asset.uri);
          if (info.exists) fileSize = info.size || 0;
        } catch (err) { console.warn('Failed to retrieve video file size:', err); }

        setPendingShare({ type: 'file', value: asset.uri, name: `video_${Date.now()}.mp4`, mimeType: 'video/mp4', size: fileSize });
        setIsShareSheetOpen(true);
      } else {
        const { status: libStatus } = await MediaLibrary.requestPermissionsAsync();
        let targetUri = asset.uri;
        if (libStatus === 'granted') {
          try {
            const savedAsset = await MediaLibrary.createAssetAsync(asset.uri);
            if (savedAsset?.uri) targetUri = savedAsset.uri;
          } catch (err) { console.warn('Failed to save captured photo to media library:', err); }
        }
        setPendingShare({ type: 'photo', value: targetUri });
        setIsShareSheetOpen(true);
      }
    } catch (e) {
      console.error('Failed to launch camera:', e);
      Alert.alert('Camera Error', 'An error occurred while launching the camera.');
    }
  };

  const handleSubmit = async () => {
    if (isLocked()) return;
    Keyboard.dismiss();
    if (!inputText.trim()) return;
    const trimmed = inputText.trim();

    // Determine type by content (links vs plain text)
    const isUrl = /^https?:\/\//i.test(trimmed);
    const type: DumpType = isUrl ? 'link' : 'text';

    const saveText = async (folderId?: string) => {
      try {
        const updated = await addItem(type, trimmed, folderId);
        setItems(updated);
        setActiveTab(type);
        scrollToTab(type);
        setInputText('');
      } catch (e) { console.error('Failed to submit item:', e); }
    };

    const folder = getActiveExpandedFolder();
    if (folder) { await saveText(folder.id); } else { await saveText(); }
  };

  // ─── Folder movement ──────────────────────────────────────────────────────

  const handleSetItemFolder = async (itemId: string, folderId: string | undefined) => {
    setContextMenuPhoto(null);
    try {
      const updatedList = await setItemFolder(itemId, folderId);
      setItems(updatedList);
    } catch (e) { console.error('Failed to move item to folder:', e); }
  };

  const handleMoveToFolder = (item: DumpItem) => {
    setContextMenuPhoto(null);
    setMoveDrawerItems([item]);
    setIsMoveDrawerOpen(true);
  };

  const handleCancelMoveDrawer = () => {
    setIsMoveDrawerOpen(false);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleConfirmMove = async (targetFolderId: string | undefined) => {
    try {
      let updatedList = items;
      for (const item of moveDrawerItems) {
        updatedList = await setItemFolder(item.id, targetFolderId);
      }
      setItems(updatedList);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setIsMoveDrawerOpen(false);
    } catch (e) { console.error('Failed to move items:', e); }
  };


  // ─── Render guard ─────────────────────────────────────────────────────────

  if (!isAppReady) return null;

  // ─── Derived UI values ────────────────────────────────────────────────────

  const settingsButton = (
    <Pressable
      onPress={() => setIsSyncDrawerOpen(true)}
      style={({ pressed }) => [
        styles.themeToggleBtn,
        {
          borderColor: colors.primary,
          backgroundColor:
            isSyncDrawerOpen ? colors.primary + '25' : pressed ? colors.primary + '25' : 'transparent',
        },
      ]}
    >
      <RefreshCw size={16} color={colors.primary} />
    </Pressable>
  );

  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <Search size={18} color={isSearchFocused ? colors.primary : colors.mutedForeground} style={styles.searchIcon} />
      <TextInput
        ref={searchInputRef}
        placeholder="Search..."
        placeholderTextColor={colors.mutedForeground}
        value={searchQuery}
        editable={!locked}
        onChangeText={(text: string) => { if (isLocked()) return; setSearchQuery(text); }}
        onFocus={() => { if (isLocked()) return; setIsSearchFocused(true); setIsFooterFocused(false); }}
        onBlur={() => setIsSearchFocused(false)}
        style={[styles.searchInput, { color: colors.primary }]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchQuery.length > 0 && (
        <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.searchClearBtn}>
          <X size={16} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <RNAnimated.View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          transform: [{ scale: screenScaleAnim }, { translateY: screenTranslateYAnim }],
          borderRadius: screenBorderRadiusAnim,
          overflow: 'hidden',
        }}
      >
        <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />

          <View
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              setTopBackdropHeight(y + height);
            }}
            style={{ width: '100%' }}
          >
            {/* 01: HEADER */}
            <TuiHeader title="BootHub" subtitle="by BootlegYouki" Icon={Archive} rightElement={settingsButton} />

            {/* 02: TABS */}
            <View style={[styles.topContainer, { paddingBottom: 0 }]}>
              <View style={styles.navRow}>
                <TabButton isActive={activeView === 'main' && activeTab === 'link'} onPress={() => handleTabPress('link')} label="Links" Icon={Link2} />
                <TabButton isActive={activeView === 'main' && activeTab === 'text'} onPress={() => handleTabPress('text')} label="Texts" Icon={FileText} />
                <TabButton isActive={activeView === 'main' && activeTab === 'photo'} onPress={() => handleTabPress('photo')} label="Photos" Icon={ImageIcon} />
                <TabButton isActive={activeView === 'main' && activeTab === 'file'} onPress={() => handleTabPress('file')} label="Files" Icon={Paperclip} />
              </View>
            </View>
          </View>

          {false ? (
            null
          ) : (
            <>
              <View
                onLayout={(e) => {
                  const { y, height } = e.nativeEvent.layout;
                  setTopHeaderHeight(y + height);
                }}
                style={[styles.topContainer, { paddingTop: 0 }]}
              >
                {/* Section header row */}
                <View style={styles.sectionHeaderRow}>
                  {renderSearchBar()}
                  <View style={styles.headerActions}>
                    <Animated.View style={folderPlusButtonStyle}>
                      <Pressable
                        onPress={handleCreateFolder}
                        style={({ pressed }) => [
                          styles.headerActionBtn,
                          { borderColor: colors.primary, backgroundColor: pressed ? colors.primary + '25' : 'transparent', width: 48 },
                        ]}
                      >
                        <FolderPlus size={16} color={colors.primary} />
                      </Pressable>
                    </Animated.View>

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
                              : pressed ? colors.primary + '15' : 'transparent',
                            width: 48,
                          },
                        ]}
                      >
                        <CheckSquare size={16} color={colors.primary} />
                      </Pressable>
                    </Animated.View>

                    <Animated.View style={subButtonStyle}>
                      <Pressable
                        onPress={() => { setEditingItemId(null); setSortAscending(!sortAscending); }}
                        style={({ pressed }) => [
                          styles.headerActionBtn,
                          { borderColor: colors.primary, backgroundColor: pressed ? colors.primary + '25' : 'transparent', width: 48 },
                        ]}
                      >
                        {sortAscending ? <ArrowUp size={16} color={colors.primary} /> : <ArrowDown size={16} color={colors.primary} />}
                      </Pressable>
                    </Animated.View>

                    <Pressable
                      onPress={toggleHeaderMenu}
                      style={({ pressed }) => [
                        styles.headerActionBtn,
                        { borderColor: colors.primary, backgroundColor: pressed ? colors.primary + '25' : 'transparent' },
                      ]}
                    >
                      {headerMenuExpanded ? <X size={16} color={colors.primary} /> : <MoreHorizontal size={16} color={colors.primary} />}
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
                onLayout={() => scrollToTab(activeTab, false)}
                onScroll={(e) => {
                  if (!isTabScrollingRef.current) return;
                  const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
                  const tab = TAB_ORDER[Math.max(0, Math.min(index, TAB_ORDER.length - 1))];
                  if (tab !== activeTab) setActiveTab(tab);
                }}
                onScrollBeginDrag={() => { isTabScrollingRef.current = true; }}
                onScrollEndDrag={(e) => {
                  const vx = e.nativeEvent.velocity ? e.nativeEvent.velocity.x : 0;
                  if (vx === 0) isTabScrollingRef.current = false;
                }}
                onMomentumScrollEnd={(e) => {
                  isTabScrollingRef.current = false;
                  const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
                  const tab = TAB_ORDER[Math.max(0, Math.min(index, TAB_ORDER.length - 1))];
                  setActiveTab(tab);
                }}
                style={{ flex: 1 }}
                directionalLockEnabled
              >
                {/* Page 0: Links */}
                <View style={{ width: windowWidth, flex: 1 }}>
                  {linkNav.activeFolder && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 4, zIndex: 10, elevation: 10, backgroundColor: colors.background }}>
                      <FolderHeader name={linkNav.breadcrumb} onBack={linkNav.handleBack} />
                    </View>
                  )}
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'} />}
                  >
                    <LinksScreen sortedItems={sortedLinkItems} isSelectionMode={isSelectionMode && activeTab === 'link'} selectedIds={selectedIds} toggleSelect={toggleSelect}
                      onLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })} editingItemId={editingItemId} searchQuery={searchQuery} expandedFolders={expandedFolders} setExpandedFolders={setExpandedFolders} />
                  </ScrollView>
                </View>

                {/* Page 1: Texts */}
                <View style={{ width: windowWidth, flex: 1 }}>
                  {textNav.activeFolder && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 4, zIndex: 10, elevation: 10, backgroundColor: colors.background }}>
                      <FolderHeader name={textNav.breadcrumb} onBack={textNav.handleBack} />
                    </View>
                  )}
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'} />}
                  >
                    <TextsScreen sortedItems={sortedTextItems} isSelectionMode={isSelectionMode && activeTab === 'text'} selectedIds={selectedIds} toggleSelect={toggleSelect}
                      onLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })} editingItemId={editingItemId} searchQuery={searchQuery} expandedFolders={expandedFolders} setExpandedFolders={setExpandedFolders} />
                  </ScrollView>
                </View>

                {/* Page 2: Photos */}
                <View style={{ width: windowWidth, flex: 1 }}>
                  {photoNav.activeFolder && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 4, zIndex: 10, elevation: 10, backgroundColor: colors.background }}>
                      <FolderHeader name={photoNav.breadcrumb} onBack={photoNav.handleBack} />
                    </View>
                  )}
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'} />}
                  >
                    <PhotosScreen sortedItems={sortedPhotoItems} isSelectionMode={isSelectionMode && activeTab === 'photo'} selectedIds={selectedIds} toggleSelect={toggleSelect}
                      onPhotoPress={handlePhotoPress} onPhotoLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })} activePhotoId={activeFullscreenPhoto?.id}
                      registerMeasureFn={(fn) => { measurePhotoRef.current = fn; }} expandedFolders={expandedFolders} setExpandedFolders={setExpandedFolders} />
                  </ScrollView>
                </View>

                {/* Page 3: Files */}
                <View style={{ width: windowWidth, flex: 1 }}>
                  {fileNav.activeFolder && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 4, zIndex: 10, elevation: 10, backgroundColor: colors.background }}>
                      <FolderHeader name={fileNav.breadcrumb} onBack={fileNav.handleBack} />
                    </View>
                  )}
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={isDark ? '#27272A' : '#F4F4F5'} />}
                  >
                    <FilesScreen sortedItems={sortedFileItems} isSelectionMode={isSelectionMode && activeTab === 'file'} selectedIds={selectedIds} toggleSelect={toggleSelect}
                      onLongPress={(item, bounds) => setContextMenuPhoto({ item, bounds })} editingItemId={editingItemId} searchQuery={searchQuery} expandedFolders={expandedFolders} setExpandedFolders={setExpandedFolders} />
                  </ScrollView>
                </View>
              </ScrollView>
            </>
          )}

          {/* Fullscreen Photo Overlay */}
          {activeFullscreenPhotoIndex !== null && activeFullscreenPhoto && (
            <FullscreenPhotoViewer
              activeFullscreenPhotoIndex={activeFullscreenPhotoIndex}
              setActiveFullscreenPhotoIndex={setActiveFullscreenPhotoIndex}
              sortedItems={fullscreenPhotoSet}
              startBounds={zoomStartBounds}
              imageSizes={imageSizes}
              onShare={handleShareActivePhoto}
              onDelete={handleDeleteActivePhoto}
              measurePhotoRef={measurePhotoRef}
            />
          )}

          {/* Keyboard dismiss overlay when footer is focused */}
          {isFooterFocused && activeView === 'main' && (
            <Pressable
              style={[{ zIndex: 999, backgroundColor: 'transparent' }, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
              onPress={() => { Keyboard.dismiss(); mainInputRef.current?.blur(); editInputRef.current?.blur(); }}
            />
          )}

          {/* Search dismiss overlays */}
          {isSearchFocused && activeView === 'main' && (
            <>
              <Pressable
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topBackdropHeight, zIndex: 1001, backgroundColor: 'transparent' }}
                onPress={() => { Keyboard.dismiss(); searchInputRef.current?.blur(); }}
              />
              <Pressable
                style={{ position: 'absolute', top: topHeaderHeight, left: 0, right: 0, bottom: 0, zIndex: 1001, backgroundColor: 'transparent' }}
                onPress={() => { Keyboard.dismiss(); searchInputRef.current?.blur(); }}
              />
            </>
          )}

          {/* 04: BOTTOM BAR */}
          {activeView === 'main' && (
            <BottomBar
              colors={colors}
              isDark={isDark}
              animatedBottomBarStyle={animatedBottomBarStyle}
              activeFullscreenPhotoIndex={activeFullscreenPhotoIndex}
              isSelectionMode={isSelectionMode}
              editingItemId={editingItemId}
              locked={locked}
              selectedIds={selectedIds}
              sortedItems={sortedItems}
              selectionMenuOpen={selectionMenuOpen}
              setSelectionMenuOpen={setSelectionMenuOpen}
              onToggleSelectAll={handleToggleSelectAll}
              onBulkShare={handleBulkShare}
              onBulkMoveToFolder={handleBulkMoveToFolder}
              onBulkDelete={handleBulkDelete}
              editText={editText}
              setEditText={setEditText}
              editLabelText={editLabelText}
              setEditLabelText={setEditLabelText}
              editStep={editStep}
              setEditStep={setEditStep}
              editInputRef={editInputRef}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              activeTab={activeTab}
              items={items}
              inputText={inputText}
              setInputText={setInputText}
              mainInputRef={mainInputRef}
              isPhotoSheetOpen={isPhotoSheetOpen}
              photoSheetState={photoSheetState}
              onPickImage={handlePickImage}
              onPickFile={handlePickFile}
              onLaunchCamera={handleLaunchCamera}
              onSubmit={handleSubmit}
              setPhotoSheetTriggerSelectAll={setPhotoSheetTriggerSelectAll}
              setIsPhotoSheetOpen={setIsPhotoSheetOpen}
              setActiveFullscreenPhotoIndex={setActiveFullscreenPhotoIndex}
              setIsFooterFocused={setIsFooterFocused}
              isLocked={isLocked}
            />
          )}
        </View>

        {/* Photo sheet backdrop */}
        {isPhotoSheetOpen && (
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 430, backgroundColor: 'transparent', zIndex: 998 }}
            onPress={() => setIsPhotoSheetOpen(false)}
          />
        )}

        {/* Bottom spacer / photo picker */}
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

        {/* Share import drawer */}
        {pendingShare && (
          <TuiDrawer visible={isShareSheetOpen} onClose={() => setIsShareSheetOpen(false)} title={`Save shared ${pendingShare.type}`} progressAnim={shareDrawerProgressAnim}>
            <ShareImportSheet
              parsedShare={pendingShare}
              folders={items}
              onCancel={() => setIsShareSheetOpen(false)}
              onSave={async (folderId) => {
                setIsShareSheetOpen(false);
                try {
                  const processed = await processSharedItem(pendingShare);
                  if (processed) {
                    const updatedList = await getItems();
                    if (folderId && updatedList.length > 0) {
                      const finalUpdated = await setItemFolder(updatedList[0].id, folderId);
                      setItems(finalUpdated);
                    } else {
                      setItems(updatedList);
                    }
                    switchTab(processed.type);
                  } else {
                    Alert.alert('Save Failed', 'The shared item could not be processed.');
                  }
                } catch (err) {
                  Alert.alert('Error Processing Share', `An error occurred while saving the shared item:\n\n${err}`);
                }
              }}
            />
          </TuiDrawer>
        )}

        {/* Move drawer */}
        {isMoveDrawerMounted && (
          <TuiDrawer visible={isMoveDrawerOpen} onClose={handleCancelMoveDrawer} title="Move to Folder" progressAnim={moveDrawerProgressAnim}>
            <FolderPickerSheet items={items} activeTab={activeTab} movingItems={moveDrawerItems} onCancel={handleCancelMoveDrawer} onMove={handleConfirmMove} />
          </TuiDrawer>
        )}

        {/* Sync drawer */}
        <TuiDrawer 
          visible={isSyncDrawerOpen} 
          onClose={() => setIsSyncDrawerOpen(false)} 
          title="Sync Device" 
          progressAnim={syncDrawerProgressAnim}
          onBackdropPress={() => {
            if (Keyboard.metrics()) {
              Keyboard.dismiss();
            } else {
              setIsSyncDrawerOpen(false);
            }
          }}
        >
          <SyncDrawer visible={isSyncDrawerOpen} onClose={() => setIsSyncDrawerOpen(false)} />
        </TuiDrawer>

        {/* Context menu */}
        {contextMenuPhoto && (
          <ContextMenuOverlay
            contextMenuPhoto={contextMenuPhoto}
            imageSizes={imageSizes}
            onClose={() => setContextMenuPhoto(null)}
            onCopy={() => handleCopyItem(contextMenuPhoto.item)}
            onShare={() => handleShareItem(contextMenuPhoto.item)}
            onEdit={contextMenuPhoto.item.type !== 'photo' ? () => { setContextMenuPhoto(null); handleEditItem(contextMenuPhoto.item); } : undefined}
            onDelete={() => handleDeleteItem(contextMenuPhoto.item)}
            onMoveToFolder={() => handleMoveToFolder(contextMenuPhoto.item)}
            onRemoveFromFolder={() => handleSetItemFolder(contextMenuPhoto.item.id, undefined)}
          />
        )}
      </RNAnimated.View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AnimationLockProvider>
          <MainApp />
        </AnimationLockProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
