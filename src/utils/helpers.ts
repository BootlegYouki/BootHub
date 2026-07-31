import { Linking, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as SQLite from 'expo-sqlite';
import type { DumpType } from './storage';

export const formatBreakAll = (text: string) => {
  if (!text) return '';
  return text.split('').join('\u200b');
};

export const truncateText = (text: string, limit = 100) => {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
};

export const getWebsiteName = (url: string): string => {
  try {
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^:\/\n]+)/im);
    if (!match || !match[1]) return 'Website';
    const host = match[1].toLowerCase();
    
    // Check popular overrides
    const overrides: { [key: string]: string } = {
      // Social & Entertainment
      'github.com': 'GitHub',
      'google.com': 'Google',
      'youtube.com': 'YouTube',
      'facebook.com': 'Facebook',
      'twitter.com': 'Twitter',
      'x.com': 'X',
      'reddit.com': 'Reddit',
      'wikipedia.org': 'Wikipedia',
      'linkedin.com': 'LinkedIn',
      'instagram.com': 'Instagram',
      'spotify.com': 'Spotify',
      'apple.com': 'Apple',
      'microsoft.com': 'Microsoft',
      'discord.com': 'Discord',
      'amazon.com': 'Amazon',
      'netflix.com': 'Netflix',
      'twitch.tv': 'Twitch',
      'pinterest.com': 'Pinterest',
      'tumblr.com': 'Tumblr',
      'tiktok.com': 'TikTok',
      
      // Development, APIs & Hosting
      'figma.com': 'Figma',
      'notion.so': 'Notion',
      'slack.com': 'Slack',
      'stackoverflow.com': 'Stack Overflow',
      'stackexchange.com': 'Stack Exchange',
      'medium.com': 'Medium',
      'dev.to': 'DEV Community',
      'npmtrends.com': 'npm trends',
      'npmjs.com': 'npm',
      'yarnpkg.com': 'Yarn',
      'pnpm.io': 'pnpm',
      'vercel.com': 'Vercel',
      'netlify.app': 'Netlify',
      'heroku.com': 'Heroku',
      'digitalocean.com': 'DigitalOcean',
      'gitlab.com': 'GitLab',
      'bitbucket.org': 'Bitbucket',
      'openai.com': 'OpenAI',
      'chatgpt.com': 'ChatGPT',
      'anthropic.com': 'Anthropic',
      'claude.ai': 'Claude',
      'zoom.us': 'Zoom',
      'teams.microsoft.com': 'Microsoft Teams',
      'dribbble.com': 'Dribbble',
      'behance.net': 'Behance',
      'canva.com': 'Canva',
      'adobe.com': 'Adobe',
      'trello.com': 'Trello',
      'jira.com': 'Jira',
      'linear.app': 'Linear',
      'supabase.com': 'Supabase',
      'firebase.google.com': 'Firebase',
      'clerk.com': 'Clerk',
      'auth0.com': 'Auth0',
      'stripe.com': 'Stripe',
      'paypal.com': 'PayPal',
      'gmail.com': 'Gmail',
      'outlook.com': 'Outlook',
      'expo.dev': 'Expo',
      'reactnative.dev': 'React Native',
      'typescriptlang.org': 'TypeScript',
      'developer.mozilla.org': 'MDN Web Docs',
      'w3schools.com': 'W3Schools',
    };

    for (const [key, value] of Object.entries(overrides)) {
      if (host === key || host.endsWith('.' + key)) {
        return value;
      }
    }

    const parts = host.split('.');
    if (parts.length === 1) {
      return parts[0].split(/[-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    // Identify multi-part TLDs (like co.uk, com.au, net.nz)
    const secondLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    const isMultiPartTld = ['co', 'com', 'net', 'org', 'gov', 'edu', 'asn'].includes(secondLast) && last.length === 2;
    
    let nameIdx = parts.length - 2;
    if (isMultiPartTld && parts.length >= 3) {
      nameIdx = parts.length - 3;
    }
    
    const rawName = parts[nameIdx] || parts[0];
    return rawName.split(/[-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  } catch (e) {
    return 'Website';
  }
};



export const handleOpenUrl = async (url: string) => {
  const websiteName = getWebsiteName(url);

  Alert.alert(
    `Redirecting to ${websiteName}`,
    `Are you sure you want to open this link?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open',
        onPress: async () => {
          try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
              await Linking.openURL(url);
            }
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]
  );
};

export const ensureFileUri = (uri: string, entityId?: string) => {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
    return uri;
  }
  if (uri.startsWith('ph://') || uri.startsWith('assets-library://')) {
    return uri;
  }
  
  const base = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const safeBase = base?.endsWith('/') ? base : base + '/';
  
  let fileUri = uri;
  try {
    const parsed = JSON.parse(uri);
    if (parsed.uri) {
      fileUri = parsed.uri;
    }
  } catch {}
  
  if (fileUri.startsWith('file://')) {
    const docIdx = fileUri.indexOf('/Documents/');
    const cacheIdx = fileUri.indexOf('/Library/Caches/');
    if (docIdx !== -1 || cacheIdx !== -1) {
      if (docIdx !== -1) {
        const relativePath = fileUri.substring(docIdx + '/Documents/'.length);
        return safeBase + relativePath;
      }
      if (cacheIdx !== -1) {
        const relativePath = fileUri.substring(cacheIdx + '/Library/Caches/'.length);
        const cacheBase = FileSystem.cacheDirectory;
        const safeCacheBase = cacheBase?.endsWith('/') ? cacheBase : cacheBase + '/';
        return safeCacheBase + relativePath;
      }
    }
  }
  
  if (entityId) {
    // Determine if photo or file using a direct synchronous query on the SQLite DB
    let subfolder = '';
    try {
      const db = SQLite.openDatabaseSync('boothub_events.db');
      const row = db.getFirstSync<{ type: string }>('SELECT type FROM items WHERE id = ?', [entityId]);
      if (row) {
        if (row.type === 'photo') {
          subfolder = 'images/';
        } else if (row.type === 'file') {
          subfolder = 'files/';
        }
      }
    } catch (e) {
      console.error('[ensureFileUri] DB query failed', e);
    }
    
    let ext = '';
    try {
      const parsed = JSON.parse(uri);
      if (parsed.name) {
        const m = parsed.name.match(/(\.[a-zA-Z0-9]+)$/);
        ext = m ? m[1] : '';
      }
    } catch {
      const match = uri.match(/(\.[a-zA-Z0-9]+)$/);
      ext = match ? match[1] : '';
    }
    
    const fullPath = safeBase + subfolder + entityId + ext;
    return fullPath.startsWith('file://') ? fullPath : `file://${fullPath}`;
  }
  
  return uri;
};

export const getActualType = (value: string, fallbackType: DumpType): DumpType => {
  if (fallbackType === 'photo') return 'photo';
  if (fallbackType === 'file') return 'file';
  if (fallbackType === 'folder') return 'folder';
  const trimmed = value.trim();
  const isPhoto =
    /^ph:\/\//i.test(trimmed) ||
    /^assets-library:\/\//i.test(trimmed) ||
    /^data:image\//i.test(trimmed) ||
    /^file:\/\//i.test(trimmed) ||
    /\.(png|jpe?g|gif|webp|heic)$/i.test(trimmed) ||
    trimmed.includes('Containers/Data/Application') ||
    trimmed.includes('ExponentExperienceData') ||
    trimmed.includes('ImagePicker');

  if (isPhoto) return 'photo';
  if (/^https?:\/\//i.test(trimmed)) return 'link';
  return fallbackType;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const base64ToBytes = (base64: string): Uint8Array => {
  const cleaned = base64.replace(/\s/g, '');
  if (typeof atob !== 'undefined') {
    try {
      const binaryString = atob(cleaned);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.warn('[base64ToBytes] atob failed, using manual fallback:', e);
    }
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  let bufferLength = cleaned.length * 0.75;
  if (cleaned.endsWith('==')) bufferLength -= 2;
  else if (cleaned.endsWith('=')) bufferLength -= 1;
  
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  const safeLength = cleaned.length - (cleaned.length % 4);
  for (let i = 0; i < safeLength; i += 4) {
    const chunk = (lookup[cleaned.charCodeAt(i)] << 18) |
                  (lookup[cleaned.charCodeAt(i + 1)] << 12) |
                  (lookup[cleaned.charCodeAt(i + 2)] << 6) |
                  lookup[cleaned.charCodeAt(i + 3)];
                  
    bytes[p++] = (chunk >> 16) & 255;
    if (p < bufferLength) bytes[p++] = (chunk >> 8) & 255;
    if (p < bufferLength) bytes[p++] = chunk & 255;
  }
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  if (typeof btoa !== 'undefined') {
    try {
      let binary = '';
      const len = bytes.length;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk as any);
      }
      return btoa(binary);
    } catch (e) {
      console.warn('[bytesToBase64] btoa failed, using manual fallback:', e);
    }
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  const len = bytes.length;

  while (i < len) {
    const b0 = bytes[i++];
    const b1 = i < len ? bytes[i++] : NaN;
    const b2 = i < len ? bytes[i++] : NaN;

    const enc1 = b0 >> 2;
    const enc2 = ((b0 & 3) << 4) | (isNaN(b1) ? 0 : b1 >> 4);
    const enc3 = isNaN(b1) ? 64 : ((b1 & 15) << 2) | (isNaN(b2) ? 0 : b2 >> 6);
    const enc4 = isNaN(b2) ? 64 : b2 & 63;

    result += chars.charAt(enc1) + chars.charAt(enc2) + 
              (enc3 === 64 ? '=' : chars.charAt(enc3)) + 
              (enc4 === 64 ? '=' : chars.charAt(enc4));
  }
  return result;
};

// fallow-ignore-next-line complexity
export const extractAudioArtwork = async (fileUri: string): Promise<string | null> => {
  console.log(`[extractAudioArtwork] Starting extraction for: ${fileUri}`);
  try {
    // Read the first 1.5MB of the file (ID3 tag is guaranteed at the start of the file)
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 1500 * 1024, // ~1.5MB
    });

    console.log(`[extractAudioArtwork] Read base64 string. Length: ${base64?.length ?? 0}`);
    if (!base64 || base64.length === 0) {
      console.log('[extractAudioArtwork] Empty file or failed to read.');
      return null;
    }

    const data = base64ToBytes(base64);
    console.log(`[extractAudioArtwork] Decoded bytes. Length: ${data.length}`);

    // Check for ID3 header "ID3"
    if (data.length < 10) {
      console.log('[extractAudioArtwork] File too small to contain ID3 header.');
      return null;
    }
    if (data[0] !== 0x49 || data[1] !== 0x44 || data[2] !== 0x33) {
      console.log('[extractAudioArtwork] No ID3v2 tag found (missing ID3 signature).');
      return null;
    }

    const majorVersion = data[3];
    const revision = data[4];
    const flags = data[5];
    console.log(`[extractAudioArtwork] ID3v2 Version: 2.${majorVersion}.${revision}, Flags: 0x${flags.toString(16)}`);

    if (majorVersion < 2 || majorVersion > 4) {
      console.log(`[extractAudioArtwork] Unsupported ID3v2 major version: ${majorVersion}`);
      return null;
    }

    // Get synchsafe ID3 size
    const tagSize = ((data[6] & 0x7F) << 21) |
                    ((data[7] & 0x7F) << 14) |
                    ((data[8] & 0x7F) << 7) |
                    (data[9] & 0x7F);
    console.log(`[extractAudioArtwork] ID3 tag size: ${tagSize} bytes`);

    // De-unsynchronize if the unsynchronisation flag is set in the header (ID3v2.3/ID3v2.4)
    let finalData = data;
    const isUnsynchronised = (flags & 0x80) !== 0;
    if (isUnsynchronised) {
      console.log('[extractAudioArtwork] Unsynchronisation flag detected. De-unsynchronising...');
      const chunks: Uint8Array[] = [];
      let lastIdx = 10;
      for (let i = 10; i < data.length - 1; i++) {
        if (data[i] === 0xFF && data[i + 1] === 0x00) {
          chunks.push(data.subarray(lastIdx, i + 1));
          lastIdx = i + 2;
          i++; // skip the 0x00 byte
        }
      }
      if (lastIdx < data.length) {
        chunks.push(data.subarray(lastIdx));
      }
      const header = data.subarray(0, 10);
      let totalLength = 10;
      for (const chunk of chunks) {
        totalLength += chunk.length;
      }
      const decompressed = new Uint8Array(totalLength);
      decompressed.set(header, 0);
      let writeOffset = 10;
      for (const chunk of chunks) {
        decompressed.set(chunk, writeOffset);
        writeOffset += chunk.length;
      }
      finalData = decompressed;
      console.log(`[extractAudioArtwork] De-unsynchronised bytes length: ${finalData.length}`);
    }

    let offset = 10;
    
    // Check for Extended Header (flag bit 6 of flags byte)
    const hasExtendedHeader = (flags & 0x40) !== 0;
    if (hasExtendedHeader && finalData.length > 14) {
      console.log('[extractAudioArtwork] Extended Header detected.');
      if (majorVersion === 3) {
        const extHeaderSize = (finalData[10] << 24) | (finalData[11] << 16) | (finalData[12] << 8) | finalData[13];
        console.log(`[extractAudioArtwork] ID3v2.3 Extended Header size: ${extHeaderSize}`);
        offset = 10 + 4 + extHeaderSize;
      } else if (majorVersion === 4) {
        const extHeaderSize = ((finalData[10] & 0x7F) << 21) |
                              ((finalData[11] & 0x7F) << 14) |
                              ((finalData[12] & 0x7F) << 7) |
                              (finalData[13] & 0x7F);
        console.log(`[extractAudioArtwork] ID3v2.4 Extended Header size: ${extHeaderSize}`);
        offset = 10 + extHeaderSize;
      }
    }

    const maxOffset = Math.min(tagSize + 10, finalData.length);
    console.log(`[extractAudioArtwork] Starting frame scanning at offset ${offset} up to maxOffset ${maxOffset}`);

    while (offset < maxOffset - 10) {
      let frameId = '';
      let frameSize = 0;
      let frameFlags = 0;

      if (majorVersion === 2) {
        frameId = String.fromCharCode(finalData[offset], finalData[offset + 1], finalData[offset + 2]);
        frameSize = (finalData[offset + 3] << 16) | (finalData[offset + 4] << 8) | finalData[offset + 5];
        offset += 6;
      } else {
        frameId = String.fromCharCode(finalData[offset], finalData[offset + 1], finalData[offset + 2], finalData[offset + 3]);
        if (majorVersion === 4) {
          frameSize = ((finalData[offset + 4] & 0x7F) << 21) |
                      ((finalData[offset + 5] & 0x7F) << 14) |
                      ((finalData[offset + 6] & 0x7F) << 7) |
                      (finalData[offset + 7] & 0x7F);
        } else {
          frameSize = (finalData[offset + 4] << 24) |
                      (finalData[offset + 5] << 16) |
                      (finalData[offset + 6] << 8) |
                      finalData[offset + 7];
        }
        frameFlags = (finalData[offset + 8] << 8) | finalData[offset + 9];
        offset += 10;
      }

      if (!frameId.trim() || frameSize <= 0 || offset + frameSize > finalData.length) {
        break;
      }

      console.log(`[extractAudioArtwork] Frame: ${frameId}, Size: ${frameSize}, Next Offset: ${offset + frameSize}`);

      if (frameId === 'APIC' || frameId === 'PIC') {
        console.log(`[extractAudioArtwork] Found artwork frame: ${frameId}`);
        const frameData = finalData.subarray(offset, offset + frameSize);
        
        let frameOffset = 0;
        
        // Handle ID3v2.4 frame status flags / data length indicator if present
        if (majorVersion === 4) {
          const hasDataLengthIndicator = (frameFlags & 0x01) !== 0;
          if (hasDataLengthIndicator) {
            console.log('[extractAudioArtwork] Frame has Data Length Indicator. Skipping 4 bytes.');
            frameOffset += 4;
          }
        }

        const encoding = frameData[frameOffset];
        frameOffset += 1;
        
        let mimeType = '';
        if (frameId === 'APIC') {
          while (frameOffset < frameData.length && frameData[frameOffset] !== 0x00) {
            mimeType += String.fromCharCode(frameData[frameOffset]);
            frameOffset++;
          }
          frameOffset++; // skip null terminator
        } else {
          const format = String.fromCharCode(frameData[frameOffset], frameData[frameOffset + 1], frameData[frameOffset + 2]).toLowerCase();
          mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
          frameOffset += 3;
        }

        const pictureType = frameData[frameOffset];
        frameOffset += 1; // skip picture type
        console.log(`[extractAudioArtwork] APIC Details - Encoding: ${encoding}, MimeType: ${mimeType}, PictureType: ${pictureType}`);

        // Scan forward to find the magic header of common image formats (JPEG, PNG, GIF, WEBP)
        let imgStartOffset = -1;
        for (let i = frameOffset; i < frameData.length - 4; i++) {
          // JPEG: FF D8 FF
          if (frameData[i] === 0xFF && frameData[i + 1] === 0xD8 && frameData[i + 2] === 0xFF) {
            imgStartOffset = i;
            break;
          }
          // PNG: 89 50 4E 47
          if (frameData[i] === 0x89 && frameData[i + 1] === 0x50 && frameData[i + 2] === 0x4E && frameData[i + 3] === 0x47) {
            imgStartOffset = i;
            break;
          }
          // GIF: 47 49 46 38
          if (frameData[i] === 0x47 && frameData[i + 1] === 0x49 && frameData[i + 2] === 0x46 && frameData[i + 3] === 0x38) {
            imgStartOffset = i;
            break;
          }
          // WEBP / RIFF: 52 49 46 46 (RIFF)
          if (frameData[i] === 0x52 && frameData[i + 1] === 0x49 && frameData[i + 2] === 0x46 && frameData[i + 3] === 0x46) {
            imgStartOffset = i;
            break;
          }
        }

        if (imgStartOffset !== -1) {
          console.log(`[extractAudioArtwork] Aligned image start offset using magic header: ${imgStartOffset}`);
          frameOffset = imgStartOffset;
        } else {
          console.log('[extractAudioArtwork] Magic header not found. Falling back to null-terminator skipping.');
          // Skip Description string (null-terminated according to encoding)
          if (encoding === 1 || encoding === 2) {
            // UTF-16 terminated by 0x00 0x00
            while (frameOffset < frameData.length - 1 && !(frameData[frameOffset] === 0x00 && frameData[frameOffset + 1] === 0x00)) {
              frameOffset++;
            }
            frameOffset += 2;
          } else {
            // UTF-8 or ISO-8859-1 terminated by 0x00
            while (frameOffset < frameData.length && frameData[frameOffset] !== 0x00) {
              frameOffset++;
            }
            frameOffset++;
          }
        }

        const imageBytes = frameData.subarray(frameOffset);
        console.log(`[extractAudioArtwork] Extracted imageBytes length: ${imageBytes.length}`);
        
        if (imageBytes.length > 0) {
          const isJpeg = imageBytes[0] === 0xFF && imageBytes[1] === 0xD8 && imageBytes[2] === 0xFF;
          const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47;
          console.log(`[extractAudioArtwork] Image Header Check - JPEG: ${isJpeg}, PNG: ${isPng}`);
          
          if (!isJpeg && !isPng) {
            console.log(`[extractAudioArtwork] Warning: Unknown image header bytes: ${imageBytes[0]?.toString(16)}, ${imageBytes[1]?.toString(16)}, ${imageBytes[2]?.toString(16)}, ${imageBytes[3]?.toString(16)}`);
          }

          const base64Str = bytesToBase64(imageBytes);
          return `data:${mimeType || 'image/jpeg'};base64,${base64Str}`;
        }
        break;
      }

      offset += frameSize;
    }
  } catch (e) {
    console.warn('[extractAudioArtwork] Failed to extract audio artwork:', e);
  }
  return null;
};

export const formatSyncTimestamp = (date: Date = new Date()): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()}`;
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${dateStr} @ ${timeStr}`;
};

export const resolveToLocalFileUri = async (uri: string): Promise<string> => {
  let fileUri = uri;

  if (fileUri.startsWith('ph://')) {
    const assetId = fileUri.slice(5);
    const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
    if (assetInfo && assetInfo.localUri) {
      const ext = assetInfo.localUri.split('.').pop() || 'jpg';
      const tempPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}upload_${assetId.replace(/[^a-zA-Z0-9]/g, '')}.${ext}`;
      const info = await FileSystem.getInfoAsync(tempPath);
      if (!info.exists) {
        await FileSystem.copyAsync({ from: assetInfo.localUri, to: tempPath });
      }
      fileUri = tempPath;
    } else {
      throw new Error('Could not resolve local path for photo library asset.');
    }
  }

  if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
    const filename = fileUri.split('/').pop()?.split('?')[0] || 'temp_image.jpg';
    const tempFileUri = `${FileSystem.cacheDirectory}${Date.now()}_${filename}`;
    const downloadResult = await FileSystem.downloadAsync(fileUri, tempFileUri, {
      sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
    });
    fileUri = downloadResult.uri;
  }

  return ensureFileUri(fileUri);
};
