import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { DumpItem } from './storage';
import { resolveToLocalFileUri } from './helpers';

export const handleCopyItem = async (item: DumpItem, setContextMenuPhoto?: (val: any) => void) => {
  if (setContextMenuPhoto) setContextMenuPhoto(null);
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
