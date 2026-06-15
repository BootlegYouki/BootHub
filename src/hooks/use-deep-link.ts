import { useEffect, useRef } from 'react';
import { Keyboard, Alert, Linking } from 'react-native';
import { parseShareUrl, ParsedShare } from '../utils/share-receiver';

interface UseDeepLinkOptions {
  mainInputRef: React.RefObject<any>;
  editInputRef: React.RefObject<any>;
  onParsedShare: (parsed: ParsedShare) => void;
}

export function useDeepLink({
  mainInputRef,
  editInputRef,
  onParsedShare,
}: UseDeepLinkOptions): void {
  const handledInitialShareUrl = useRef<string | null>(null);

  const handleDeepLink = async (url: string | null, source: 'initial' | 'event' = 'event') => {
    if (!url) return;
    if (source === 'initial' && handledInitialShareUrl.current === url) {
      return;
    }
    Keyboard.dismiss();
    mainInputRef.current?.blur();
    editInputRef.current?.blur();

    let parsed: ParsedShare | null = null;
    try {
      parsed = parseShareUrl(url);
    } catch (err) {
      Alert.alert('Parse Error', `Failed to parse deep link URL:\n${url}\n\nError: ${err}`);
    }

    if (parsed) {
      if (source === 'initial') {
        handledInitialShareUrl.current = url;
      }
      if (parsed.type === 'link') {
        try {
          const { preFetchLinkMetadata } = require('../components/link-preview');
          await preFetchLinkMetadata(parsed.value);
        } catch (err) {
          console.warn('[App] Failed to pre-fetch metadata:', err);
        }
      }
      onParsedShare(parsed);
    } else {
      Alert.alert('Share Link Received', `URL: ${url}\n\nCould not identify any type/value to import.`);
    }
  };

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, 'event');
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url, 'initial');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
