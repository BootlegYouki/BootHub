import { useEffect } from 'react';
import { AppState, Keyboard } from 'react-native';
import {
  processSyncQueue,
  enqueueUnsyncedLocalItems,
  initializeRealtimeSync,
  pullChangesFromDrive,
} from '../utils/sync-engine';

export function useSync(): void {
  useEffect(() => {
    const runSync = async () => {
      try {
        await pullChangesFromDrive().catch((err) =>
          console.error('[App] Pull failed:', err)
        );
        await enqueueUnsyncedLocalItems();
      } catch (err) {
        console.error('[App] Failed to enqueue unsynced local items:', err);
      }
      await processSyncQueue().catch((err) =>
        console.error('[App] Sync failed:', err)
      );
      initializeRealtimeSync().catch(() => {});
    };

    // Run sync queue on startup
    runSync();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        Keyboard.dismiss();
      } else if (nextAppState === 'active') {
        runSync();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
