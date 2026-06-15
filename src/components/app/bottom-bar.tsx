import React from 'react';
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  Keyboard,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  Check,
  X,
  ListChecks,
  MoreHorizontal,
  Image as ImageIcon,
  Paperclip,
  FolderPlus,
  Trash2,
  Camera,
  Share as LucideShare,
} from 'lucide-react-native';
import { TuiText } from '../tui-text';
import { DumpItem, DumpType } from '../../utils/storage';
import { ThemeColors } from '../../theme/theme-provider';

interface BottomBarProps {
  // Theme
  colors: ThemeColors;
  isDark: boolean;

  // Animated style from hook
  animatedBottomBarStyle: any;

  // Visibility
  activeFullscreenPhotoIndex: number | null;

  // Modes
  isSelectionMode: boolean;
  editingItemId: string | null;
  locked: boolean;

  // Selection
  selectedIds: Set<string>;
  sortedItems: DumpItem[];
  selectionMenuOpen: boolean;
  setSelectionMenuOpen: (open: boolean) => void;
  onToggleSelectAll: () => void;
  onBulkShare: () => void;
  onBulkMoveToFolder: () => void;
  onBulkDelete: () => void;

  // Edit mode
  editText: string;
  setEditText: (text: string) => void;
  editInputRef: React.RefObject<any>;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, value: string) => void;
  activeTab: DumpType;
  items: DumpItem[];

  // Normal input mode
  inputText: string;
  setInputText: (text: string) => void;
  mainInputRef: React.RefObject<any>;
  isPhotoSheetOpen: boolean;
  photoSheetState: { isAllSelected: boolean; sortAscending: boolean };
  onPickImage: () => void;
  onPickFile: () => void;
  onLaunchCamera: () => void;
  onSubmit: () => void;
  setPhotoSheetTriggerSelectAll: React.Dispatch<React.SetStateAction<number>>;
  setIsPhotoSheetOpen: (open: boolean) => void;
  setActiveFullscreenPhotoIndex: (index: number | null) => void;
  setIsFooterFocused: (focused: boolean) => void;
  isLocked: () => boolean;
}

export function BottomBar({
  colors,
  isDark,
  animatedBottomBarStyle,
  activeFullscreenPhotoIndex,
  isSelectionMode,
  editingItemId,
  locked,
  selectedIds,
  sortedItems,
  selectionMenuOpen,
  setSelectionMenuOpen,
  onToggleSelectAll,
  onBulkShare,
  onBulkMoveToFolder,
  onBulkDelete,
  editText,
  setEditText,
  editInputRef,
  onCancelEdit,
  onSaveEdit,
  activeTab,
  items,
  inputText,
  setInputText,
  mainInputRef,
  isPhotoSheetOpen,
  photoSheetState,
  onPickImage,
  onPickFile,
  onLaunchCamera,
  onSubmit,
  setPhotoSheetTriggerSelectAll,
  setIsPhotoSheetOpen,
  setActiveFullscreenPhotoIndex,
  setIsFooterFocused,
  isLocked,
}: BottomBarProps) {
  return (
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
        <SelectionModeBar
          colors={colors}
          isDark={isDark}
          selectedIds={selectedIds}
          sortedItems={sortedItems}
          selectionMenuOpen={selectionMenuOpen}
          setSelectionMenuOpen={setSelectionMenuOpen}
          onToggleSelectAll={onToggleSelectAll}
          onBulkShare={onBulkShare}
          onBulkMoveToFolder={onBulkMoveToFolder}
          onBulkDelete={onBulkDelete}
        />
      ) : editingItemId !== null ? (
        <EditModeBar
          colors={colors}
          editText={editText}
          setEditText={setEditText}
          editInputRef={editInputRef}
          editingItemId={editingItemId}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          activeTab={activeTab}
          items={items}
          locked={locked}
          isLocked={isLocked}
          setIsPhotoSheetOpen={setIsPhotoSheetOpen}
          setActiveFullscreenPhotoIndex={setActiveFullscreenPhotoIndex}
          setIsFooterFocused={setIsFooterFocused}
        />
      ) : (
        <NormalInputBar
          colors={colors}
          inputText={inputText}
          setInputText={setInputText}
          mainInputRef={mainInputRef}
          isPhotoSheetOpen={isPhotoSheetOpen}
          photoSheetState={photoSheetState}
          onPickImage={onPickImage}
          onPickFile={onPickFile}
          onLaunchCamera={onLaunchCamera}
          onSubmit={onSubmit}
          setPhotoSheetTriggerSelectAll={setPhotoSheetTriggerSelectAll}
          locked={locked}
          isLocked={isLocked}
          setIsPhotoSheetOpen={setIsPhotoSheetOpen}
          setActiveFullscreenPhotoIndex={setActiveFullscreenPhotoIndex}
          setIsFooterFocused={setIsFooterFocused}
        />
      )}
    </Animated.View>
  );
}

