import {
  APPLICANT_GROUPS,
  AREA_UNITS,
  BILLS,
  COUNTRY_CODES,
  EPC_RATINGS,
  FURNISHINGS,
  LISTING_STATUSES,
  OUTDOOR_SPACES,
  PARKING_TYPES,
  PROPERTY_TYPES,
  TENURES,
  type CountryCode,
} from '../types/property';
import {
  COMPLETION_OPTIONS,
  DEFAULT_FILTERS,
  INCOME_CHECK_OPTIONS,
  SORT_KEYS,
  updateFilters,
  type Filters,
  type SortKey,
} from './filters';
import { MAP_MODES, type MapMode } from './heat';

/**
 * Search state <-> URL query string, so a search can be shared or bookmarked
 * and the browser's back/forward buttons step through searches.
 *
 * Parameters are short and readable (`?for=rent&city=London&beds=2-&pets=yes`).
 * Defaults are left out, and unknown or malformed values are ignored rather
 * than guessed. Only search criteria go in the URL: never saved homes, notes,
 * ratings or viewing history.
 */

export interface SearchState {
  filters: Filters;
  sort: SortKey;
  mapMode: MapMode;
}

export const DEFAULT_SEARCH_STATE: SearchState = { filters: DEFAULT_FILTERS, sort: 'newest', mapMode: 'homes' };

/** URL values use hyphens ("share-of-freehold"); model values use underscores. */
const slug = (v: string) => v.replace(/_/g, '-');

type Codec =
  | { param: string; kind: 'text'; key: 'query' | 'city' }
  | { param: string; kind: 'flag'; key: BooleanKey }
  | { param: string; kind: 'number'; key: NumberKey; allowZero?: boolean }
  | { param: string; kind: 'range'; min: NumberKey; max: NumberKey }
  | { param: string; kind: 'enum'; key: EnumKey; values: Record<string, string> }
  | { param: string; kind: 'list'; key: ListKey; values: readonly string[] }
  | { param: string; kind: 'date'; key: 'availableBy' };

type KeysOfType<T> = { [K in keyof Filters]: Filters[K] extends T ? K : never }[keyof Filters];
type BooleanKey = KeysOfType<boolean>;
type NumberKey = KeysOfType<number | null>;
type ListKey = KeysOfType<readonly string[]>;
type EnumKey = 'country' | 'pricePeriod' | 'areaUnit' | 'minEpcRating' | 'completion' | 'petPolicy' | 'incomeCheck';

const identity = (values: readonly string[]) => Object.fromEntries(values.map((v) => [slug(v), v]));

