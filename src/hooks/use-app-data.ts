import { useState, useEffect, useCallback } from 'react';
import { getItems, subscribeToStorage, DumpItem } from '../utils/storage';
import { pullChangesFromDrive, processSyncQueue, enqueueUnsyncedLocalItems } from '../utils/sync-engine';

export interface UseAppDataReturn {
  items: DumpItem[];
  setItems: React.Dispatch<React.SetStateAction<DumpItem[]>>;
  dataLoaded: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export function useAppData(): UseAppDataReturn {
  const [items, setItems] = useState<DumpItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await getItems();
        setItems(data);
      } catch (e) {
        console.error('Failed to load items:', e);
      } finally {
        setDataLoaded(true);
      }
    };
    loadItems();

    const unsubscribe = subscribeToStorage(async () => {
      try {
        const data = await getItems();
        setItems(data);
      } catch (e) {
        console.error('Failed to reload items on storage change:', e);
      }
    });

    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await enqueueUnsyncedLocalItems().catch(() => {});
      await pullChangesFromDrive();
      await processSyncQueue();
      const data = await getItems();
      setItems(data);
    } catch (e) {
      console.error('Failed to refresh items:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { items, setItems, dataLoaded, refreshing, onRefresh };
}
