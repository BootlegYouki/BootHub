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
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: getClientId(),
      code,
      redirectUri,
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    discovery
  );

  return {
    access_token: tokenResponse.accessToken,
    refresh_token: tokenResponse.refreshToken || undefined,
    expires_in: tokenResponse.expiresIn,
  };
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
  existingDriveFileId?: string,
  signal?: AbortSignal
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
        signal,
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
      signal,
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
  existingDriveFileId?: string,
  onUploadTaskCreated?: (task: FileSystem.UploadTask) => void,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void
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
        signal,
      }
    );
    fileId = metaRes.data.id;
  }

  if (!fileId) {
    throw new Error('Failed to create or resolve Google Drive file ID for binary file.');
  }

  // Step 2: Upload raw content using expo-file-system createUploadTask (cancellable)
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  
  const uploadTask = FileSystem.createUploadTask(
    uploadUrl,
    localFileUri,
    {
      httpMethod: 'PATCH',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType || 'application/octet-stream',
      },
    },
    (data) => {
      if (onProgress && data.totalBytesExpectedToSend > 0) {
        const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
        onProgress(progress);
      }
    }
  );

  if (onUploadTaskCreated) {
    onUploadTaskCreated(uploadTask);
  }

  const uploadResult = await uploadTask.uploadAsync();

  if (!uploadResult || uploadResult.status < 200 || uploadResult.status >= 300) {
    if (!uploadResult) {
      throw new Error('Upload task was cancelled or aborted');
    }
    throw new Error(`Google Drive media upload failed with status ${uploadResult?.status ?? 'unknown'}: ${uploadResult?.body ?? 'no body'}`);
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

/**
 * Searches for a subfolder by name under a parent folder. If not found, creates it.
 */
export const getOrCreateSubFolder = async (
  accessToken: string,
  parentFolderId: string,
  folderName: string
): Promise<string> => {
  const escapedName = folderName.replace(/'/g, "\\'");
  const query = `name='${escapedName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  
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

  const createRes = await axios.post(
    'https://www.googleapis.com/drive/v3/files',
    {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
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

/**
 * Ensures a Google Drive file resides in the target parent folder. Moves it if necessary.
 */
export const ensureFileParent = async (
  accessToken: string,
  fileId: string,
  targetParentId: string
): Promise<void> => {
  const res = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  
  const parents = res.data.parents || [];
  if (!parents.includes(targetParentId)) {
    const removeParents = parents.join(',');
    await axios.patch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${targetParentId}&removeParents=${removeParents}`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  }
};

/**
 * Fetches all json metadata files from Google Drive recursively.
 */
export const fetchAllMetadataFromDrive = async (
  accessToken: string
): Promise<any[]> => {
  const query = `mimeType='application/json' and name contains 'item_' and trashed=false`;
  let allFiles: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url: string = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=nextPageToken,files(id,name,parents)&pageSize=100${
      pageToken ? `&pageToken=${pageToken}` : ''
    }`;

    const res: any = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const files = res.data.files || [];
    allFiles = [...allFiles, ...files];
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return allFiles;
};

/**
 * Downloads the JSON content of a file from Google Drive.
 */
export const downloadJsonContent = async (
  accessToken: string,
  fileId: string
): Promise<any> => {
  const res = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
};


