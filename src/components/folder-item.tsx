import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, UIManager, findNodeHandle } from 'react-native';
import { Folder, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react-native';

import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface FolderItemProps {
  id: string;
  name: string;
  count: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLongPress: (bounds: { x: number; y: number; width: number; height: number }) => void;
  children?: React.ReactNode;
  childrenContainerStyle?: any;
}

export const FolderItem: React.FC<FolderItemProps> = ({
  id,
  name,
  count,
  isExpanded,
  onToggleExpand,
  onLongPress,
  children,
  childrenContainerStyle,
}) => {
  const { colors } = useTheme();
  const folderRef = useRef<View>(null);

  const handleLongPress = () => {
    const node = findNodeHandle(folderRef.current);
    if (node != null) {
      UIManager.measure(node, (_x, _y, width, height, pageX, pageY) => {
        onLongPress({ x: pageX, y: pageY, width, height });
      });
    }
  };

  return (
    <View ref={folderRef} style={styles.container}>
      <Pressable
        onPress={onToggleExpand}
        onLongPress={handleLongPress}
        style={({ pressed }) => [
          styles.folderHeader,
          {
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.primary + '15' : colors.card,
          },
        ]}
      >
        <View style={styles.leftRow}>
          {isExpanded ? (
            <FolderOpen size={18} color={colors.primary} style={styles.icon} />
          ) : (
            <Folder size={18} color={colors.primary} style={styles.icon} />
          )}
          <TuiText weight="bold" size="md" style={{ color: colors.foreground }}>
            {name}
          </TuiText>
          <TuiText size="sm" style={{ color: colors.mutedForeground, marginLeft: 6 }}>
            ({count})
          </TuiText>
        </View>
        
        {isExpanded ? (
          <ChevronDown size={18} color={colors.primary} />
        ) : (
          <ChevronRight size={18} color={colors.primary} />
        )}
      </Pressable>

      {isExpanded && (
        <View
          style={[
            styles.defaultChildrenContainer,
            { borderLeftColor: colors.primary + '26' },
            childrenContainerStyle,
          ]}
        >
          {count === 0 ? (
            <View style={[styles.emptyContainer, { borderColor: colors.primary + '35' }]}>
              <TuiText size="sm" style={{ color: colors.mutedForeground, fontStyle: 'italic' }}>
                Empty Folder
              </TuiText>
            </View>
          ) : (
            children
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 6,
  },
  folderHeader: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  defaultChildrenContainer: {
    width: '100%',
    paddingLeft: 12,
    borderLeftWidth: 1.5,
    marginTop: 6,
    flexDirection: 'column',
    gap: 8,
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
