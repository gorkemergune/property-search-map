import { MARKETS } from '../data/markets';
import { t } from '../i18n/en';
import { areaIn, formatArea, formatCompactAmount } from './format';
import { matchesQuery } from './text';
import {
  LISTING_STATUSES,
  type AreaUnit,
  type CountryCode,
  type Currency,
  type Furnishing,
  type ListingStatus,
  type PricePeriod,
  type Property,
  type PropertyType,
} from '../types/property';

export { normalizeText } from './text';

/** Minimum-bedroom options; 5 means "5+". */
export const BEDROOM_MIN_OPTIONS = [1, 2, 3, 4, 5] as const;
/** Maximum-bedroom options; 0 means "studio only". */
export const BEDROOM_MAX_OPTIONS = [0, 1, 2, 3, 4] as const;
export const BATHROOM_OPTIONS = [1, 2, 3, 4] as const;

/** Preset floor-area bounds per unit. */
export const AREA_STEPS: Record<AreaUnit, readonly number[]> = {
  sqm: [30, 50, 75, 100, 150, 200, 300, 400],
  sqft: [300, 500, 750, 1_000, 1_500, 2_000, 3_000, 4_000],
};

export const SORT_KEYS = ['newest', 'updated', 'price-asc', 'price-desc', 'bedrooms-desc', 'area-desc'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Filters {
  query: string;
  country: CountryCode | 'all';
  city: string | 'all';
  pricePeriod: PricePeriod | 'all';
  minPrice: number | null;
  maxPrice: number | null;
  types: PropertyType[];
  /** `maxBedrooms: 0` = studios only; `minBedrooms: 5` = "5+". */
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minBathrooms: number | null;
  maxBathrooms: number | null;
  /** Unit for the area bounds below and for area shown on listings. */
  areaUnit: AreaUnit;
  minArea: number | null;
  maxArea: number | null;
  /** Rentals only; cleared outside the Rent context. */
  furnishing: Furnishing[];
  statuses: ListingStatus[];
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  country: 'all',
  city: 'all',
  pricePeriod: 'all',
  minPrice: null,
  maxPrice: null,
  types: [],
  minBedrooms: null,
  maxBedrooms: null,
  minBathrooms: null,
  maxBathrooms: null,
  areaUnit: 'sqm',
  minArea: null,
  maxArea: null,
  furnishing: [],
  statuses: [],
};

/** Resets every filter but keeps the viewer's area unit preference. */
export function clearFilters(prev: Filters): Filters {
  return { ...DEFAULT_FILTERS, areaUnit: prev.areaUnit };
}

export interface PriceContext {
  currency: Currency;
  pricePeriod: PricePeriod;
}

/**
 * A price range or price sort only makes sense inside one currency and one
 * sale/rent context. Returns null when the filters span several.
 */
export function getPriceContext(f: Pick<Filters, 'country' | 'pricePeriod'>): PriceContext | null {
  if (f.country === 'all' || f.pricePeriod === 'all') return null;
  return { currency: MARKETS[f.country].currency, pricePeriod: f.pricePeriod };
}

/** Statuses that can apply to a sale/rent context (`sold` is sale-only, `let` is rent-only). */
export function statusesFor(period: PricePeriod | 'all'): ListingStatus[] {
  if (period === 'total') return LISTING_STATUSES.filter((s) => s !== 'let');
  if (period === 'monthly') return LISTING_STATUSES.filter((s) => s !== 'sold');
  return [...LISTING_STATUSES];
}

/** Inclusive range check; a null bound is open. */
export function matchesRange(value: number, min: number | null, max: number | null): boolean {
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

export { areaIn } from './format';

export function applyFilters(list: readonly Property[], f: Filters): Property[] {
  const priceContext = getPriceContext(f);
  return list.filter((p) => {
    if (f.country !== 'all' && p.countryCode !== f.country) return false;
    if (f.city !== 'all' && p.city !== f.city) return false;
    if (f.pricePeriod !== 'all' && p.pricePeriod !== f.pricePeriod) return false;
    if (f.types.length > 0 && !f.types.includes(p.type)) return false;
    if (!matchesRange(p.bedrooms, f.minBedrooms, f.maxBedrooms)) return false;
    if (!matchesRange(p.bathrooms, f.minBathrooms, f.maxBathrooms)) return false;
    if (!matchesRange(areaIn(p, f.areaUnit), f.minArea, f.maxArea)) return false;
    if (f.statuses.length > 0 && !f.statuses.includes(p.status)) return false;
    // Furnishing only exists on rentals, so it only filters inside the Rent context.
    if (f.pricePeriod === 'monthly' && f.furnishing.length > 0 && !(p.furnishing && f.furnishing.includes(p.furnishing))) {
      return false;
    }
    // Price bounds are ignored outside a single market + period, so currencies never mix.
    if (priceContext && !matchesRange(p.price, f.minPrice, f.maxPrice)) return false;
    return matchesQuery(p, f.query);
  });
}

export function isPriceSort(sort: SortKey): boolean {
  return sort === 'price-asc' || sort === 'price-desc';
}

/** Falls back to "newest" when a price sort is requested without a price context. */
export function effectiveSort(sort: SortKey, f: Filters): SortKey {
  return isPriceSort(sort) && !getPriceContext(f) ? 'newest' : sort;
}

const byNewest = (a: Property, b: Property) => b.listedAt.localeCompare(a.listedAt) || a.id.localeCompare(b.id);

export function sortProperties(list: readonly Property[], sort: SortKey): Property[] {
  const sorted = [...list];
  switch (sort) {
    case 'price-asc':
    case 'price-desc': {
      const dir = sort === 'price-asc' ? 1 : -1;
      // Group by currency + period first so raw prices are only compared within a group.
      sorted.sort((a, b) => {
        const group = `${a.currency}:${a.pricePeriod}`.localeCompare(`${b.currency}:${b.pricePeriod}`);
        return group || (a.price - b.price) * dir || a.id.localeCompare(b.id);
      });
      break;
    }
    case 'updated':
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || byNewest(a, b));
      break;
    case 'bedrooms-desc':
      sorted.sort((a, b) => b.bedrooms - a.bedrooms || byNewest(a, b));
      break;
    case 'area-desc':
      sorted.sort((a, b) => b.areaSqm - a.areaSqm || byNewest(a, b));
      break;
    default:
      sorted.sort(byNewest);
  }
  return sorted;
}

/** Keeps the bound that was just edited when min and max cross. */
function fixRange(next: Filters, patch: Partial<Filters>, minKey: RangeKey, maxKey: RangeKey) {
  const min = next[minKey];
  const max = next[maxKey];
  if (min !== null && max !== null && min > max) {
    if (patch[minKey] !== undefined) next[maxKey] = null;
    else next[minKey] = null;
  }
}
type RangeKey = 'minPrice' | 'maxPrice' | 'minBedrooms' | 'maxBedrooms' | 'minBathrooms' | 'maxBathrooms' | 'minArea' | 'maxArea';

/**
 * Applies a filter change and keeps the result coherent:
 * - picking a city also picks its country; changing country drops a city from another country;
 * - choosing all countries also clears the city;
 * - changing country or sale/rent clears the price range (steps and currency differ);
 * - changing the area unit clears the area range;
 * - statuses and furnishing that cannot apply to the sale/rent context are dropped;
 * - an inverted min/max keeps the value just changed.
 */
export function updateFilters(
  prev: Filters,
  patch: Partial<Filters>,
  cityCountry: Readonly<Record<string, CountryCode>>,
): Filters {
  const next: Filters = { ...prev, ...patch };

  if (patch.city !== undefined && patch.city !== 'all' && cityCountry[patch.city]) {
    next.country = cityCountry[patch.city];
  }
  // Choosing "All markets" means every city too.
  if (patch.country === 'all' && patch.city === undefined) next.city = 'all';
  if (next.city !== 'all' && next.country !== 'all' && cityCountry[next.city] !== next.country) {
    next.city = 'all';
  }

  if (next.country !== prev.country || next.pricePeriod !== prev.pricePeriod) {
    if (patch.minPrice === undefined) next.minPrice = null;
    if (patch.maxPrice === undefined) next.maxPrice = null;
  }
  if (!getPriceContext(next)) {
    next.minPrice = null;
    next.maxPrice = null;
  }
  if (next.areaUnit !== prev.areaUnit) {
    if (patch.minArea === undefined) next.minArea = null;
    if (patch.maxArea === undefined) next.maxArea = null;
  }

  fixRange(next, patch, 'minPrice', 'maxPrice');
  fixRange(next, patch, 'minBedrooms', 'maxBedrooms');
  fixRange(next, patch, 'minBathrooms', 'maxBathrooms');
  fixRange(next, patch, 'minArea', 'maxArea');

  const allowed = statusesFor(next.pricePeriod);
  next.statuses = next.statuses.filter((s) => allowed.includes(s));
  if (next.pricePeriod !== 'monthly') next.furnishing = [];

  return next;
}

export function buildCityIndex(list: readonly Property[]): Record<string, CountryCode> {
  const index: Record<string, CountryCode> = {};
  for (const p of list) index[p.city] = p.countryCode;
  return index;
}

export interface FilterChip {
  key: string;
  label: string;
  remove: Partial<Filters>;
}

/** "Studio", "2+ beds", "Up to 3 beds", "2–3 beds", "2 beds". */
export function bedroomsLabel(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (max === 0) return t.bedrooms.studio;
  if (min !== null && max === null) return t.bedrooms.chip(min);
  if (min === null && max !== null) return t.bedrooms.upTo(max);
  if (min === max) return t.bedrooms.exactly(min!);
  return t.bedrooms.range(min!, max!);
}

export function bathroomsLabel(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max === null) return t.bathrooms.atLeast(min);
  if (min === null && max !== null) return t.bathrooms.upTo(max);
  if (min === max) return t.bathrooms.exactly(min!);
  return t.bathrooms.range(min!, max!);
}

