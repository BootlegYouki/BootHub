import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, UIManager, findNodeHandle } from 'react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { LinkPreview, previewCache, PreviewData } from '../components/link-preview';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { formatBreakAll, handleOpenUrl } from '../utils/helpers';
import { BaseFolderScreen, FolderScreenProps, FolderItemProps } from '../components/base-folder-screen';

type LinksScreenProps = FolderScreenProps;

type LinkItemProps = FolderItemProps;

const LinkItem: React.FC<LinkItemProps> = ({
  item,
  isSelected,
  isSelectionMode,
  toggleSelect,
  onLongPress,
  isEditing,
}) => {
  const { colors, isDark } = useTheme();
  const itemRef = useRef<View>(null);

  const handleLongPress = () => {
    if (!onLongPress || isSelectionMode) return;
    const node = findNodeHandle(itemRef.current);
    if (node != null) {
      UIManager.measure(node, (_x, _y, width, height, pageX, pageY) => {
        onLongPress(item, { x: pageX, y: pageY, width, height });
      });
    }
  };

  const [previewData, setPreviewData] = useState<PreviewData | null>(() => previewCache.get(item.value) || null);

  useEffect(() => {
    setPreviewData(previewCache.get(item.value) || null);
  }, [item.value]);

  const hasPhotoAndCaption = !!(previewData && previewData.image && previewData.title);

  return (
    <View ref={itemRef}>
      <TuiContainer
        label={item.label}
        badge={
          item.syncState === 'error'
            ? 'Error'
            : item.syncState === 'synced'
            ? 'Synced'
            : undefined
        }
        noPadding={true}
        accentBorder={isEditing || isSelected}
        style={
          isEditing
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : isSelected
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : undefined
        }
        onPress={
          isSelectionMode
            ? () => toggleSelect(item.id)
            : () => handleOpenUrl(item.value)
        }
        onLongPress={!isSelectionMode && !isEditing ? handleLongPress : undefined}
      >
        {!hasPhotoAndCaption && (
          <View style={styles.urlPadding} pointerEvents="none">
            <TuiText
              size="md"
              weight="bold"
              style={{ color: colors.primary, textDecorationLine: 'underline' }}
            >
              {formatBreakAll(item.value)}
            </TuiText>
          </View>
        )}
        <View pointerEvents="none">
          <LinkPreview url={item.value} hideDivider={hasPhotoAndCaption} onLoad={setPreviewData} />
        </View>
      </TuiContainer>
    </View>
  );
};

// fallow-ignore-next-line code-duplication
export const LinksScreen: React.FC<LinksScreenProps> = ({
  sortedItems,
  isSelectionMode,
  selectedIds,
  toggleSelect,
  onLongPress,
  editingItemId,
  searchQuery,
  expandedFolders,
  setExpandedFolders,
}) => {
  return (
    <BaseFolderScreen
      sortedItems={sortedItems}
      isSelectionMode={isSelectionMode}
      selectedIds={selectedIds}
      toggleSelect={toggleSelect}
      onLongPress={onLongPress}
      editingItemId={editingItemId}
      searchQuery={searchQuery}
      expandedFolders={expandedFolders}
      setExpandedFolders={setExpandedFolders}
      emptyText="Links"
      renderItem={(child) => (
        <LinkItem
          key={child.id}
          item={child}
          isSelected={isSelectionMode && selectedIds.has(child.id)}
          isSelectionMode={isSelectionMode}
          toggleSelect={toggleSelect}
          onLongPress={onLongPress}
          isEditing={editingItemId === child.id}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  urlPadding: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
});

