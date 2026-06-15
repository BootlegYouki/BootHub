import { Platform, Share, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import RNShare from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';
import { DumpItem } from './storage';
import { getActualType, ensureFileUri, resolveToLocalFileUri } from './helpers';

// fallow-ignore-next-line complexity
export const handleShareItem = async (item: DumpItem, setContextMenuPhoto?: (val: any) => void) => {
  if (setContextMenuPhoto) setContextMenuPhoto(null);
  try {
    const actualType = getActualType(item.value, item.type);
    if (actualType === 'photo') {
      const resolvedUri = await resolveToLocalFileUri(item.value);
      if (Platform.OS === 'ios') {
        const isPng = resolvedUri.toLowerCase().endsWith('.png');
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const base64 = await FileSystem.readAsStringAsync(resolvedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Share.share({
          url: `data:${mimeType};base64,${base64}`,
        });
      } else {
        await Sharing.shareAsync(ensureFileUri(resolvedUri));
      }
    } else if (actualType === 'file') {
      try {
        const fileObj = JSON.parse(item.value);
        const fileUri = ensureFileUri(fileObj.uri);
        try {
          await RNShare.open({
            url: fileUri,
            type: fileObj.mimeType || undefined,
          });
        } catch (err) {
          const isSharingAvailable = await Sharing.isAvailableAsync();
          if (isSharingAvailable && fileUri) {
            await Sharing.shareAsync(fileUri, {
              mimeType: fileObj.mimeType || undefined,
            });
          } else {
            Alert.alert('Share Error', 'Sharing is not available for this file.');
          }
        }
      } catch (e: any) {
        const isCancelError = /user did not share|cancel|dismiss/i.test(e?.message || String(e));
        if (!isCancelError) {
          Alert.alert('Share Error', e?.message || String(e));
        }
      }
    } else if (actualType === 'link') {
      if (Platform.OS === 'ios') {
        await Share.share({ url: item.value });
      } else {
        await Share.share({ message: item.value });
      }
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

// fallow-ignore-next-line complexity
export const handleBulkShare = async (
  selectedItems: DumpItem[],
  allItems: DumpItem[],
  isLocked: () => boolean,
  setSelectedIds: (set: Set<string>) => void,
  setIsSelectionMode: (val: boolean) => void
) => {
  if (isLocked()) return;
  if (selectedItems.length === 0) return;

  try {
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
        if (Platform.OS === 'ios') {
          const isPng = resolvedUri.toLowerCase().endsWith('.png');
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          const base64 = await FileSystem.readAsStringAsync(resolvedUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileUris.push(`data:${mimeType};base64,${base64}`);
        } else {
          fileUris.push(ensureFileUri(resolvedUri));
        }
      }
    }

    if (fileUris.length > 0) {
      try {
        if (fileUris.length === 1) {
          const isPng = fileUris[0].toLowerCase().endsWith('.png') || fileUris[0].startsWith('data:image/png');
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          if (fileUris[0].startsWith('data:')) {
            await Share.share({ url: fileUris[0] });
          } else {
            await RNShare.open({
              url: fileUris[0],
              type: mimeType,
            });
          }
        } else {
          await RNShare.open({ urls: fileUris });
        }
      } catch (err) {
        const firstFile = fileUris[0];
        if (firstFile.startsWith('data:')) {
          await Share.share({ url: firstFile });
        } else {
          const isSharingAvailable = await Sharing.isAvailableAsync();
          if (isSharingAvailable) {
            await Sharing.shareAsync(firstFile);
          } else {
            Alert.alert('Share Error', 'Sharing is not available.');
          }
        }
      }
    } else {
      const shareMessage = selectedItems.map((item) => item.value).join('\n');
      const firstLink = links[0]?.value;

      if (links.length === 1 && texts.length === 0) {
        if (Platform.OS === 'ios') {
          await Share.share({ url: firstLink });
        } else {
          await Share.share({ message: firstLink });
        }
      } else if (firstLink) {
        if (Platform.OS === 'ios') {
          await Share.share({ url: firstLink, message: shareMessage });
        } else {
          await Share.share({ message: shareMessage });
        }
      } else {
        await Share.share({ message: shareMessage });
      }
    }

    setSelectedIds(new Set());
    setIsSelectionMode(false);
  } catch (e: any) {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    const isCancelError = /user did not share|cancel|dismiss/i.test(e?.message || String(e));
    if (isCancelError) return;
    console.error('Sharing failed:', e);
  }
};
