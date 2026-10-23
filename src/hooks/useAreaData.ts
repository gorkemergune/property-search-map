import { useCallback, useEffect, useState } from 'react';
import type { AreaSources, LadCollection, WardCollection } from '../lib/areas';

/**
 * Area boundaries and population figures are bundled with the app (versioned
 * in src/data/geo/, built from ONS data) but split into their own chunks, so
 * they only download when a heat mode is first turned on. Nothing about the
 * user's search is sent anywhere to load them.
 */
export type AreaData =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; lads: LadCollection; wards: WardCollection; sources: AreaSources };

type Loaded = Extract<AreaData, { status: 'ready' }>;

let cache: Promise<Loaded> | null = null;

function load(): Promise<Loaded> {
  cache ??= Promise.all([import('../data/geo/lad.json'), import('../data/geo/wards.json'), import('../data/geo/sources.json')]).then(
    ([lads, wards, sources]) => ({
      status: 'ready' as const,
      lads: lads.default as LadCollection,
      wards: wards.default as WardCollection,
      sources: sources.default as AreaSources,
    }),
  );
  // A failed chunk (offline, deploy swapped files) must not stay cached, or retry could never succeed.
  cache.catch(() => (cache = null));
  return cache;
}

export function useAreaData(enabled: boolean): AreaData {
  const [state, setState] = useState<{ data: Loaded | null; failed: boolean; attempt: number }>({ data: null, failed: false, attempt: 0 });
  const retry = useCallback(() => setState((s) => ({ ...s, failed: false, attempt: s.attempt + 1 })), []);

  useEffect(() => {
    if (!enabled || state.data) return;
    let live = true;
    load().then(
      (data) => live && setState((s) => ({ ...s, data, failed: false })),
      () => live && setState((s) => ({ ...s, failed: true })),
    );
    return () => {
      live = false;
    };
  }, [enabled, state.data, state.attempt]);

  if (state.data) return state.data;
  if (state.failed) return { status: 'error', retry };
  return { status: enabled ? 'loading' : 'idle' };
}
