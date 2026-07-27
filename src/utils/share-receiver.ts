import * as FileSystem from 'expo-file-system/legacy';
import { addItem } from './storage';

const getUniqueDestinationUri = async (subfolder: 'images' | 'files', originalName: string): Promise<string> => {
  const base = FileSystem.documentDirectory || '';
  const safeBase = base.endsWith('/') ? base : base + '/';
  const folderPath = `${safeBase}${subfolder}/`;
  const sanitized = originalName.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim() || 'unnamed';
  
  let targetUri = folderPath + sanitized;
  let counter = 1;
  const dotIdx = sanitized.lastIndexOf('.');
  const baseName = dotIdx !== -1 ? sanitized.substring(0, dotIdx) : sanitized;
  const extName = dotIdx !== -1 ? sanitized.substring(dotIdx) : '';
  
  while ((await FileSystem.getInfoAsync(targetUri)).exists) {
    targetUri = `${folderPath}${baseName}_${counter}${extName}`;
    counter++;
  }
  return targetUri;
};

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
    
    let decodedValue = value;
    // Decode multiple times to handle double percent-encoding by URLQueryItem
    for (let i = 0; i < 3; i++) {
      if (decodedValue.includes('%')) {
        try {
          decodedValue = decodeURIComponent(decodedValue);
        } catch (e) {
          break;
        }
      } else {
        break;
      }
    }

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
        let actualSource = parsed.value;
        let fileName = parsed.value.split('/').pop() || `photo_${Date.now()}.jpg`;
        
        if (parsed.value.startsWith('ph://')) {
          const MediaLibrary = require('expo-media-library');
          const assetId = parsed.value.slice(5);
          try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
            if (assetInfo && assetInfo.localUri) {
              actualSource = assetInfo.localUri;
              fileName = assetInfo.filename || `${assetId.replace(/[^a-zA-Z0-9]/g, '')}.jpg`;
            }
          } catch (e) {
            console.warn('Failed to resolve ph:// URI in share receiver', e);
          }
        }
        
        const destinationUri = await getUniqueDestinationUri('images', fileName);
        try {
          try {
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}images/`, { intermediates: true });
          } catch (e) {}
          await FileSystem.copyAsync({ from: actualSource, to: destinationUri });
          await addItem('photo', destinationUri);
          return { type: 'photo', label: fileName };
        } catch (e) {
          // Fallback if copy fails
          await addItem('photo', parsed.value);
          return { type: 'photo', label: fileName };
        }
      }

      const fileName = parsed.value === 'pasteboard:image' ? `photo_${Date.now()}.jpg` : (parsed.value.split('/').pop() || `photo_${Date.now()}.jpg`);
      const destinationUri = await getUniqueDestinationUri('images', fileName);
      try {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}images/`, { intermediates: true });
      } catch (e) {}

      if (parsed.value === 'pasteboard:image') {
        const Clipboard = require('expo-clipboard');
        const hasImage = await Clipboard.hasImageAsync();
        if (!hasImage) {
          throw new Error('No image found on clipboard or clipboard permission denied.');
        }
        const img = await Clipboard.getImageAsync({ format: 'jpeg' });
        if (!img || !img.data) {
          throw new Error('Failed to retrieve image data from clipboard.');
        }
        let base64Data = img.data;
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }
        await FileSystem.writeAsStringAsync(destinationUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await addItem('photo', destinationUri);
        return { type: 'photo', label: fileName };
      }
      
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
      const destinationUri = await getUniqueDestinationUri('files', fileName);
      try {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}files/`, { intermediates: true });
      } catch (e) {}
      
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
    throw err;
  }
  return null;
};
