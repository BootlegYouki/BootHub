import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Folder, Inbox, ArrowLeft, FolderOpen, ChevronRight, Link2, FileText, Paperclip } from 'lucide-react-native';
import { Image } from 'expo-image';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';
import { DumpItem, DumpType } from '../utils/storage';
import { ensureFileUri } from '../utils/helpers';

interface FolderPickerSheetProps {
  items: DumpItem[];
  activeTab: DumpType;
  movingItems: DumpItem[];
  onCancel: () => void;
  onMove: (targetFolderId: string | undefined) => void;
}

const { height: screenHeight } = Dimensions.get('window');

export const FolderPickerSheet: React.FC<FolderPickerSheetProps> = ({
  items,
  activeTab,
  movingItems,
  onCancel,
  onMove,
}) => {
  const { colors, isDark } = useTheme();
  
  // Track active folder level inside the drawer
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);

  // Recursively build the path name for folders
  const getFolderPathName = (f: DumpItem, visited?: Set<string>): string => {
    const actualVisited = visited instanceof Set ? visited : new Set<string>();
    let name = 'Folder';
    try {
      name = JSON.parse(f.value).name;
    } catch {}
    if (f.folderId && !actualVisited.has(f.folderId)) {
      actualVisited.add(f.folderId);
      const parent = items.find((x) => x.id === f.folderId);
      if (parent) {
        return `${getFolderPathName(parent, actualVisited)} > ${name}`;
      }
    }
    return name;
  };

  const getFolderPath = (folderId: string | undefined): string => {
    if (!folderId) return 'Root';
    const folder = items.find((x) => x.id === folderId);
    if (!folder) return 'Folder';
    return getFolderPathName(folder);
  };

  // Helper to prevent folder loops (e.g. moving folder A into its own subfolders)
  const isInvalidTarget = (folderId: string): boolean => {
    const movingFolderIds = new Set(movingItems.filter((x) => x.type === 'folder').map((x) => x.id));
    
    const visited = new Set<string>();
    const checkCycle = (fid: string | undefined): boolean => {
      if (!fid) return false;
      if (visited.has(fid)) return false; // Break loop
      visited.add(fid);

      if (movingFolderIds.has(fid)) return true;
      const f = items.find((x) => x.id === fid);
      return f ? checkCycle(f.folderId) : false;
    };

    return checkCycle(folderId);
  };

  // Navigate back/up a level
  const handleBack = () => {
    if (!activeFolderId) return;
    const current = items.find((x) => x.id === activeFolderId);
    if (current) {
      setActiveFolderId(current.folderId);
    }
  };

  // Filter folders matching this active tab type, current level, and valid targets
  const visibleFolders = items.filter((x) => {
    if (x.type !== 'folder') return false;
    try {
      const obj = JSON.parse(x.value);
      if (obj.tab !== activeTab) return false;
    } catch {
      return false;
    }
    // Must be in the current navigated folder level
    if (x.folderId !== activeFolderId) return false;
    // Must not create a circular cycle
    if (isInvalidTarget(x.id)) return false;
    return true;
  });

  // Filter content items matching this active tab type and current level
  const visibleContentItems = items.filter((x) => {
    if (x.type === 'folder') return false;
    if (x.folderId !== activeFolderId) return false;
    return x.type === activeTab;
  });

  const isEmpty = visibleFolders.length === 0 && visibleContentItems.length === 0;

  const maxDrawerHeight = screenHeight * 0.7;
  const listMaxHeight = maxDrawerHeight - 160;

  return (
    <View style={styles.container}>
      {/* Path Breadcrumb & Navigation Header */}
      <View style={styles.navigationHeader}>
        {activeFolderId !== undefined && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backBtn,
              {
                borderColor: colors.primary,
                backgroundColor: pressed ? colors.primary + '25' : 'transparent',
              },
            ]}
          >
            <ArrowLeft size={16} color={colors.primary} />
          </Pressable>
        )}
        <View
          style={[
            styles.pathContainer,
            {
              borderColor: colors.primary,
              backgroundColor: colors.card,
            },
          ]}
        >
          <FolderOpen size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <TuiText weight="bold" size="sm" style={{ color: colors.foreground, flex: 1 }} numberOfLines={1}>
            {getFolderPath(activeFolderId)}
          </TuiText>
        </View>
      </View>

      {/* List of subfolders at this level */}
      <View style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          {/* Folders */}
          {visibleFolders.map((folder) => {
            let name = 'Folder';
            try {
              name = JSON.parse(folder.value).name;
            } catch {}

            return (
              <Pressable
                key={folder.id}
                onPress={() => setActiveFolderId(folder.id)}
                style={({ pressed }) => [
                  styles.folderRow,
                  {
                    borderColor: colors.primary + (isDark ? '30' : '15'),
                    backgroundColor: pressed ? colors.primary + (isDark ? '20' : '10') : colors.card,
                  },
                ]}
              >
                <Folder size={18} color={colors.primary} />
                <TuiText
                  size="sm"
                  style={{
                    color: colors.foreground,
                    marginLeft: 10,
                    flex: 1,
                  }}
                >
                  {name}
                </TuiText>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          })}

          {/* Separator if both folders and items are present */}
          {visibleFolders.length > 0 && visibleContentItems.length > 0 && (
            <View style={[styles.separator, { borderColor: colors.primary + (isDark ? '20' : '10') }]} />
          )}

          {/* Content Items */}
          {visibleContentItems.map((item) => {
            if (item.type === 'photo') {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.contentRow,
                    {
                      borderColor: colors.primary + (isDark ? '25' : '15'),
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <View style={[styles.thumbnailBox, { borderColor: colors.primary + (isDark ? '30' : '20') }]}>
                    <Image
                      source={{ uri: ensureFileUri(item.value) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                  <TuiText size="sm" style={{ color: colors.mutedForeground, marginLeft: 10, flex: 1 }} numberOfLines={1}>
                    Photo
                  </TuiText>
                </View>
              );
            }

            if (item.type === 'link') {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.contentRow,
                    {
                      borderColor: colors.primary + (isDark ? '25' : '15'),
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Link2 size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                  <TuiText size="sm" style={{ color: colors.mutedForeground, marginLeft: 10, flex: 1 }} numberOfLines={1}>
                    {item.value}
                  </TuiText>
                </View>
              );
            }

            if (item.type === 'text') {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.contentRow,
                    {
                      borderColor: colors.primary + (isDark ? '25' : '15'),
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <FileText size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                  <TuiText size="sm" style={{ color: colors.mutedForeground, marginLeft: 10, flex: 1 }} numberOfLines={1}>
                    {item.value}
                  </TuiText>
                </View>
              );
            }

            if (item.type === 'file') {
              let fileName = 'File';
              try {
                fileName = JSON.parse(item.value).name || 'File';
              } catch {}
              return (
                <View
                  key={item.id}
                  style={[
                    styles.contentRow,
                    {
                      borderColor: colors.primary + (isDark ? '25' : '15'),
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Paperclip size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                  <TuiText size="sm" style={{ color: colors.mutedForeground, marginLeft: 10, flex: 1 }} numberOfLines={1}>
                    {fileName}
                  </TuiText>
                </View>
              );
            }

            return null;
          })}

          {isEmpty && (
            <View style={[styles.emptyContainer, { borderColor: colors.primary + (isDark ? '40' : '20') }]}>
              <TuiText size="xs" style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                Empty Folder
              </TuiText>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Pressable
          onPress={onCancel}
          style={[
            styles.actionBtn,
            {
              borderColor: colors.destructive || '#EF4444',
              backgroundColor: 'transparent',
              marginRight: 10,
            },
          ]}
        >
          <TuiText weight="bold" style={{ color: colors.destructive || '#EF4444' }}>
            CANCEL
          </TuiText>
        </Pressable>

        <Pressable
          onPress={() => onMove(activeFolderId)}
          style={[
            styles.actionBtn,
            {
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
              borderColor: isDark ? '#FFFFFF' : '#000000',
            },
          ]}
        >
          <TuiText weight="bold" style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
            MOVE HERE
          </TuiText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: screenHeight * 0.58,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  backBtn: {
    borderWidth: 1.5,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathContainer: {
    flex: 1,
    borderWidth: 1.5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  listContent: {
    paddingBottom: 4,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 8,
  },
  emptyContainer: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginVertical: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 10,
    marginBottom: 8,
    opacity: 0.8,
  },
  thumbnailBox: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  separator: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  actionsContainer: {
    marginTop: 16,
    flexDirection: 'row',
    width: '100%',
  },
  actionBtn: {
    borderWidth: 1.5,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
});
