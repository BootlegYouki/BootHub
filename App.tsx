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
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  withTiming,
  runOnJS,
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import { ThemeProvider, useTheme } from './src/theme/theme-provider';
import { TuiHeader } from './src/components/tui-header';
import { TuiText } from './src/components/tui-text';
import { TuiContainer } from './src/components/tui-container';
import { BannerSvg } from './src/components/banner-svg';
import { getItems, deleteItem, addItem, addMultiplePhotos, DumpItem, DumpType } from './src/utils/storage';
import { ensureFileUri, getActualType } from './src/utils/helpers';
import { LinksScreen } from './src/screens/LinksScreen';
import { TextsScreen } from './src/screens/TextsScreen';
import { PhotosScreen, PhotoLayout } from './src/screens/PhotosScreen';
import { PhotoPickerSheet } from './src/components/photo-picker-sheet';

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
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState<boolean>(false);
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

  const filteredItems = items.filter((item) => getActualType(item.value, item.type) === activeTab);
  const sortedItems = sortAscending ? [...filteredItems].reverse() : filteredItems;

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
      [targetPadding, 12],
      'clamp'
    );

    const isFullscreen = activeFullscreenPhotoIndex !== null;
    const translateYVal = withTiming(isFullscreen ? 100 : 0, { duration: 250 });
    const opacity = withTiming(isFullscreen ? 0 : 1, { duration: 250 });

    return {
      paddingBottom: padding,
      opacity,
      transform: [{ translateY: translateYVal }],
    };
  });


  // Reset selection when tab changes
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setActiveFullscreenPhotoIndex(null);
  }, [activeTab]);

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

  const handleBulkShare = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((item) => selectedIds.has(item.id));

    try {
      if (selectedItems.length === 1 && selectedItems[0].type === 'photo') {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(ensureFileUri(selectedItems[0].value));
          return;
        }
      }

      const shareMessage = selectedItems.map((item) => item.value).join('\n');
      await Share.share({ message: shareMessage });
    } catch (e: any) {
      console.error('Sharing failed:', e);
      Alert.alert('Share Error', e?.message || String(e));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      let updatedList = items;
      for (const id of selectedIds) {
        updatedList = await deleteItem(id);
      }
      setItems(updatedList);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (e) {
      console.error(e);
    }
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
    handleCloseFullscreen: () => {},
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

    // Reset animation progress synchronously before the overlay mounts to prevent first-frame controls flash
    animationProgress.value = 0;

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
        animationProgress.value = 1;
        animationProgress.value = withTiming(0, { duration: 250 }, () => {
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
      // requestAnimationFrame ensures the native view has rendered and is ready
      requestAnimationFrame(() => {
        animationProgress.value = withTiming(1, { duration: 250 }, () => {
          runOnJS(setIsZooming)(null);
        });
      });
    }
  }, [isZooming]);

  useEffect(() => {
    latestStateRef.current = {
      activeFullscreenPhotoIndex,
      activeFullscreenPhoto,
      handleCloseFullscreen,
    };
  }, [activeFullscreenPhotoIndex, activeFullscreenPhoto, handleCloseFullscreen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture vertical swipes that are downward (dy > 0)
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Intercept downward vertical swipes to steal the responder from the FlatList
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
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
      },
    })
  ).current;

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: isZooming ? 0 : translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = isZooming 
      ? animationProgress.value 
      : interpolate(translateY.value, [0, 120], [1, 0], 'clamp');

    return {
      opacity,
    };
  });

  const controlsStyle = useAnimatedStyle(() => {
    if (isZooming === 'in') {
      return {
        opacity: interpolate(animationProgress.value, [0, 1], [0, 1], 'clamp'),
      };
    }
    if (isZooming === 'out') {
      return {
        opacity: 0,
      };
    }
    return {
      opacity: interpolate(translateY.value, [0, 100], [1, 0], 'clamp'),
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

    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      borderWidth,
      padding,
      borderColor: colors.primary + (isDark ? '40' : '26'),
      backgroundColor: colors.card,
      overflow: 'hidden',
    };
  });

  useEffect(() => {
    const loadItems = async () => {
      const data = await getItems();
      setItems(data);
    };
    loadItems();
  }, []);

  const [inputText, setInputText] = useState<string>('');

  const handlePickImage = () => {
    setActiveFullscreenPhotoIndex(null);
    if (isPhotoSheetOpen) {
      setIsPhotoSheetOpen(false);
    } else {
      Keyboard.dismiss();
      setIsPhotoSheetOpen(true);
    }
  };

  const handleAddMultiplePhotos = async (uris: string[]) => {
    try {
      const updated = await addMultiplePhotos(uris);
      setItems(updated);
      setActiveTab('photo');
    } catch (e) {
      console.error('Failed to add multiple photos:', e);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    const type = getActualType(trimmed, 'text');

    try {
      const updated = await addItem(type, trimmed);
      setItems(updated);
      setActiveTab(type);
      setInputText('');
    } catch (e) {
      console.error('Failed to submit item:', e);
    }
  };

  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });

  if (!fontsLoaded) {
    return <View style={[styles.loaderContainer, { backgroundColor: '#18181B' }]} />;
  }

  const toggleTheme = () => setThemeMode(isDark ? 'light' : 'dark');

  const dynamicSubtitle = activeTab === 'photo' ? 'photos' : activeTab + 's';

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
    <View style={{ flex: 1, backgroundColor: (activeFullscreenPhoto || isZooming) ? '#000000' : colors.background }}>
      <SafeAreaView 
        style={[
          styles.safeArea, 
          { backgroundColor: (activeFullscreenPhoto || isZooming) ? '#000000' : colors.background }
        ]} 
        edges={['top']}
      >
        <StatusBar style={(activeFullscreenPhoto || isZooming) ? 'light' : (isDark ? 'light' : 'dark')} />

        {/* 01: HEADER */}
        <TuiHeader
          title="BootHub"
          subtitle={dynamicSubtitle}
          Icon={Inbox}
          rightElement={themeToggle}
        />

        {/* 02: BANNER + TABS */}
        <View style={styles.topContainer}>
          <TuiContainer label="banner" accentBorder={true}>
            <View style={styles.bannerWrapper}>
              <BannerSvg color={colors.primary} />
            </View>
          </TuiContainer>

          <View style={styles.navRow}>
            <TabButton isActive={activeTab === 'link'} onPress={() => setActiveTab('link')} label="Links" Icon={Link2} />
            <TabButton isActive={activeTab === 'text'} onPress={() => setActiveTab('text')} label="Texts" Icon={FileText} />
            <TabButton isActive={activeTab === 'photo'} onPress={() => setActiveTab('photo')} label="Photos" Icon={ImageIcon} />
          </View>
        </View>

        {/* 03: SCROLLABLE FEED */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Section header row */}
          <View style={styles.sectionHeaderRow}>
            <TuiText size="lg" weight="bold" style={[styles.sectionTitle, { color: colors.primary }]}>
              {activeTab.toUpperCase()}S
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
                onPress={() => setSortAscending(!sortAscending)}
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

          {/* Active screen */}
          {activeTab === 'link' && (
            <LinksScreen
              sortedItems={sortedItems}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
            />
          )}
          {activeTab === 'text' && (
            <TextsScreen
              sortedItems={sortedItems}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
            />
          )}
          {activeTab === 'photo' && (
            <PhotosScreen
              sortedItems={sortedItems}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              onPhotoPress={handlePhotoPress}
              activePhotoId={activeFullscreenPhoto?.id}
              registerMeasureFn={(fn) => {
                measurePhotoRef.current = fn;
              }}
            />
          )}
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
            {/* Stark black backdrop that fades in/out separately, preventing the image from fading */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: '#000000' },
                backdropStyle,
              ]}
            />
            {isZooming ? (
              <Animated.View style={animatedTransitionStyle}>
                <Image
                  source={{ uri: ensureFileUri(activeFullscreenPhoto.value) }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={0}
                />
              </Animated.View>
            ) : (
              /* Horizontal paging FlatList */
              <FlatList
                data={sortedItems}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                initialScrollIndex={activeFullscreenPhotoIndex}
                getItemLayout={(data, index) => ({
                  length: windowWidth,
                  offset: windowWidth * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  const layoutWidth = e.nativeEvent.layoutMeasurement.width;
                  const index = Math.round(contentOffset / layoutWidth);
                  if (index >= 0 && index < sortedItems.length) {
                    setActiveFullscreenPhotoIndex(index);
                  }
                }}
                renderItem={({ item }) => (
                  <View style={{ width: windowWidth, height: windowHeight, justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                      source={{ uri: ensureFileUri(item.value) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                      transition={0}
                    />
                  </View>
                )}
                style={{ width: '100%', height: '100%' }}
              />
            )}

            {/* Top Controls Overlay */}
            <Animated.View
              pointerEvents="box-none"
              style={[
                {
                  position: 'absolute',
                  top: insets.top > 0 ? insets.top + 8 : 16,
                  left: 16,
                  right: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 950,
                },
                controlsStyle,
              ]}
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
            </Animated.View>

            {/* Bottom Controls Overlay */}
            <Animated.View
              pointerEvents="box-none"
              style={[
                {
                  position: 'absolute',
                  bottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
                  left: 16,
                  right: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 950,
                },
                controlsStyle,
              ]}
            >
              {/* Bottom Left: Share Button */}
              <Pressable
                onPress={handleShareActivePhoto}
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
            </Animated.View>
          </Animated.View>
        )}

        {/* 04: BOTTOM BAR */}
          <Animated.View
            style={[
              styles.bottomBar,
              {
                borderTopColor: colors.primary + '30',
                backgroundColor: colors.background,
                zIndex: 1000,
              },
              animatedBottomBarStyle,
            ]}
          >
            {isSelectionMode ? (
              <View style={styles.bottomBarRow}>
                <Pressable
                  onPress={handleBulkShare}
                  disabled={selectedIds.size === 0}
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
 
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <TuiText weight="bold" size="md" style={{ color: colors.foreground }}>
                    {selectedIds.size} {selectedIds.size === 1 ? 'Item' : 'Items'} Selected
                  </TuiText>
                </View>
 
                <Pressable
                  onPress={handleBulkDelete}
                  disabled={selectedIds.size === 0}
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
            ) : (
              <View style={styles.bottomBarRow}>
                <Pressable
                  onPress={handlePickImage}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                    },
                  ]}
                >
                  <ImageIcon size={16} color={colors.primary} />
                </Pressable>
 
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
                  placeholder="Dump link, text, or select photo..."
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  onFocus={() => {
                    setIsPhotoSheetOpen(false);
                    setActiveFullscreenPhotoIndex(null);
                  }}
                />
 
                <Pressable
                  onPress={handleSubmit}
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
          />
        )}
      </Animated.View>
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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 90 },
  bottomBar: { borderTopWidth: 1.5, paddingHorizontal: 16, paddingVertical: 12 },
  bottomBarRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1.5,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
  },
  iconBtn: { borderWidth: 1.5, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topContainer: { paddingHorizontal: 16, paddingTop: 16 },
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
  navRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 18, gap: 12 },
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
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: { letterSpacing: 1.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerActionBtn: { borderWidth: 1.5, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
