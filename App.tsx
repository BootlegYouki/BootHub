import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  withTiming,
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
import { PhotosScreen } from './src/screens/PhotosScreen';
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

  useEffect(() => {
    if (isPhotoSheetOpen) {
      photoSheetHeight.value = withTiming(300, { duration: 250 });
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
    return {
      paddingBottom: padding,
    };
  });


  // Reset selection when tab changes
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, [activeTab]);

  // Clear selected IDs when leaving selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedIds(new Set());
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

  useEffect(() => {
    const loadItems = async () => {
      const data = await getItems();
      setItems(data);
    };
    loadItems();
  }, []);

  const [inputText, setInputText] = useState<string>('');

  const handlePickImage = () => {
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

  const filteredItems = items.filter((item) => getActualType(item.value, item.type) === activeTab);
  const sortedItems = sortAscending ? [...filteredItems].reverse() : filteredItems;

  return (
    // No KeyboardAvoidingView — the Animated.View spacer below handles it
    // natively via Reanimated's useAnimatedKeyboard shared value.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

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
            />
          )}
        </ScrollView>

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
                onFocus={() => setIsPhotoSheetOpen(false)}
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

      {/* Backdrop overlay for closing on tap outside */}
      {isPhotoSheetOpen && (
        <Pressable
          style={{
            ...StyleSheet.absoluteFillObject,
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
  headerActionBtn: { borderWidth: 1.5, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
