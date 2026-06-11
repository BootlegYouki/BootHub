import * as FileSystem from 'expo-file-system/legacy';
import { addItem } from './storage';

export interface ParsedShare {
  type: 'link' | 'text' | 'photo' | 'file';
  value: string; // URL, text, or file path
  name?: string; // Original filename for files
  size?: number;
  mimeType?: string;
}

export const parseShareUrl = (urlStr: string): ParsedShare | null => {
  try {
    const queryString = urlStr.split('?')[1];
    if (!queryString) return null;
    
    // Parse query params manually to avoid URL constructor issues on some JS runtimes
    const params = new URLSearchParams(queryString);
    let type = params.get('type');
    const value = params.get('value');
    
    if (!type || !value) return null;
    if (type !== 'link' && type !== 'text' && type !== 'photo' && type !== 'file') return null;
    
    const decodedValue = decodeURIComponent(value);

    // Auto-classify direct photo links as photo instead of link
    if (type === 'link') {
      const isDirectImage = /\.(?:jpg|jpeg|png|webp|gif|heic)(?:\?.*)?$/i.test(decodedValue) || 
                            decodedValue.includes('images.unsplash.com');
      if (isDirectImage) {
        type = 'photo';
      }
    }

    return {
      type: type as 'link' | 'text' | 'photo' | 'file',
      value: decodedValue,
      name: params.get('name') || undefined,
      size: params.get('size') ? parseInt(params.get('size')!, 10) : undefined,
      mimeType: params.get('mimeType') || undefined,
    };
  } catch (e) {
    console.error('Failed to parse share URL:', e);
    return null;
  }
};

export const processSharedItem = async (parsed: ParsedShare): Promise<{ type: 'link' | 'text' | 'photo' | 'file'; label: string } | null> => {
  try {
    if (parsed.type === 'link' || parsed.type === 'text') {
      await addItem(parsed.type, parsed.value);
      return { type: parsed.type, label: parsed.value };
    }

    if (parsed.type === 'photo') {
      const isSystemAsset = parsed.value.startsWith('ph://') || parsed.value.startsWith('assets-library://') || (parsed.value.startsWith('content://') && !parsed.value.includes('ImagePicker'));
      if (isSystemAsset) {
        await addItem('photo', parsed.value);
        const fileName = parsed.value.split('/').pop() || `photo_${Date.now()}.jpg`;
        return { type: 'photo', label: fileName };
      }

      // Copy the photo to our app's document directory to ensure it is not deleted
      const fileName = parsed.value.split('/').pop() || `photo_${Date.now()}.jpg`;
      const destinationUri = `${FileSystem.documentDirectory}${Date.now()}_${fileName}`;
      
      // Ensure the source file uri has a file:// prefix if it's a local path
      let sourceUri = parsed.value;
      const isRemote = sourceUri.startsWith('http://') || sourceUri.startsWith('https://');

      if (!isRemote && !sourceUri.startsWith('file://') && !sourceUri.startsWith('content://') && !sourceUri.startsWith('ph://') && !sourceUri.startsWith('assets-library://')) {
        sourceUri = `file://${sourceUri}`;
      }

      if (isRemote) {
        await FileSystem.downloadAsync(sourceUri, destinationUri);
      } else {
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destinationUri,
        });
      }
      await addItem('photo', destinationUri);
      return { type: 'photo', label: fileName };
    }

    if (parsed.type === 'file') {
      // Copy the file to our app's document directory
      const fileName = parsed.name || parsed.value.split('/').pop() || `file_${Date.now()}`;
      const destinationUri = `${FileSystem.documentDirectory}${Date.now()}_${fileName}`;
      
      // Ensure source file has prefix
      let sourceUri = parsed.value;
      const isRemote = sourceUri.startsWith('http://') || sourceUri.startsWith('https://');

      if (!isRemote && !sourceUri.startsWith('file://') && !sourceUri.startsWith('content://')) {
        sourceUri = `file://${sourceUri}`;
      }

      if (isRemote) {
        await FileSystem.downloadAsync(sourceUri, destinationUri);
      } else {
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destinationUri,
        });
      }

      // Try to dynamically retrieve size if not provided
      let fileSize = parsed.size || 0;
      if (!fileSize) {
        try {
          const info = await FileSystem.getInfoAsync(destinationUri);
          if (info.exists) {
            fileSize = info.size || 0;
          }
        } catch (err) {
          console.warn('Failed to retrieve file size:', err);
        }
      }

      const fileData = {
        uri: destinationUri,
        name: fileName,
        size: fileSize,
        mimeType: parsed.mimeType || '',
      };
      await addItem('file', JSON.stringify(fileData));
      return { type: 'file', label: fileName };
    }
  } catch (err) {
    console.error('Failed to process shared item:', err);
  }
  return null;
};
