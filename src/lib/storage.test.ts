import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_VIEWED, STORAGE_KEYS, addViewed, parseSavedHomes, parseViewed, readJson, writeJson } from './storage';

// Node has no localStorage; a tiny in-memory one stands in.
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('saved homes storage', () => {
  it('keeps valid entries and drops corrupt ones', () => {
    expect(parseSavedHomes('nope')).toBeNull();
    expect(
      parseSavedHomes([
        { id: 'a', savedAt: '2026-10-01T00:00:00Z', note: 'nice', rating: 4 },
        { id: 'a', note: 'duplicate' },
        { id: 7 },
        null,
        { id: 'b', rating: 9, note: 5 },
      ]),
    ).toEqual([
      { id: 'a', savedAt: '2026-10-01T00:00:00Z', note: 'nice', rating: 4 },
      { id: 'b', savedAt: new Date(0).toISOString(), note: '', rating: null },
    ]);
  });

  it('falls back to empty on corrupt JSON or unavailable storage', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage({ [STORAGE_KEYS.saved]: '{not json' }) });
    expect(readJson(STORAGE_KEYS.saved, parseSavedHomes, [])).toEqual([]);
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
    });
    expect(readJson(STORAGE_KEYS.saved, parseSavedHomes, [])).toEqual([]);
    expect(writeJson(STORAGE_KEYS.saved, [])).toBe(false);
  });

  it('reports a failed write (quota exceeded) instead of throwing', () => {
    vi.stubGlobal('window', {
      localStorage: {
        ...fakeStorage(),
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      },
    });
    expect(writeJson(STORAGE_KEYS.viewed, ['x'])).toBe(false);
  });
});

describe('viewed history', () => {
  it('keeps the most recent views first, without duplicates, and bounded', () => {
    let list: string[] = [];
    for (let i = 0; i < MAX_VIEWED + 20; i++) list = addViewed(list, `id-${i}`);
    expect(list).toHaveLength(MAX_VIEWED);
    expect(list[0]).toBe(`id-${MAX_VIEWED + 19}`);
    expect(addViewed(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('cleans stored history', () => {
    expect(parseViewed({})).toBeNull();
    expect(parseViewed(['a', 'a', 3, '', 'b'])).toEqual(['a', 'b']);
  });
});
