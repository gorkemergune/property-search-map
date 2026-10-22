import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS, addViewed, parseViewed, readJson, removeKey, writeJson } from '../lib/storage';

const load = () => readJson(STORAGE_KEYS.viewed, parseViewed, []);

/**
 * Listings whose details this visitor opened, most recent first. Kept in
 * localStorage on this browser only, separate from saved homes, and never put
 * in share links or sent anywhere.
 */
export function useViewedHistory() {
  const [ids, setIds] = useState<string[]>(load);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.viewed || e.key === null) setIds(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const record = useCallback((id: string) => {
    setIds((prev) => {
      if (prev[0] === id) return prev;
      const next = addViewed(prev, id);
      writeJson(STORAGE_KEYS.viewed, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    removeKey(STORAGE_KEYS.viewed);
    setIds([]);
  }, []);

  const viewed = useMemo(() => new Set(ids), [ids]);
  return { viewed, count: ids.length, record, clear };
}
