import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { ensureFileUri } from './helpers';

// Helper to sanitize filename to be safe for iOS/Android filesystem
export const sanitizeFilename = (name: string): string => {
  if (!name) return 'unnamed';
  // Keep alphanumeric, spaces, dashes, underscores, and remove others
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'unnamed';
};

// Map tab names to top-level folder names
const tabToFolderName = (tab: string): string => {
  if (tab === 'photo') return 'images';
  if (tab === 'link') return 'links';
  if (tab === 'text') return 'texts';
  if (tab === 'file') return 'files';
  return tab + 's';
};

// Trace path from folderId to root and compute the relative path
export const resolveFolderPath = (
  folderId: string | undefined | null,
  itemsMap: Map<string, any>,
  fallbackTab: string
): { tab: string; relativePath: string } => {
  if (!folderId) {
    return { tab: fallbackTab, relativePath: '' };
  }
  
  const pathParts: string[] = [];
  let currentId = folderId;
  let tab = fallbackTab;
  
  // Set to prevent infinite loops in case of circular references
  const visited = new Set<string>();
  
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = itemsMap.get(currentId);
    if (!folder || folder.type !== 'folder') break;
    
    let folderName = 'Folder';
    try {
      const obj = JSON.parse(folder.value);
      folderName = obj.name || 'Folder';
      if (obj.tab) {
        tab = obj.tab;
      }
    } catch {
      folderName = folder.label || 'Folder';
    }
    
    pathParts.unshift(sanitizeFilename(folderName));
    currentId = folder.folderId;
  }
  
  return { tab, relativePath: pathParts.join('/') };
};

