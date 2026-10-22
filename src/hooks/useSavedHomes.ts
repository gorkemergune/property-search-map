import { useCallback, useEffect, useState } from 'react';
import { MAX_NOTE_LENGTH, STORAGE_KEYS, parseSavedHomes, readJson, writeJson, type SavedHome } from '../lib/storage';

const load = () => readJson(STORAGE_KEYS.saved, parseSavedHomes, []);

/**
 * Saved homes ("basket") with private notes and ratings, kept in localStorage
 * on this browser only. Other open tabs pick up changes through the storage event.
 */
export function useSavedHomes() {
  const [homes, setHomes] = useState<SavedHome[]>(load);

  const update = useCallback((fn: (prev: SavedHome[]) => SavedHome[]) => {
    setHomes((prev) => {
      const next = fn(prev);
      writeJson(STORAGE_KEYS.saved, next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.saved || e.key === null) setHomes(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = useCallback((id: string) => homes.some((h) => h.id === id), [homes]);

  const toggle = useCallback(
    (id: string) =>
      update((prev) =>
        prev.some((h) => h.id === id)
          ? prev.filter((h) => h.id !== id)
          : [{ id, savedAt: new Date().toISOString(), note: '', rating: null }, ...prev],
      ),
    [update],
  );

  const remove = useCallback((id: string) => update((prev) => prev.filter((h) => h.id !== id)), [update]);
  const clear = useCallback(() => update(() => []), [update]);
  const setNote = useCallback(
    (id: string, note: string) => update((prev) => prev.map((h) => (h.id === id ? { ...h, note: note.slice(0, MAX_NOTE_LENGTH) } : h))),
    [update],
  );
  const setRating = useCallback(
    (id: string, rating: number | null) => update((prev) => prev.map((h) => (h.id === id ? { ...h, rating } : h))),
    [update],
  );

  return { homes, isSaved, toggle, remove, clear, setNote, setRating };
}
