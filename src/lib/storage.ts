/**
 * Small, failure-tolerant wrappers around `localStorage`.
 *
 * Storage can be missing (private windows, blocked cookies), full, or hold
 * corrupt or old data. Reads validate what they find and fall back to an empty
 * value; writes swallow errors. Nothing stored here ever leaves the browser.
 */

export const STORAGE_KEYS = {
  saved: 'iceberg.savedHomes.v1',
  viewed: 'iceberg.viewedHomes.v1',
} as const;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Parses and validates a stored value; anything unreadable gives `fallback`. */
export function readJson<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  try {
    const raw = storage()?.getItem(key);
    if (raw == null) return fallback;
    return parse(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the value could not be stored. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nothing to do: the data stays where it was.
  }
}

// ---------------------------------------------------------------------------
// Saved homes
// ---------------------------------------------------------------------------

export interface SavedHome {
  id: string;
  /** ISO timestamp; the basket lists newest first. */
  savedAt: string;
  /** Private note, kept only in this browser. */
  note: string;
  /** Personal 1–5 rating, or null. */
  rating: number | null;
}

export const MAX_NOTE_LENGTH = 1_000;

/** Keeps well-formed entries, drops the rest, and de-duplicates by id. */
export function parseSavedHomes(raw: unknown): SavedHome[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: SavedHome[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { id, savedAt, note, rating } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      savedAt: typeof savedAt === 'string' ? savedAt : new Date(0).toISOString(),
      note: typeof note === 'string' ? note.slice(0, MAX_NOTE_LENGTH) : '',
      rating: typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Viewed history
// ---------------------------------------------------------------------------

/** Only the most recent views are kept. */
export const MAX_VIEWED = 100;

export function parseViewed(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0))].slice(0, MAX_VIEWED);
}

/** Most recent first, without duplicates, capped at `MAX_VIEWED`. */
export function addViewed(list: readonly string[], id: string): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, MAX_VIEWED);
}
