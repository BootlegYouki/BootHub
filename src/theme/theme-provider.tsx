import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentTheme = 'classic' | 'gray' | 'amber' | 'green' | 'rose' | 'cobalt';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string; // Dynamic accent color
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  accent: string;
  accentForeground: string;
  destructive: string;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  accentTheme: AccentTheme;
  colors: ThemeColors;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentTheme: (theme: AccentTheme) => void;
}

export const ACCENT_COLORS = {
  classic: { dark: '#FFFFFF', light: '#000000' },
  gray: { dark: '#71717A', light: '#71717A' },
  amber: { dark: '#F59E0B', light: '#D97706' },
  green: { dark: '#10B981', light: '#059669' },
  rose: { dark: '#F43F5E', light: '#E11D48' },
  cobalt: { dark: '#3B82F6', light: '#2563EB' },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [accentTheme, setAccentThemeState] = useState<AccentTheme>('classic');

  // Load preferences on startup
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('theme_mode');
        const savedAccent = await AsyncStorage.getItem('accent_theme');
        
        if (savedMode) setThemeModeState(savedMode as ThemeMode);
        if (savedAccent) setAccentThemeState(savedAccent as AccentTheme || 'classic');
      } catch (e) {
        console.error('Failed to load theme preferences', e);
      }
    };
    loadPreferences();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  const setAccentTheme = async (theme: AccentTheme) => {
    setAccentThemeState(theme);
    try {
      await AsyncStorage.setItem('accent_theme', theme);
    } catch (e) {
      console.error(e);
    }
  };

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  // Dynamic accent color based on chosen accent theme!
  const dynamicAccent = ACCENT_COLORS[accentTheme] ? ACCENT_COLORS[accentTheme][isDark ? 'dark' : 'light'] : (isDark ? '#FFFFFF' : '#000000');

  const colors: ThemeColors = isDark
    ? {
        background: '#18181B',
        foreground: '#FAFAFA',
        card: '#18181B',
        cardForeground: '#FAFAFA',
        primary: dynamicAccent,
        primaryForeground: '#09090B',
        secondary: '#27272A',
        secondaryForeground: '#FAFAFA',
        muted: '#27272A',
        mutedForeground: '#A1A1AA',
        border: '#27272A',
        input: '#27272A',
        accent: dynamicAccent,
        accentForeground: '#09090B',
        destructive: '#EF4444',
      }
    : {
        background: '#F4F4F5',
        foreground: '#09090B',
        card: '#F4F4F5',
        cardForeground: '#09090B',
        primary: dynamicAccent,
        primaryForeground: '#FFFFFF',
        secondary: '#E4E4E7',
        secondaryForeground: '#09090B',
        muted: '#F4F4F5',
        mutedForeground: '#71717A',
        border: '#000000',
        input: '#FFFFFF',
        accent: dynamicAccent,
        accentForeground: '#FFFFFF',
        destructive: '#EF4444',
      };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        accentTheme,
        colors,
        isDark,
        setThemeMode,
        setAccentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
