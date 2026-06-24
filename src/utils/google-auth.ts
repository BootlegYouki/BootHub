import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Platform } from 'react-native';

// Google OAuth client IDs
export const CLIENT_ID_IOS = process.env.EXPO_PUBLIC_CLIENT_ID_IOS || '384181018496-0iagia0c6tcmllboc6rhtijqsnnaj8se.apps.googleusercontent.com';
export const CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_CLIENT_ID_ANDROID || '';
export const CLIENT_ID_WEB = process.env.EXPO_PUBLIC_CLIENT_ID_WEB || '384181018496-urhk02dv8iemvgu9ivj0upncdruhs9gg.apps.googleusercontent.com';

export const REDIRECT_SCHEME = 'boothub';

const SECURE_KEYS = {
  ACCESS_TOKEN: 'boothub_google_access_token',
  REFRESH_TOKEN: 'boothub_google_refresh_token',
  EXPIRES_AT: 'boothub_google_token_expires_at',
  USER_INFO: 'boothub_google_user_info',
};

export const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export const getClientId = (): string => {
  if (Platform.OS === 'ios') {
    return CLIENT_ID_IOS;
  }
  if (Platform.OS === 'android') {
    return CLIENT_ID_ANDROID || CLIENT_ID_WEB;
  }
  return CLIENT_ID_WEB;
};

export const getRedirectScheme = (): string => {
  if (Platform.OS === 'ios') {
    const clientId = getClientId();
    if (clientId) {
      const parts = clientId.split('.');
      if (parts.length > 0) {
        return `com.googleusercontent.apps.${parts[0]}`;
      }
    }
  }
  return REDIRECT_SCHEME;
};

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

export const saveAuthSession = async (
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
  userInfo: GoogleUserInfo | null
): Promise<void> => {
  const expiresAt = Date.now() + expiresIn * 1000;
  await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  await SecureStore.setItemAsync(SECURE_KEYS.EXPIRES_AT, String(expiresAt));
  if (userInfo) {
    await SecureStore.setItemAsync(SECURE_KEYS.USER_INFO, JSON.stringify(userInfo));
  }
};

export const clearAuthSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_KEYS.EXPIRES_AT);
  await SecureStore.deleteItemAsync(SECURE_KEYS.USER_INFO);
};

export const getGoogleUserInfo = async (): Promise<GoogleUserInfo | null> => {
  try {
    const info = await SecureStore.getItemAsync(SECURE_KEYS.USER_INFO);
    return info ? JSON.parse(info) : null;
  } catch {
    return null;
  }
};

export const isUserSignedIn = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
    return !!token;
  } catch {
    return false;
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  try {
    const tokenResponse = await AuthSession.refreshAsync(
      {
        clientId: getClientId(),
        refreshToken,
      },
      discovery
    );

    const access_token = tokenResponse.accessToken;
    const expires_in = tokenResponse.expiresIn || 3600;
    await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, access_token);
    const expiresAt = Date.now() + expires_in * 1000;
    await SecureStore.setItemAsync(SECURE_KEYS.EXPIRES_AT, String(expiresAt));

    return access_token;
  } catch (err) {
    console.error('Failed to refresh Google access token:', err);
    throw err;
  }
};

export const getValidAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;

    const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
    const expiresAtStr = await SecureStore.getItemAsync(SECURE_KEYS.EXPIRES_AT);
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

    if (!accessToken || expiresAt - Date.now() < 5 * 60 * 1000) {
      return await refreshAccessToken(refreshToken);
    }

    return accessToken;
  } catch (err) {
    console.error('Failed to retrieve valid access token:', err);
    return null;
  }
};

export const fetchUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return {
    email: res.data.email,
    name: res.data.name,
    picture: res.data.picture,
  };
};

export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<any> => {
  const decodedCode = decodeURIComponent(code);
  const res = await axios.post(
    discovery.tokenEndpoint,
    new URLSearchParams({
      client_id: getClientId(),
      code: decodedCode,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  return {
    access_token: res.data.access_token,
    refresh_token: res.data.refresh_token || undefined,
    expires_in: res.data.expires_in,
  };
};
