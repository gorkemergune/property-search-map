import { t } from '../i18n/en';
import { applyFilters, updateFilters, type Filters } from './filters';
import { matchText, normalizeText, searchWords } from './text';
import { COUNTRY_CODES, PROPERTY_TYPES, type CountryCode, type Property } from '../types/property';

interface BaseSuggestion {
  id: string;
  label: string;
  /** Secondary text, e.g. the country of a city or a listing's price and place. */
  detail: string;
  /** True when the match needed typo tolerance ("Did you mean …"). */
  fuzzy: boolean;
}

export interface FilterSuggestion extends BaseSuggestion {
  kind: 'query' | 'city' | 'neighborhood' | 'country' | 'type';
  /** Result count if this suggestion is applied on top of the current filters. */
  count: number;
  /** Filter change that applies this suggestion. */
  patch: Partial<Filters>;
}

export interface ListingSuggestion extends BaseSuggestion {
  kind: 'listing';
  property: Property;
}

export type Suggestion = FilterSuggestion | ListingSuggestion;

export interface SuggestionGroups {
  /** "Search for …" using the typed text as a keyword filter. */
  query: FilterSuggestion | null;
  places: FilterSuggestion[];
  types: FilterSuggestion[];
  listings: ListingSuggestion[];
}

const LIMITS = { places: 5, types: 2, listings: 4 };

/**
 * Suggestions for the search box, ranked by match quality then by result count.
 * Counts are real: each is the number of results after applying the suggestion
 * on top of the current filters. Places with no results are left out.
 */
export function getSuggestions(
  query: string,
  list: readonly Property[],
  filters: Filters,
  cityCountry: Readonly<Record<string, CountryCode>>,
  formatListing: (p: Property) => string,
): SuggestionGroups {
  const empty: SuggestionGroups = { query: null, places: [], types: [], listings: [] };
  // Too short, or only filler words: nothing useful to suggest.
  if (normalizeText(query).length < 2 || searchWords(query).length === 0) return empty;

  const countWith = (patch: Partial<Filters>) => applyFilters(list, updateFilters(filters, patch, cityCountry)).length;
  const rank = <T extends { score: number; count: number }>(a: T, b: T) => b.score - a.score || b.count - a.count;

  // Places: cities, neighborhoods and countries present in the data.
  const places: (FilterSuggestion & { score: number })[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const cityKey = `city:${p.city}`;
    if (!seen.has(cityKey)) {
      seen.add(cityKey);
      const { score, fuzzy } = matchText(query, p.city);
      if (score > 0) {
        const patch = { city: p.city, query: '' };
        places.push({ id: cityKey, kind: 'city', label: p.city, detail: t.countries[p.countryCode], fuzzy, count: countWith(patch), patch, score });
      }
    }
    const hoodKey = `hood:${p.city}:${p.neighborhood}`;
    if (!seen.has(hoodKey)) {
      seen.add(hoodKey);
      const { score, fuzzy } = matchText(query, p.neighborhood);
      if (score > 0) {
        const patch = { city: p.city, query: p.neighborhood };
        places.push({ id: hoodKey, kind: 'neighborhood', label: p.neighborhood, detail: `${p.city}, ${t.countries[p.countryCode]}`, fuzzy, count: countWith(patch), patch, score: score - 0.1 });
      }
    }
  }
  for (const c of COUNTRY_CODES) {
    const { score, fuzzy } = matchText(query, t.countries[c]);
    if (score > 0) {
      const patch = { country: c, query: '' };
      places.push({ id: `country:${c}`, kind: 'country', label: t.countries[c], detail: t.search.kind.country, fuzzy, count: countWith(patch), patch, score });
    }
  }

  const types: (FilterSuggestion & { score: number })[] = [];
  for (const type of PROPERTY_TYPES) {
    const { score, fuzzy } = matchText(query, t.propertyTypes[type]);
    if (score > 0) {
      const patch = { types: filters.types.includes(type) ? filters.types : [...filters.types, type], query: '' };
      types.push({ id: `type:${type}`, kind: 'type', label: t.propertyTypes[type], detail: t.filters.propertyType, fuzzy, count: countWith(patch), patch, score });
    }
  }

  // Listings: within the current filters (ignoring the typed keyword), best text match first.
  const pool = applyFilters(list, { ...filters, query: '' });
  const listings = pool
    .map((p) => ({ p, match: matchText(query, [p.title, p.neighborhood, p.city], p.address) }))
    .filter((x) => x.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score || b.p.listedAt.localeCompare(a.p.listedAt))
    .slice(0, LIMITS.listings)
    .map<ListingSuggestion>(({ p, match }) => ({
      id: `listing:${p.id}`,
      kind: 'listing',
      label: p.title,
      detail: formatListing(p),
      fuzzy: match.fuzzy,
      property: p,
    }));

  const queryPatch = { query: query.trim() };
  const querySuggestion: FilterSuggestion = {
    id: 'query',
    kind: 'query',
    label: t.search.searchFor(query.trim()),
    detail: '',
    fuzzy: false,
    count: countWith(queryPatch),
    patch: queryPatch,
  };

  const strip = ({ score: _score, ...s }: FilterSuggestion & { score: number }): FilterSuggestion => s;
  return {
    query: querySuggestion,
    places: places.filter((s) => s.count > 0).sort(rank).slice(0, LIMITS.places).map(strip),
    types: types.filter((s) => s.count > 0).sort(rank).slice(0, LIMITS.types).map(strip),
    listings,
  };
}

/** Flat, keyboard-navigable order of the groups. */
export function flattenSuggestions(g: SuggestionGroups): Suggestion[] {
  return [...(g.query ? [g.query] : []), ...g.places, ...g.types, ...g.listings];
}