/** Order here is the order parameters appear in a URL. */
const CODECS: readonly Codec[] = [
  { param: 'q', kind: 'text', key: 'query' },
  { param: 'country', kind: 'enum', key: 'country', values: { all: 'all', ...Object.fromEntries(COUNTRY_CODES.map((c) => [c.toLowerCase(), c])) } },
  { param: 'city', kind: 'text', key: 'city' },
  { param: 'for', kind: 'enum', key: 'pricePeriod', values: { sale: 'total', rent: 'monthly' } },
  { param: 'price', kind: 'range', min: 'minSalePrice', max: 'maxSalePrice' },
  { param: 'rent', kind: 'range', min: 'minMonthlyPrice', max: 'maxMonthlyPrice' },
  { param: 'type', kind: 'list', key: 'types', values: PROPERTY_TYPES },
  { param: 'beds', kind: 'range', min: 'minBedrooms', max: 'maxBedrooms' },
  { param: 'baths', kind: 'range', min: 'minBathrooms', max: 'maxBathrooms' },
  { param: 'unit', kind: 'enum', key: 'areaUnit', values: identity(AREA_UNITS) },
  { param: 'area', kind: 'range', min: 'minArea', max: 'maxArea' },
  { param: 'status', kind: 'list', key: 'statuses', values: LISTING_STATUSES },
  { param: 'garden', kind: 'flag', key: 'hasGarden' },
  { param: 'parking', kind: 'flag', key: 'hasParking' },
  { param: 'epc', kind: 'enum', key: 'minEpcRating', values: Object.fromEntries(EPC_RATINGS.map((r) => [r.toLowerCase(), r])) },
  // Sale only
  { param: 'tenure', kind: 'list', key: 'tenure', values: TENURES },
  { param: 'newbuild', kind: 'flag', key: 'newBuildOnly' },
  { param: 'completion', kind: 'enum', key: 'completion', values: identity(COMPLETION_OPTIONS.filter((v) => v !== 'any')) },
  { param: 'chainfree', kind: 'flag', key: 'chainFree' },
  { param: 'outdoor', kind: 'list', key: 'outdoorSpace', values: OUTDOOR_SPACES },
  { param: 'parkingtype', kind: 'list', key: 'parkingTypes', values: PARKING_TYPES },
  { param: 'lease', kind: 'number', key: 'minLeaseYears' },
  { param: 'servicecharge', kind: 'number', key: 'maxServiceCharge' },
  { param: 'groundrent', kind: 'number', key: 'maxGroundRent', allowZero: true },
  // Rent only
  { param: 'furnishing', kind: 'list', key: 'furnishing', values: FURNISHINGS },
  { param: 'pets', kind: 'enum', key: 'petPolicy', values: { yes: 'allowed', no: 'not_allowed' } },
  { param: 'couples', kind: 'flag', key: 'couplesWelcome' },
  { param: 'students', kind: 'flag', key: 'studentFriendly' },
  { param: 'welcomes', kind: 'list', key: 'applicantsWelcome', values: APPLICANT_GROUPS },
  { param: 'income', kind: 'enum', key: 'incomeCheck', values: identity(INCOME_CHECK_OPTIONS.filter((v) => v !== 'any')) },
  { param: 'sharers', kind: 'flag', key: 'sharersAccepted' },
  { param: 'hmo', kind: 'flag', key: 'hmoLicensed' },
  { param: 'shortlet', kind: 'flag', key: 'shortLetsAccepted' },
  { param: 'office', kind: 'flag', key: 'homeOffice' },
  { param: 'stepfree', kind: 'flag', key: 'stepFreeAccess' },
  { param: 'lift', kind: 'flag', key: 'hasLift' },
  { param: 'accessiblebath', kind: 'flag', key: 'accessibleBathroom' },
  { param: 'bills', kind: 'list', key: 'includedBills', values: BILLS },
  { param: 'deposit', kind: 'number', key: 'maxDepositWeeks', allowZero: true },
  { param: 'availableby', kind: 'date', key: 'availableBy' },
];

const SORT_PARAMS: Record<string, SortKey> = Object.fromEntries(SORT_KEYS.map((k) => [k, k]));
const MAP_PARAMS: Record<string, MapMode> = Object.fromEntries(MAP_MODES.filter((m) => m !== 'homes').map((m) => [m, m]));

const keyFor = (values: Record<string, string>, value: string) => Object.entries(values).find(([, v]) => v === value)?.[0];
const MAX_NUMBER = 100_000_000;

function parseNumber(raw: string, allowZero = true): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const n = Number(raw);
  return n > MAX_NUMBER || (!allowZero && n === 0) ? null : n;
}

