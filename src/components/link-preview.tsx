import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

export interface PreviewData {
  image: string | null;
  title: string | null;
  description: string | null;
}

interface LinkPreviewProps {
  url: string;
  hideDivider?: boolean;
  onLoad?: (data: PreviewData | null) => void;
}

// In-memory cache to prevent multiple fetches of the same URL in a single session
export const previewCache = new Map<string, PreviewData | null>();

const getStorageKeyForUrl = (url: string) => {
  return `@boothub_preview_cache:${encodeURIComponent(url)}`;
};

// Robust HTML entity decoder
const decodeHtmlEntities = (str: string) => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#064;/g, '@')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
};

const extractMetaTags = (html: string): { [key: string]: string } => {
  const metaTags: { [key: string]: string } = {};
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let match;
  
  while ((match = metaRegex.exec(html)) !== null) {
    const content = match[1];
    const propertyMatch = content.match(/(?:property|name)=["']([^"']+)["']/i);
    const contentMatch = content.match(/content=["']([^"']+)["']/i);
    
    if (propertyMatch && contentMatch) {
      const key = propertyMatch[1].toLowerCase();
      const val = contentMatch[1];
      metaTags[key] = val;
    }
  }
  
  return metaTags;
};

// Check if a URL points directly to an image asset
const isDirectImageUrl = (url: string) => {
  return (
    /\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(url) ||
    url.includes('images.unsplash.com')
  );
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 2000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const preFetchLinkMetadata = async (url: string): Promise<PreviewData | null> => {
  // 1. Check in-memory cache
  if (previewCache.has(url)) {
    return previewCache.get(url) || null;
  }

  // 2. Handle direct image
  if (isDirectImageUrl(url)) {
    const filename = url.substring(url.lastIndexOf('/') + 1).split('?')[0];
    const directData: PreviewData = {
      image: url,
      title: filename || 'Direct Image',
      description: 'Direct Image Link',
    };
    previewCache.set(url, directData);
    return directData;
  }

  // 3. Check AsyncStorage cache
  const cacheKey = getStorageKeyForUrl(url);
  try {
    const cachedRaw = await AsyncStorage.getItem(cacheKey);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as PreviewData;
      previewCache.set(url, parsed);
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to read persistent preview cache in prefetch:', e);
  }

  // 4. Scrape webpage
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    }, 2000);
    const html = await response.text();

    const metaTags = extractMetaTags(html);
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const htmlTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;
    const ogTitle = metaTags['og:title'] || metaTags['twitter:title'];
    const title = ogTitle ? decodeHtmlEntities(ogTitle) : htmlTitle;
    
    const ogDesc = metaTags['og:description'] || metaTags['twitter:description'] || metaTags['description'];
    const description = ogDesc ? decodeHtmlEntities(ogDesc) : null;
    
    const ogImage = metaTags['og:image'] || metaTags['twitter:image'];
    const image = ogImage ? decodeHtmlEntities(ogImage) : null;

    const parsedData: PreviewData = {
      image,
      title,
      description,
    };

    const isValidData = !!(parsedData.image || parsedData.title);
    const finalData = isValidData ? parsedData : null;

    previewCache.set(url, finalData);

    if (finalData) {
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(finalData));
      } catch (e) {
        console.warn('Failed to save to persistent cache in prefetch:', e);
      }
    }
    return finalData;
  } catch (err) {
    console.warn('Failed to load link preview in prefetch for:', url, err);
    previewCache.set(url, null);
    return null;
  }
};

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, hideDivider = false, onLoad }) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState<boolean>(() => {
    return !previewCache.has(url);
  });
  const [data, setData] = useState<PreviewData | null>(() => {
    return previewCache.get(url) || null;
  });
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.65],
  });

  useEffect(() => {
    onLoad?.(data);
  }, [data, onLoad]);

  useEffect(() => {
    let active = true;

    const hasCache = previewCache.has(url);
    setLoading(!hasCache);
    setData(previewCache.get(url) || null);

    const fetchMetadata = async () => {
      // 1. Check Tier 1: In-memory Cache (Synchronous)
      if (previewCache.has(url)) {
        return;
      }

      // 2. Handle Direct Image Link
      if (isDirectImageUrl(url)) {
        const filename = url.substring(url.lastIndexOf('/') + 1).split('?')[0];
        const directData: PreviewData = {
          image: url,
          title: filename || 'Direct Image',
          description: 'Direct Image Link',
        };
        previewCache.set(url, directData);
        if (active) setData(directData);
        return;
      }

      // 3. Check Tier 2: Persistent Storage Cache (Asynchronous)
      setLoading(true);
      const cacheKey = getStorageKeyForUrl(url);
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as PreviewData;
          previewCache.set(url, parsed);
          if (active) {
            setData(parsed);
            setLoading(false);
          }
          return;
        }
      } catch (e) {
        console.warn('Failed to read persistent preview cache:', e);
      }

      // 4. Scrape Webpage for Open Graph Tags (Tier 3: Network Scraper)
      try {
        const response = await fetchWithTimeout(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
          }
        }, 2000);
        const html = await response.text();

        const metaTags = extractMetaTags(html);
        
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const htmlTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;
        const ogTitle = metaTags['og:title'] || metaTags['twitter:title'];
        const title = ogTitle ? decodeHtmlEntities(ogTitle) : htmlTitle;
        
        const ogDesc = metaTags['og:description'] || metaTags['twitter:description'] || metaTags['description'];
        const description = ogDesc ? decodeHtmlEntities(ogDesc) : null;
        
        const ogImage = metaTags['og:image'] || metaTags['twitter:image'];
        const image = ogImage ? decodeHtmlEntities(ogImage) : null;

        const parsedData: PreviewData = {
          image,
          title,
          description,
        };

        const isValidData = !!(parsedData.image || parsedData.title);
        const finalData = isValidData ? parsedData : null;

        // Cache in memory (even if null)
        previewCache.set(url, finalData);

        // Persist in AsyncStorage if valid
        if (finalData) {
          try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(finalData));
          } catch (e) {
            console.warn('Failed to save to persistent preview cache:', e);
          }
        }
        
        if (active) {
          setData(finalData);
        }
      } catch (err) {
        console.warn('Failed to load link preview for:', url, err);
        previewCache.set(url, null);
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMetadata();

    return () => {
      active = false;
    };
  }, [url]);

  const dividerColor = colors.primary + '30';
  const trayBg = isDark ? '#202023' : '#F4F4F6';

  const skeletonMutedBg = isDark ? '#27272A' : '#E4E4E7';

  if (loading) {
    return (
      <View style={styles.previewWrapper}>
        {!hideDivider && (
          <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
        )}
        <Animated.View 
          style={[
            styles.imageSection, 
            { 
              backgroundColor: skeletonMutedBg, 
              opacity, 
              borderBottomColor: dividerColor,
            }
          ]} 
        />
        <View style={[styles.infoSection, { backgroundColor: trayBg }]}>
          <Animated.View 
            style={{ 
              width: '60%', 
              height: 12, 
              backgroundColor: skeletonMutedBg, 
              opacity, 
            }} 
          />
          <Animated.View 
            style={{ 
              width: '90%', 
              height: 8, 
              backgroundColor: skeletonMutedBg, 
              opacity, 
              marginTop: 8, 
            }} 
          />
          <Animated.View 
            style={{ 
              width: '75%', 
              height: 8, 
              backgroundColor: skeletonMutedBg, 
              opacity, 
              marginTop: 4, 
            }} 
          />
        </View>
      </View>
    );
  }

  if (!data || (!data.image && !data.title)) {
    return <View style={{ height: 12 }} />; // Add bottom spacing if no preview is available
  }

  return (
    <View style={styles.previewWrapper}>
      {/* 1. Divider line below the Link URL */}
      {!hideDivider && (
        <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
      )}

      {/* 2. Edge-to-edge Image Section */}
      {data.image && (
        <View style={[styles.imageSection, { borderBottomColor: dividerColor }]}>
          <Image
            source={{ uri: data.image }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </View>
      )}

      {/* 3. Edge-to-edge Link Info Tray */}
      <View style={[styles.infoSection, { backgroundColor: trayBg }]}>
        {data.title && (
          <TuiText weight="bold" size="sm" numberOfLines={1} style={{ color: colors.primary }}>
            {data.title}
          </TuiText>
        )}
        {data.description && (
          <TuiText size="xs" numberOfLines={2} style={{ color: colors.mutedForeground, marginTop: 4 }}>
            {data.description}
          </TuiText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  previewWrapper: {
    // No outer card borders or custom margins
  },
  loadingContainer: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: {
    height: 1.5,
    marginTop: 10,
  },
  imageSection: {
    height: 180,
    borderBottomWidth: 1.5,
    backgroundColor: '#00000010',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