// ─── Selection Mode Bar ───────────────────────────────────────────────────────

interface SelectionModeBarProps {
  colors: ThemeColors;
  isDark: boolean;
  selectedIds: Set<string>;
  sortedItems: DumpItem[];
  selectionMenuOpen: boolean;
  setSelectionMenuOpen: (open: boolean) => void;
  onToggleSelectAll: () => void;
  onBulkShare: () => void;
  onBulkMoveToFolder: () => void;
  onBulkDelete: () => void;
}

function SelectionModeBar({
  colors,
  isDark,
  selectedIds,
  sortedItems,
  selectionMenuOpen,
  setSelectionMenuOpen,
  onToggleSelectAll,
  onBulkShare,
  onBulkMoveToFolder,
  onBulkDelete,
}: SelectionModeBarProps) {
  const allSelected = sortedItems.length > 0 && sortedItems.every((item) => selectedIds.has(item.id));

  return (
    <View style={[styles.bottomBarRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
      {/* LEFT: Select-all */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onToggleSelectAll}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              borderColor: colors.primary,
              backgroundColor: allSelected
                ? colors.primary + '25'
                : pressed ? colors.primary + '15' : 'transparent',
            },
          ]}
        >
          <ListChecks size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* CENTER: count label */}
      <TuiText size="sm" weight="bold" style={{ color: colors.primary, textAlign: 'center' }}>
        {selectedIds.size} selected
      </TuiText>

      {/* RIGHT: ••• menu */}
      <View>
        {selectionMenuOpen && (
          <>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectionMenuOpen(false)} />
            <View
              style={[{
                position: 'absolute',
                bottom: 60,
                right: 0,
                width: 200,
                borderWidth: 1.5,
                borderColor: colors.primary,
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                zIndex: 2000,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 12,
                overflow: 'hidden',
              }]}
            >
              <Pressable
                onPress={() => { setSelectionMenuOpen(false); onBulkShare(); }}
                disabled={selectedIds.size === 0}
                style={({ pressed }) => [{
                  height: 44, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', paddingHorizontal: 16,
                  borderBottomWidth: 1, borderBottomColor: colors.primary + '20',
                  backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                  opacity: selectedIds.size === 0 ? 0.4 : 1,
                }]}
              >
                <TuiText size="sm" style={{ color: colors.foreground }}>Share</TuiText>
                <LucideShare size={16} color={colors.foreground} />
              </Pressable>

              <Pressable
                onPress={onBulkMoveToFolder}
                disabled={selectedIds.size === 0}
                style={({ pressed }) => [{
                  height: 44, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', paddingHorizontal: 16,
                  borderBottomWidth: 1, borderBottomColor: colors.primary + '20',
                  backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                  opacity: selectedIds.size === 0 ? 0.4 : 1,
                }]}
              >
                <TuiText size="sm" style={{ color: colors.foreground }}>Move To</TuiText>
                <FolderPlus size={16} color={colors.foreground} />
              </Pressable>

              <Pressable
                onPress={() => { setSelectionMenuOpen(false); onBulkDelete(); }}
                disabled={selectedIds.size === 0}
                style={({ pressed }) => [{
                  height: 44, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', paddingHorizontal: 16,
                  backgroundColor: pressed ? (colors.destructive || '#EF4444') + '15' : 'transparent',
                  opacity: selectedIds.size === 0 ? 0.4 : 1,
                }]}
              >
                <TuiText size="sm" style={{ color: colors.destructive || '#EF4444' }}>Delete</TuiText>
                <Trash2 size={16} color={colors.destructive || '#EF4444'} />
              </Pressable>
            </View>
          </>
        )}

        <Pressable
          onPress={() => setSelectionMenuOpen(!selectionMenuOpen)}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              borderColor: colors.primary,
              backgroundColor: selectionMenuOpen
                ? colors.primary + '25'
                : pressed ? colors.primary + '15' : 'transparent',
            },
          ]}
        >
          <MoreHorizontal size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Edit Mode Bar ────────────────────────────────────────────────────────────

interface EditModeBarProps {
  colors: ThemeColors;
  editText: string;
  setEditText: (text: string) => void;
  editInputRef: React.RefObject<any>;
  editingItemId: string;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, value: string) => void;
  activeTab: DumpType;
  items: DumpItem[];
  locked: boolean;
  isLocked: () => boolean;
  setIsPhotoSheetOpen: (open: boolean) => void;
  setActiveFullscreenPhotoIndex: (index: number | null) => void;
  setIsFooterFocused: (focused: boolean) => void;
}