/** Search state → `?a=b&…` (or `''` when everything is default). */
export function encodeSearch(state: SearchState): string {
  const f = state.filters;
  const params = new URLSearchParams();
  for (const c of CODECS) {
    switch (c.kind) {
      case 'text': {
        const v = c.key === 'query' ? f.query.trim() : f.city;
        if (v && v !== DEFAULT_FILTERS[c.key]) params.set(c.param, v);
        break;
      }
      case 'flag':
        if (f[c.key]) params.set(c.param, '1');
        break;
      case 'number':
        if (f[c.key] !== null) params.set(c.param, String(f[c.key]));
        break;
      case 'range': {
        const min = f[c.min];
        const max = f[c.max];
        if (min !== null || max !== null) params.set(c.param, `${min ?? ''}-${max ?? ''}`);
        break;
      }
      case 'enum': {
        const v = f[c.key];
        if (v !== DEFAULT_FILTERS[c.key] && v !== null) {
          const k = keyFor(c.values, v);
          if (k) params.set(c.param, k);
        }
        break;
      }
      case 'list': {
        const v = f[c.key] as readonly string[];
        if (v.length) params.set(c.param, v.map(slug).join(','));
        break;
      }
      case 'date':
        if (f.availableBy) params.set(c.param, f.availableBy);
        break;
    }
  }
  if (state.sort !== DEFAULT_SEARCH_STATE.sort) params.set('sort', state.sort);
  if (state.mapMode !== DEFAULT_SEARCH_STATE.mapMode) params.set('map', state.mapMode);
  const qs = params.toString().replace(/%2C/g, ',');
  return qs ? `?${qs}` : '';
}

/**
 * `?…` → search state. Unknown parameters and bad values are skipped; the
 * result then goes through `updateFilters`, so it is coherent (a city implies
 * its country, rent-only values are dropped outside Rent, ranges never cross).
 */
export function decodeSearch(search: string, cityCountry: Readonly<Record<string, CountryCode>>): SearchState {
  const params = new URLSearchParams(search);
  const patch: Record<string, unknown> = {};
  for (const c of CODECS) {
    const raw = params.get(c.param);
    if (raw === null || raw === '') continue;
    switch (c.kind) {
      case 'text':
        if (c.key === 'query') patch.query = raw.slice(0, 200);
        else if (cityCountry[raw]) patch.city = raw;
        break;
      case 'flag':
        if (raw === '1' || raw === 'true') patch[c.key] = true;
        break;
      case 'number': {
        const n = parseNumber(raw, c.allowZero);
        if (n !== null) patch[c.key] = n;
        break;
      }
      case 'range': {
        const m = /^(\d*)-(\d*)$/.exec(raw);
        if (!m) break;
        const min = m[1] ? parseNumber(m[1]) : null;
        const max = m[2] ? parseNumber(m[2]) : null;
        if (min !== null && max !== null && min > max) break;
        if (min !== null) patch[c.min] = min;
        if (max !== null) patch[c.max] = max;
        break;
      }
      case 'enum': {
        const v = c.values[raw.toLowerCase()];
        if (v !== undefined) patch[c.key] = v;
        break;
      }
      case 'list': {
        const allowed = new Map(c.values.map((v) => [slug(v), v]));
        const items = [...new Set(raw.split(',').map((x) => allowed.get(x)).filter((x): x is string => x !== undefined))];
        if (items.length) patch[c.key] = items;
        break;
      }
      case 'date':
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw))) patch.availableBy = raw;
        break;
    }
  }
  // Set the context first so its own filters survive the context-clearing rules.
  const base = updateFilters(DEFAULT_FILTERS, { pricePeriod: (patch.pricePeriod as Filters['pricePeriod']) ?? 'all' }, cityCountry);
  const filters = updateFilters(base, patch as Partial<Filters>, cityCountry);
  return {
    filters,
    sort: SORT_PARAMS[params.get('sort') ?? ''] ?? DEFAULT_SEARCH_STATE.sort,
    mapMode: MAP_PARAMS[params.get('map') ?? ''] ?? DEFAULT_SEARCH_STATE.mapMode,
  };
}

/** True when two encoded searches differ only in the free-text query (typing should not flood history). */
export function onlyQueryChanged(a: string, b: string): boolean {
  const strip = (s: string) => {
    const p = new URLSearchParams(s);
    p.delete('q');
    return p.toString();
  };
  return a !== b && strip(a) === strip(b);
}
