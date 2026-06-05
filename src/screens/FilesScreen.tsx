import React, { useRef, useState } from 'react';
import { View, StyleSheet, UIManager, findNodeHandle, Pressable } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Image } from 'expo-image';
import {
  File,
  FileText,
  FileAudio,
  FileVideo,
  FileCode,
  Archive,
  FolderOpen
} from 'lucide-react-native';

import { TuiContainer } from '../components/tui-container';
import { TuiText } from '../components/tui-text';
import { DumpItem } from '../utils/storage';
import { useTheme } from '../theme/theme-provider';
import { formatBytes, ensureFileUri } from '../utils/helpers';
import { FolderItem } from '../components/folder-item';

interface FilesScreenProps {
  sortedItems: DumpItem[];
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  editingItemId: string | null;
  searchQuery?: string;
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

interface FileItemProps {
  item: DumpItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  onLongPress?: (item: DumpItem, bounds: { x: number; y: number; width: number; height: number }) => void;
  isEditing: boolean;
}

export const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'rtf':
    case 'md':
      return FileText;
    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'flac':
    case 'ogg':
      return FileAudio;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
      return FileVideo;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'json':
    case 'html':
    case 'css':
    case 'py':
    case 'cpp':
    case 'c':
    case 'sh':
      return FileCode;
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z':
      return Archive;
    default:
      return File;
  }
};

export const getFileTypeLabel = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'PDF Document';
    case 'doc':
    case 'docx': return 'Word Document';
    case 'txt': return 'Plain Text';
    case 'rtf': return 'Rich Text';
    case 'md': return 'Markdown File';
    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'flac':
    case 'ogg': return 'Audio File';
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm': return 'Video File';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx': return 'TypeScript/JavaScript Source';
    case 'json': return 'JSON Configuration';
    case 'html': return 'HTML Document';
    case 'css': return 'Stylesheet';
    case 'py': return 'Python Script';
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z': return 'Compressed Archive';
    default: return ext ? `${ext.toUpperCase()} File` : 'File';
  }
};

const FileItem: React.FC<FileItemProps> = ({
  item, isSelected, isSelectionMode, toggleSelect, onLongPress, isEditing
}) => {
  const { colors, isDark } = useTheme();
  const itemRef = useRef<View>(null);

  // Parse file metadata from item.value JSON
  let fileInfo: any = { uri: '', name: 'unknown_file', size: 0, mimeType: '' };
  try {
    fileInfo = JSON.parse(item.value);
  } catch (e) {
    fileInfo = { uri: item.value, name: item.value.split('/').pop() || 'File', size: 0, mimeType: '' };
  }

  const handleLongPress = () => {
    if (!onLongPress || isSelectionMode) return;
    const node = findNodeHandle(itemRef.current);
    if (node != null) {
      UIManager.measure(node, (_x, _y, width, height, pageX, pageY) => {
        onLongPress(item, { x: pageX, y: pageY, width, height });
      });
    }
  };

  const handleOpenLocalFile = async () => {
    try {
      const fileUri = ensureFileUri(fileInfo.uri);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && fileUri) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      console.error('Failed to open local file:', e);
    }
  };

  const FileIconComponent = getFileIcon(fileInfo.name);
  const typeLabel = getFileTypeLabel(fileInfo.name);
  const isImageFile = /\.(png|jpe?g|gif|webp|heic)$/i.test(fileInfo.name);
  const artworkUri = fileInfo.artwork || (isImageFile ? fileInfo.uri : null);

  return (
    <View ref={itemRef}>
      <TuiContainer
        label={item.label}
        accentBorder={isEditing || isSelected}
        style={
          isEditing
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : isSelected
            ? { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }
            : undefined
        }
        onPress={isSelectionMode ? () => toggleSelect(item.id) : handleOpenLocalFile}
        onLongPress={!isSelectionMode && !isEditing ? handleLongPress : undefined}
      >
        <View pointerEvents="none" style={styles.fileRow}>
          <View style={[styles.iconBox, { borderColor: colors.primary, overflow: 'hidden' }]}>
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
          <View style={styles.infoColumn}>
            <TuiText size="md" weight="bold" style={{ color: colors.foreground }} numberOfLines={1}>
              {fileInfo.name}
            </TuiText>
            <TuiText size="sm" style={{ color: colors.mutedForeground, marginTop: 2 }}>
              {typeLabel} {fileInfo.size > 0 ? `• ${formatBytes(fileInfo.size)}` : ''}
            </TuiText>
          </View>
        </View>
      </TuiContainer>
    </View>
  );
};

export const FilesScreen: React.FC<FilesScreenProps> = ({
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
  const { colors } = useTheme();

  if (sortedItems.length === 0) {
    return (
      <TuiText
        size="sm"
        style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 32 }}
      >
        {searchQuery ? 'No matching files found.' : 'No files dumped yet.'}
      </TuiText>
    );
  }

  // Filter top-level items: items without folderId
  const topLevelItems = sortedItems.filter((item) => !item.folderId);

  return (
    <>
      {topLevelItems.map((item) => {
        if (item.type === 'folder') {
          let folderName = 'New Folder';
          try {
            folderName = JSON.parse(item.value).name || 'New Folder';
          } catch {}
          
          const children = sortedItems.filter((child) => child.folderId === item.id);
          const isExpanded = !!expandedFolders[item.id];
          
          return (
            <FolderItem
              key={item.id}
              id={item.id}
              name={folderName}
              count={children.length}
              isExpanded={isExpanded}
              onToggleExpand={() => setExpandedFolders((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              onLongPress={(bounds) => onLongPress?.(item, bounds)}
            >
              {children.map((child) => (
                <FileItem
                  key={child.id}
                  item={child}
                  isSelected={isSelectionMode && selectedIds.has(child.id)}
                  isSelectionMode={isSelectionMode}
                  toggleSelect={toggleSelect}
                  onLongPress={onLongPress}
                  isEditing={editingItemId === child.id}
                />
              ))}
            </FolderItem>
          );
        }

        return (
          <FileItem
            key={item.id}
            item={item}
            isSelected={isSelectionMode && selectedIds.has(item.id)}
            isSelectionMode={isSelectionMode}
            toggleSelect={toggleSelect}
            onLongPress={onLongPress}
            isEditing={editingItemId === item.id}
          />
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
});
