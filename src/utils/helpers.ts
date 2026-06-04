import { Linking, Platform } from 'react-native';
import { DumpType } from './storage';

export const formatBreakAll = (text: string) => {
  if (!text) return '';
  return text.split('').join('\u200b');
};

export const truncateText = (text: string, limit = 100) => {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
};

export const handleOpenUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } catch (e) {
    console.error(e);
  }
};

export const ensureFileUri = (uri: string) => {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
    return uri;
  }
  if (Platform.OS === 'ios') {
    if (uri.startsWith('ph://') || uri.startsWith('assets-library://')) {
      return uri;
    }
    if (!uri.startsWith('file://')) {
      return uri.startsWith('/') ? `file://${uri}` : `file:///${uri}`;
    }
  }
  return uri;
};

export const getActualType = (value: string, fallbackType: DumpType): DumpType => {
  if (fallbackType === 'photo') return 'photo';
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