// Main synchronization logic
export const syncDatabaseToFilesystem = async () => {
  try {
    const base = FileSystem.documentDirectory;
    if (!base) return;
    const safeBase = base.endsWith('/') ? base : base + '/';
    
    const db = SQLite.openDatabaseSync('boothub_events.db');
    const allItems = db.getAllSync<any>('SELECT * FROM items');
    
    // Create map of items for fast lookup
    const itemsMap = new Map<string, any>();
    for (const item of allItems) {
      itemsMap.set(item.id, item);
    }
    
    // 1. Ensure root folders exist
    const rootFolders = ['links', 'files', 'images', 'texts'];
    for (const rf of rootFolders) {
      const path = `${safeBase}${rf}/`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      }
    }
    
    // 2. Resolve paths for all folders and create them in the file explorer
    const folderDirectories = new Set<string>();
    for (const item of allItems) {
      if (item.type === 'folder') {
        const { tab, relativePath } = resolveFolderPath(item.id, itemsMap, 'folder');
        const folderDiskName = tabToFolderName(tab);
        const relativeDir = folderDiskName + '/' + relativePath;
        const absoluteDir = safeBase + relativeDir + '/';
        
        folderDirectories.add(absoluteDir);
        
        const info = await FileSystem.getInfoAsync(absoluteDir);
        if (!info.exists) {
          try {
            await FileSystem.makeDirectoryAsync(absoluteDir, { intermediates: true });
            console.log(`[Filesystem Sync] Created directory: ${relativeDir}`);
          } catch (e) {
            console.error(`[Filesystem Sync] Failed to create folder ${absoluteDir}:`, e);
          }
        }
        
        // Write a hidden .keep file inside the folder so iOS indexer displays it immediately
        try {
          await FileSystem.writeAsStringAsync(absoluteDir + '.keep', '');
        } catch (e) {
          console.error(`[Filesystem Sync] Failed to write .keep file in ${absoluteDir}:`, e);
        }
      }
    }
    
    // Keep track of expected active files to clean up orphaned ones later
    const expectedFilePaths = new Set<string>();
    
    // 3. Process all items (links, texts, photos, files) and write/move them into correct paths
    for (const item of allItems) {
      if (item.type === 'folder') continue;
      
      const { tab, relativePath } = resolveFolderPath(item.folderId, itemsMap, item.type);
      const folderDiskName = tabToFolderName(tab);
      const relativeDir = folderDiskName + (relativePath ? '/' + relativePath : '');
      const absoluteDir = safeBase + relativeDir + '/';
      
      // Make sure the target directory exists (in case it wasn't pre-created)
      try {
        await FileSystem.makeDirectoryAsync(absoluteDir, { intermediates: true });
      } catch (e) {}
      
      if (item.type === 'text' || item.type === 'link') {
        const filename = `${item.id}_${sanitizeFilename(item.label)}.txt`;
        const absoluteFilePath = absoluteDir + filename;
        expectedFilePaths.add(absoluteFilePath);
        
        try {
          await FileSystem.writeAsStringAsync(absoluteFilePath, item.value);
        } catch (err) {
          console.error(`[Filesystem Sync] Failed to write file ${absoluteFilePath}:`, err);
        }
      } else if (item.type === 'photo' || item.type === 'file') {
        let fileUri = '';
        if (item.type === 'photo') {
          fileUri = item.value;
        } else {
          try {
            const fileObj = JSON.parse(item.value);
            fileUri = fileObj.uri || '';
          } catch {
            fileUri = item.value;
          }
        }
        
        if (fileUri.startsWith('file://')) {
          // Extract the filename from the current URI
          const filename = fileUri.split('/').pop() || '';
          if (filename) {
            const expectedAbsoluteFilePath = absoluteDir + filename;
            expectedFilePaths.add(expectedAbsoluteFilePath);
            
            const currentResolvedUri = ensureFileUri(fileUri, item.id);
            const currentPath = currentResolvedUri.startsWith('file://') ? currentResolvedUri.substring(7) : currentResolvedUri;
            const expectedPath = expectedAbsoluteFilePath.startsWith('file://') ? expectedAbsoluteFilePath.substring(7) : expectedAbsoluteFilePath;
            
            if (currentPath !== expectedPath) {
              try {
                const sourceInfo = await FileSystem.getInfoAsync(currentResolvedUri);
                if (sourceInfo.exists) {
                  await FileSystem.moveAsync({ from: currentResolvedUri, to: expectedAbsoluteFilePath });
                  console.log(`[Filesystem Sync] Moved item ${item.id} to new path: ${expectedAbsoluteFilePath}`);
                }
                
                // Update SQLite database and event payloads
                const newUri = `file://${expectedAbsoluteFilePath}`;
                let newValue = newUri;
                if (item.type === 'file') {
                  try {
                    const fileObj = JSON.parse(item.value);
                    fileObj.uri = newUri;
                    newValue = JSON.stringify(fileObj);
                  } catch {}
                }
                
                db.runSync('UPDATE items SET value = ? WHERE id = ?', [newValue, item.id]);
                
                const events = db.getAllSync<{ id: string; payload: string }>(
                  'SELECT id, payload FROM events WHERE entity_id = ?',
                  [item.id]
                );
                for (const ev of events) {
                  try {
                    const payload = JSON.parse(ev.payload);
                    if (payload.value) {
                      if (item.type === 'file') {
                        try {
                          const fileObj = JSON.parse(payload.value);
                          fileObj.uri = newUri;
                          payload.value = JSON.stringify(fileObj);
                        } catch {
                          payload.value = newUri;
                        }
                      } else {
                        payload.value = newUri;
                      }
                      db.runSync('UPDATE events SET payload = ? WHERE id = ?', [JSON.stringify(payload), ev.id]);
                    }
                  } catch (e) {}
                }
              } catch (err) {
                console.error(`[Filesystem Sync] Failed to move photo/file for ${item.id}:`, err);
              }
            }
          }
        }
      }
    }
    
    // 4. Clean up texts/ and links/ of orphaned files recursively, and delete empty subdirectories
    const cleanupFolder = async (dirPath: string, activeIds: Set<string>, isTextOrLink: boolean) => {
      try {
        const files = await FileSystem.readDirectoryAsync(dirPath);
        for (const file of files) {
          if (file.startsWith('.')) {
            // Keep .keep files in active folders, delete them if parent folder is not in active folders list
            if (file === '.keep') continue;
            continue;
          }
          const fullPath = dirPath + file;
          const info = await FileSystem.getInfoAsync(fullPath);
          
          if (info.isDirectory) {
            await cleanupFolder(fullPath + '/', activeIds, isTextOrLink);
            // Delete folder if empty (or only contains .keep and is not an active folder directory)
            const subFiles = await FileSystem.readDirectoryAsync(fullPath);
            const nonHiddenSubFiles = subFiles.filter(f => !f.startsWith('.'));
            if (nonHiddenSubFiles.length === 0) {
              // Check if this directory path matches any active folder path before deleting
              const normalizedPathSlash = fullPath.endsWith('/') ? fullPath : fullPath + '/';
              if (!folderDirectories.has(normalizedPathSlash)) {
                await FileSystem.deleteAsync(fullPath, { idempotent: true });
                console.log(`[Filesystem Sync] Deleted empty directory: ${fullPath}`);
              }
            }
          } else if (isTextOrLink) {
            // Check if it starts with one of active item IDs
            const idPart = file.split('_')[0];
            if (!activeIds.has(idPart)) {
              await FileSystem.deleteAsync(fullPath, { idempotent: true });
              console.log(`[Filesystem Sync] Deleted orphaned file: ${fullPath}`);
            }
          }
        }
      } catch (e) {}
    };
    
    // Gather all active text and link IDs
    const textIds = new Set<string>();
    const linkIds = new Set<string>();
    for (const item of allItems) {
      if (item.type === 'text') textIds.add(item.id);
      if (item.type === 'link') linkIds.add(item.id);
    }
    
    await cleanupFolder(`${safeBase}texts/`, textIds, true);
    await cleanupFolder(`${safeBase}links/`, linkIds, true);
    
  } catch (e) {
    console.error('[Filesystem Sync] Error during synchronization:', e);
  }
};

// Initialize filesystem sync and run legacy migration
export const initFilesystemSync = async () => {
  console.log('[Filesystem Sync] Initializing...');
  await syncDatabaseToFilesystem();
  console.log('[Filesystem Sync] Initialization complete.');
};
