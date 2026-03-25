import { useEffect, useRef, useCallback } from 'react';
import { sbLoadAll, sbUpsert, sbDelete } from '../lib/supabase';

/**
 * Smart sync hook — only syncs records that changed since last sync.
 * Replaces the old full-table sync that re-uploaded everything on each change.
 */
export default function useSmartSync(table, items, mapper, toDb, isReady, delay = 800) {
  const prevSnapshot = useRef(null);
  const timer = useRef(null);

  const sync = useCallback(async () => {
    if (!isReady) return;

    const currentMap = new Map(items.map(item => [item.id, item]));
    const prevMap = prevSnapshot.current;

    // First sync — just snapshot, don't upload everything
    if (!prevMap) {
      prevSnapshot.current = new Map(currentMap);
      return;
    }

    // Find changes
    const toUpsert = [];
    const toDelete = [];

    // New or modified items
    for (const [id, item] of currentMap) {
      const prev = prevMap.get(id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
        toUpsert.push(item);
      }
    }

    // Deleted items
    for (const [id] of prevMap) {
      if (!currentMap.has(id)) {
        toDelete.push(id);
      }
    }

    // Apply changes
    const promises = [];
    for (const item of toUpsert) {
      promises.push(sbUpsert(table, toDb(item)));
    }
    for (const id of toDelete) {
      promises.push(sbDelete(table, id));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    // Update snapshot
    prevSnapshot.current = new Map(currentMap);
  }, [table, items, toDb, isReady]);

  useEffect(() => {
    if (!isReady) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(sync, delay);
    return () => clearTimeout(timer.current);
  }, [items, isReady, sync, delay]);

  // Initialize snapshot on first load
  const initSnapshot = useCallback((loadedItems) => {
    prevSnapshot.current = new Map(loadedItems.map(item => [item.id, item]));
  }, []);

  return { initSnapshot };
}
