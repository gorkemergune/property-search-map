import { useEffect, useRef, useState } from 'react';
import { decodeSearch, encodeSearch, onlyQueryChanged, type SearchState } from '../lib/urlState';
import type { CountryCode } from '../types/property';

/**
 * Search state that mirrors the URL query string.
 * - The first render reads the URL (a shared link restores its search).
 * - Each change writes the URL: a new history entry per change, replaced in
 *   place while only the typed query changes, so typing does not flood history.
 * - Back/forward (`popstate`) reads the URL again without writing it back.
 * The URL is only written when it differs from the encoded state, so the two
 * cannot loop.
 */
export function useUrlSearchState(cityCountry: Readonly<Record<string, CountryCode>>) {
  const [state, setState] = useState<SearchState>(() => decodeSearch(window.location.search, cityCountry));
  const written = useRef<string | null>(null);
  const fromHistory = useRef(false);

  useEffect(() => {
    const qs = encodeSearch(state);
    const current = window.location.search;
    if (qs !== current) {
      const url = `${window.location.pathname}${qs}${window.location.hash}`;
      // First write (normalising a hand-edited link), history navigation and typing replace; other changes push.
      const replace = written.current === null || fromHistory.current || onlyQueryChanged(current, qs);
      window.history[replace ? 'replaceState' : 'pushState'](window.history.state, '', url);
    }
    written.current = qs;
    fromHistory.current = false;
  }, [state]);

  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
      setState(decodeSearch(window.location.search, cityCountry));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [cityCountry]);

  return [state, setState] as const;
}