export function areaLabel(min: number | null, max: number | null, unit: AreaUnit): string | null {
  if (min === null && max === null) return null;
  const fmt = (v: number) => formatArea(v, unit);
  if (min !== null && max !== null) return t.price.range(fmt(min), fmt(max));
  return min !== null ? t.price.from(fmt(min)) : t.price.upTo(fmt(max!));
}

export function priceLabel(f: Pick<Filters, 'country' | 'pricePeriod' | 'minPrice' | 'maxPrice'>): string | null {
  const ctx = getPriceContext(f);
  if (!ctx || (f.minPrice === null && f.maxPrice === null)) return null;
  const fmt = (v: number) => formatCompactAmount(v, ctx.currency);
  const suffix = ctx.pricePeriod === 'monthly' ? t.price.perMonth : '';
  const label =
    f.minPrice !== null && f.maxPrice !== null
      ? t.price.range(fmt(f.minPrice), fmt(f.maxPrice))
      : f.minPrice !== null
        ? t.price.from(fmt(f.minPrice))
        : t.price.upTo(fmt(f.maxPrice!));
  return label + suffix;
}

export function getActiveChips(f: Filters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.query.trim()) chips.push({ key: 'query', label: `“${f.query.trim()}”`, remove: { query: '' } });
  if (f.country !== 'all') chips.push({ key: 'country', label: t.countries[f.country], remove: { country: 'all', city: 'all' } });
  if (f.city !== 'all') chips.push({ key: 'city', label: f.city, remove: { city: 'all' } });
  if (f.pricePeriod !== 'all') chips.push({ key: 'period', label: t.listingTag[f.pricePeriod], remove: { pricePeriod: 'all' } });

  const price = priceLabel(f);
  if (price) chips.push({ key: 'price', label: price, remove: { minPrice: null, maxPrice: null } });

  for (const type of f.types) {
    chips.push({ key: `type-${type}`, label: t.propertyTypes[type], remove: { types: f.types.filter((x) => x !== type) } });
  }
  const beds = bedroomsLabel(f.minBedrooms, f.maxBedrooms);
  if (beds) chips.push({ key: 'bedrooms', label: beds, remove: { minBedrooms: null, maxBedrooms: null } });
  const baths = bathroomsLabel(f.minBathrooms, f.maxBathrooms);
  if (baths) chips.push({ key: 'bathrooms', label: baths, remove: { minBathrooms: null, maxBathrooms: null } });
  const area = areaLabel(f.minArea, f.maxArea, f.areaUnit);
  if (area) chips.push({ key: 'area', label: area, remove: { minArea: null, maxArea: null } });
  for (const item of f.furnishing) {
    chips.push({ key: `furnishing-${item}`, label: t.furnishing[item], remove: { furnishing: f.furnishing.filter((x) => x !== item) } });
  }
  for (const status of f.statuses) {
    chips.push({ key: `status-${status}`, label: t.statuses[status], remove: { statuses: f.statuses.filter((x) => x !== status) } });
  }
  return chips;
}