function EditModeBar({
  colors,
  editText,
  setEditText,
  editInputRef,
  editingItemId,
  onCancelEdit,
  onSaveEdit,
  activeTab,
  items,
  locked,
  isLocked,
  setIsPhotoSheetOpen,
  setActiveFullscreenPhotoIndex,
  setIsFooterFocused,
}: EditModeBarProps) {
  const isFolder =
    editingItemId === 'temp-new-folder' ||
    items.find((x) => x.id === editingItemId)?.type === 'folder';

  const placeholder = isFolder
    ? 'Name your folder...'
    : activeTab === 'link' ? 'Edit link...' : activeTab === 'file' ? 'Rename file...' : 'Edit text...';

  return (
    <View style={styles.bottomBarRow}>
      <Pressable
        onPress={onCancelEdit}
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
        style={[styles.input, { borderColor: colors.primary, color: colors.foreground, backgroundColor: colors.card }]}
        value={editText}
        editable={!locked}
        onChangeText={(text) => {
          if (isLocked()) return;
          setEditText(text);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoFocus
        multiline
        blurOnSubmit={false}
        onFocus={() => {
          if (isLocked()) {
            editInputRef.current?.blur();
            return;
          }
          setIsPhotoSheetOpen(false);
          setActiveFullscreenPhotoIndex(null);
          setIsFooterFocused(true);
        }}
      />

      <Pressable
        onPress={() => onSaveEdit(editingItemId, editText)}
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
  );
}

// ─── Normal Input Bar ─────────────────────────────────────────────────────────

interface NormalInputBarProps {
  colors: ThemeColors;
  inputText: string;
  setInputText: (text: string) => void;
  mainInputRef: React.RefObject<any>;
  isPhotoSheetOpen: boolean;
  photoSheetState: { isAllSelected: boolean; sortAscending: boolean };
  onPickImage: () => void;
  onPickFile: () => void;
  onLaunchCamera: () => void;
  onSubmit: () => void;
  setPhotoSheetTriggerSelectAll: React.Dispatch<React.SetStateAction<number>>;
  locked: boolean;
  isLocked: () => boolean;
  setIsPhotoSheetOpen: (open: boolean) => void;
  setActiveFullscreenPhotoIndex: (index: number | null) => void;
  setIsFooterFocused: (focused: boolean) => void;
}

function NormalInputBar({
  colors,
  inputText,
  setInputText,
  mainInputRef,
  isPhotoSheetOpen,
  photoSheetState,
  onPickImage,
  onPickFile,
  onLaunchCamera,
  onSubmit,
  setPhotoSheetTriggerSelectAll,
  locked,
  isLocked,
  setIsPhotoSheetOpen,
  setActiveFullscreenPhotoIndex,
  setIsFooterFocused,
}: NormalInputBarProps) {
  return (
    <View style={styles.bottomBarRow}>
      {/* Photo picker toggle */}
      <View>
        <Pressable
          onPress={onPickImage}
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

      {/* File picker — hidden while photo sheet is open */}
      {!isPhotoSheetOpen && (
        <View>
          <Pressable
            onPress={onPickFile}
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

      {/* Text input */}
      <TextInput
        ref={mainInputRef}
        style={[styles.input, { borderColor: colors.primary, color: colors.foreground, backgroundColor: colors.card }]}
        value={inputText}
        editable={!locked}
        onChangeText={(text) => {
          if (isLocked()) return;
          setInputText(text);
        }}
        placeholder="Type Something"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        multiline
        blurOnSubmit={false}
        onFocus={() => {
          if (isLocked()) {
            mainInputRef.current?.blur();
            return;
          }
          setIsPhotoSheetOpen(false);
          setActiveFullscreenPhotoIndex(null);
          setIsFooterFocused(true);
        }}
      />

      {/* Right-side actions */}
      {isPhotoSheetOpen ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
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
                    : pressed ? colors.primary + '15' : 'transparent',
                },
              ]}
            >
              <ListChecks size={16} color={colors.primary} />
            </Pressable>
          </View>
          <View>
            <Pressable
              onPress={onLaunchCamera}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: pressed ? colors.primary + '25' : 'transparent',
                },
              ]}
            >
              <Camera size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View key="submit-action">
          <Pressable
            onPress={onSubmit}
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    lineHeight: 18,
  },
  iconBtn: { borderWidth: 1.5, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
