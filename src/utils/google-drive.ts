import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';

// Google OAuth client IDs - loaded dynamically from environment variables
export const CLIENT_ID_IOS = process.env.EXPO_PUBLIC_CLIENT_ID_IOS || '';
export const CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_CLIENT_ID_ANDROID || '';
export const CLIENT_ID_WEB = process.env.EXPO_PUBLIC_CLIENT_ID_WEB || '';

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
  if (Platform.OS === 'ios') return CLIENT_ID_IOS;
  if (Platform.OS === 'android') return CLIENT_ID_ANDROID;
  return CLIENT_ID_WEB;
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
    const params = new URLSearchParams();
    params.append('client_id', getClientId());
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const res = await axios.post(discovery.tokenEndpoint, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, expires_in } = res.data;
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

    // Refresh if token is missing or expiring in less than 5 minutes
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
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', getClientId());
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  params.append('code_verifier', codeVerifier);

  const res = await axios.post(discovery.tokenEndpoint, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

// ─── Google Drive Operations ────────────────────────────────────────────────

export const getOrCreateSyncFolder = async (accessToken: string): Promise<string> => {
  const folderName = 'BootHub_Sync';

  // 1. Search for existing folder
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await axios.get(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const files = searchRes.data.files || [];
  if (files.length > 0) {
    return files[0].id;
  }

  // 2. Create folder if not found
  const createRes = await axios.post(
    'https://www.googleapis.com/drive/v3/files',
    {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return createRes.data.id;
};

export interface DriveUploadResponse {
  driveFileId: string;
}

/**
 * Creates/Uploads text or JSON file content to Drive in two steps:
 * 1. Create file metadata.
 * 2. Upload content body.
 */
export const uploadJsonToDrive = async (
  accessToken: string,
  parentFolderId: string,
  filename: string,
  content: string,
  existingDriveFileId?: string
): Promise<string> => {
  let fileId = existingDriveFileId;

  if (!fileId) {
    // Step 1: Create file metadata
    const metaRes = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      {
        name: filename,
        parents: [parentFolderId],
        mimeType: 'application/json',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    fileId = metaRes.data.id;
  }

  if (!fileId) {
    throw new Error('Failed to create or resolve Google Drive file ID for metadata.');
  }

  // Step 2: Upload string content via media patch
  await axios.patch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    content,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return fileId;
};

/**
 * Uploads binary file (photo, document) to Drive in two steps:
 * 1. Create file metadata.
 * 2. Upload raw file bytes via expo-file-system.
 */
export const uploadBinaryToDrive = async (
  accessToken: string,
  parentFolderId: string,
  filename: string,
  localFileUri: string,
  mimeType: string,
  existingDriveFileId?: string
): Promise<string> => {
  let fileId = existingDriveFileId;

  if (!fileId) {
    // Step 1: Create file metadata
    const metaRes = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      {
        name: filename,
        parents: [parentFolderId],
        mimeType: mimeType || 'application/octet-stream',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    fileId = metaRes.data.id;
  }

  if (!fileId) {
    throw new Error('Failed to create or resolve Google Drive file ID for binary file.');
  }

  // Step 2: Upload raw content using expo-file-system
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  const uploadResult = await FileSystem.uploadAsync(uploadUrl, localFileUri, {
    httpMethod: 'PATCH',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType || 'application/octet-stream',
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Google Drive media upload failed with status ${uploadResult.status}: ${uploadResult.body}`);
  }

  return fileId;
};

/**
 * Deletes a file from Google Drive.
 */
export const deleteFileFromDrive = async (accessToken: string, driveFileId: string): Promise<void> => {
  await axios.delete(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};
