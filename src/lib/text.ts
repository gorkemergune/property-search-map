import { t } from '../i18n/en';
import type { Property } from '../types/property';

/** Lowercase, strip accents and Turkish dotless i, so "uskudar" finds "Üsküdar" and "Izmir" finds "İzmir". */
export function normalizeText(s: string): string {
  return s
    .toLocaleLowerCase('en')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .trim();
}

/** Normalized words, split on anything that is not a letter or digit. */
export function tokenize(s: string): string[] {
  return normalizeText(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Words ignored on both sides of a search: English filler words and the fixed
 * wording of the generated demo descriptions ("Demo listing with fictional
 * details … about 94 m² with 2 bathrooms"). Without this, "demo", "with" or
 * "bath" would match every listing.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'in', 'of', 'to', 'for', 'with', 'and', 'at', 'on',
  'about', 'offered', 'demo', 'listing', 'fictional', 'details', 'bathroom', 'bathrooms', 'm',
]);

/** Query or text words that carry meaning for search. */
export function searchWords(s: string): string[] {
  return tokenize(s).filter((w) => !STOP_WORDS.has(w));
}

/**
 * Optimal string alignment distance: edits, insertions, deletions and
 * adjacent transpositions each cost 1 ("yrok" → "york" is 1).
 * Stops early and returns `max + 1` once the distance must exceed `max`.
 */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push([i]);
  }
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, rows[i - 2][j - 2] + 1);
      rows[i][j] = d;
      rowMin = Math.min(rowMin, d);
    }
    if (rowMin > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/**
 * Typos allowed for a query word: none under 4 letters, 1 from 4, 2 from 8.
 * Four-letter words only tolerate swapped neighbours ("yrok" → "york"), not a
 * changed letter, so "part" does not match "park".
 */
export function typoBudget(word: string): number {
  if (word.length < 4) return 0;
  if (word.length < 8) return 1;
  return 2;
}

const sameLetters = (a: string, b: string) => [...a].sort().join('') === [...b].sort().join('');

export type WordMatch = 'exact' | 'prefix' | 'fuzzy' | null;

/** How a single query word matches a single candidate word. */
export function matchWord(query: string, word: string): WordMatch {
  if (word === query) return 'exact';
  if (word.startsWith(query)) return 'prefix';
  const budget = typoBudget(query);
  if (budget === 0) return null;
  const close = (candidate: string) =>
    editDistance(query, candidate, budget) <= budget && (query.length > 4 || sameLetters(query, candidate));
  // Compare against the whole word and against a same-length prefix (typo while still typing).
  if (close(word)) return 'fuzzy';
  if (word.length > query.length && close(word.slice(0, query.length))) return 'fuzzy';
  return null;
}

const RANK: Record<Exclude<WordMatch, null>, number> = { exact: 3, prefix: 2, fuzzy: 1 };

export interface TextMatch {
  /** 0 when some query word is missing; otherwise the average rank (3 exact, 2 prefix, 1 typo). */
  score: number;
  /** True when at least one query word only matched with a typo ("Did you mean …"). */
  fuzzy: boolean;
}

/**
 * Matches `query` against text: every query word must match some word.
 * Words in `fuzzyText` (names: places, titles, types) may match with a typo;
 * words in `strictText` (addresses, descriptions) only match exactly or by prefix,
 * which keeps long free text from producing typo false positives.
 */
export function matchText(query: string, fuzzyText: string | string[], strictText: string | string[] = []): TextMatch {
  const queryWords = searchWords(query);
  if (queryWords.length === 0) return { score: 0, fuzzy: false };
  const loose = (Array.isArray(fuzzyText) ? fuzzyText : [fuzzyText]).flatMap(searchWords);
  const strict = (Array.isArray(strictText) ? strictText : [strictText]).flatMap(searchWords);
  let score = 0;
  let fuzzy = false;
  for (const q of queryWords) {
    let best = 0;
    for (const w of loose) {
      const m = matchWord(q, w);
      if (m) best = Math.max(best, RANK[m]);
      if (best === 3) break;
    }
    if (best < 3) {
      for (const w of strict) {
        const m = matchWord(q, w);
        if (m && m !== 'fuzzy') best = Math.max(best, RANK[m]);
        if (best === 3) break;
      }
    }
    if (best === 0) return { score: 0, fuzzy: false };
    if (best === RANK.fuzzy) fuzzy = true;
    score += best;
  }
  return { score: score / queryWords.length, fuzzy };
}

/** Shorthand for `matchText(...).score` with every word allowed a typo. */
export function scoreText(query: string, text: string | string[]): number {
  return matchText(query, text).score;
}

/** Names a listing can be found by, with typo tolerance. */
export function searchableNames(p: Property): string[] {
  return [p.title, p.neighborhood, p.city, t.countries[p.countryCode], p.countryCode, t.propertyTypes[p.type]];
}

/** Free text a listing can be found by, exact or prefix only. */
export function searchableText(p: Property): string[] {
  return [p.address, p.description];
}

/** A query made only of filler words ("in", "the") does not narrow the results. */
export function matchesQuery(p: Property, query: string): boolean {
  if (searchWords(query).length === 0) return true;
  return matchText(query, searchableNames(p), searchableText(p)).score > 0;
}
