import { MARKETS } from '../data/markets';
import { t } from '../i18n/en';
import { areaIn, formatArea, formatCompactAmount } from './format';
import { matchesQuery } from './text';
import {
  BILLS,
  EPC_RATINGS,
  LEASE_TENURES,
  LISTING_STATUSES,
  type AreaUnit,
  type Bill,
  type CountryCode,
  type Currency,
  type EpcRating,
  type Furnishing,
  type ListingStatus,
  type OutdoorSpace,
  type ParkingType,
  type PricePeriod,
  type Property,
  type PropertyType,
  type Tenure,
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

/** Maximum deposit presets, in weeks of rent; 0 = "No deposit". */
export const DEPOSIT_WEEK_OPTIONS = [0, 4, 5] as const;
/** Minimum remaining lease presets, in years. Below ~80 years a lease gets costly to extend. */
export const LEASE_YEAR_OPTIONS = [80, 99, 125, 250, 900] as const;
/** Maximum annual service charge presets, GBP. */
export const SERVICE_CHARGE_OPTIONS = [1_000, 2_000, 3_000, 5_000] as const;
/** Maximum annual ground rent presets, GBP; 0 = "No ground rent". */
export const GROUND_RENT_OPTIONS = [0, 100, 250, 500] as const;

export const PET_POLICIES = ['any', 'allowed', 'not_allowed'] as const;
export type PetPolicy = (typeof PET_POLICIES)[number];
export const COMPLETION_OPTIONS = ['any', 'ready', 'off_plan'] as const;
export type CompletionFilter = (typeof COMPLETION_OPTIONS)[number];

export const SORT_KEYS = ['newest', 'updated', 'price-asc', 'price-desc', 'bedrooms-desc', 'area-desc'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Filters {
  query: string;
  country: CountryCode | 'all';
  city: string | 'all';
  pricePeriod: PricePeriod | 'all';
  /** Sale (total) price bounds — only applied to listings whose pricePeriod is 'total'. */
  minSalePrice: number | null;
  maxSalePrice: number | null;
  /** Monthly rent bounds — only applied to listings whose pricePeriod is 'monthly'. */
  minMonthlyPrice: number | null;
  maxMonthlyPrice: number | null;
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
  /** Rentals only; cleared outside the Rent context (as is every rent-only field below). */
  furnishing: Furnishing[];
  statuses: ListingStatus[];
  /** Must-have property features; a `true` means the listing must have it. */
  hasGarden: boolean;
  hasParking: boolean;
  /** Minimum acceptable EPC rating (A best, G worst). `null` = any. */
  minEpcRating: EpcRating | null;
  /** Sale only — ownership structures to include. Empty = any. */
  tenure: Tenure[];
  /** Sale only — restrict to newly built listings when true. */
  newBuildOnly: boolean;
  /** Sale only — new builds that are completed (`ready`) or still off-plan. */
  completion: CompletionFilter;
  chainFree: boolean;
  /** Sale only — any of these outdoor space types. Empty = any. */
  outdoorSpace: OutdoorSpace[];
  /** Sale only — any of these parking types. Empty = any. */
  parkingTypes: ParkingType[];
  /** Sale only — lease bounds. They only constrain leasehold / share of freehold listings. */
  minLeaseYears: number | null;
  maxServiceCharge: number | null;
  maxGroundRent: number | null;
  /** Rentals only — `allowed`/`not_allowed` need an explicit policy; unknown matches neither. */
  petPolicy: PetPolicy;
  studentFriendly: boolean;
  sharersAccepted: boolean;
  hmoLicensed: boolean;
  shortLetsAccepted: boolean;
  homeOffice: boolean;
  stepFreeAccess: boolean;
  hasLift: boolean;
  accessibleBathroom: boolean;
  /** Rentals only — every one of these bills must be included. */
  includedBills: Bill[];
  /** Rentals only — maximum deposit in weeks of rent. */
  maxDepositWeeks: number | null;
  /** Rentals only — ISO date; keep listings available on or before this day. */
  availableBy: string | null;
}

/** Rent-only filters at their defaults; applied whenever the Rent context is left. */
const RENT_ONLY_DEFAULTS = {
  furnishing: [],
  petPolicy: 'any',
  studentFriendly: false,
  sharersAccepted: false,
  hmoLicensed: false,
  shortLetsAccepted: false,
  homeOffice: false,
  stepFreeAccess: false,
  hasLift: false,
  accessibleBathroom: false,
  includedBills: [],
  maxDepositWeeks: null,
  availableBy: null,
} satisfies Partial<Filters>;

/** Sale-only filters at their defaults; applied whenever the Buy context is left. */
const SALE_ONLY_DEFAULTS = {
  tenure: [],
  newBuildOnly: false,
  completion: 'any',
  chainFree: false,
  outdoorSpace: [],
  parkingTypes: [],
  minLeaseYears: null,
  maxServiceCharge: null,
  maxGroundRent: null,
} satisfies Partial<Filters>;

export const DEFAULT_FILTERS: Filters = {
  query: '',
  country: 'GB',
  city: 'all',
  pricePeriod: 'all',
  minSalePrice: null,
  maxSalePrice: null,
  minMonthlyPrice: null,
  maxMonthlyPrice: null,
  types: [],
  minBedrooms: null,
  maxBedrooms: null,
  minBathrooms: null,
  maxBathrooms: null,
  areaUnit: 'sqm',
  minArea: null,
  maxArea: null,
  statuses: [],
  hasGarden: false,
  hasParking: false,
  minEpcRating: null,
  ...RENT_ONLY_DEFAULTS,
  ...SALE_ONLY_DEFAULTS,
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
 * Price sorting only makes sense inside a single sale/rent context, since sale
 * totals and monthly rents are on completely different scales. Price filtering
 * is handled per-period (see `applyFilters`) and works in every mode.
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

/** EPC comparisons use A=0 (best) through G=6 (worst), so `rank(x) <= rank(min)` keeps A–min. */
const EPC_RANK: Record<EpcRating, number> = Object.fromEntries(EPC_RATINGS.map((r, i) => [r, i])) as Record<EpcRating, number>;

export function applyFilters(list: readonly Property[], f: Filters): Property[] {
  return list.filter((p) => {
    if (f.country !== 'all' && p.countryCode !== f.country) return false;
    if (f.city !== 'all' && p.city !== f.city) return false;
    if (f.pricePeriod !== 'all' && p.pricePeriod !== f.pricePeriod) return false;
    if (f.types.length > 0 && !f.types.includes(p.type)) return false;
    if (!matchesRange(p.bedrooms, f.minBedrooms, f.maxBedrooms)) return false;
    if (!matchesRange(p.bathrooms, f.minBathrooms, f.maxBathrooms)) return false;
    if (!matchesRange(areaIn(p, f.areaUnit), f.minArea, f.maxArea)) return false;
    if (f.statuses.length > 0 && !f.statuses.includes(p.status)) return false;
    // Price bounds apply per period, so sale totals never compare against monthly rents.
    if (p.pricePeriod === 'total' && !matchesRange(p.price, f.minSalePrice, f.maxSalePrice)) return false;
    if (p.pricePeriod === 'monthly' && !matchesRange(p.price, f.minMonthlyPrice, f.maxMonthlyPrice)) return false;
    // Must-have features (both contexts).
    if (f.hasGarden && !p.hasGarden) return false;
    if (f.hasParking && !p.hasParking) return false;
    if (f.minEpcRating && EPC_RANK[p.epcRating] > EPC_RANK[f.minEpcRating]) return false;
    if (f.pricePeriod === 'total' && !matchesSaleFilters(p, f)) return false;
    if (f.pricePeriod === 'monthly' && !matchesRentFilters(p, f)) return false;
    return matchesQuery(p, f.query);
  });
}

/** An `undefined` (not stated) value never satisfies a must-have. */
const has = (value: boolean | undefined) => value === true;

/** Sale-only filters; only consulted in the Buy context. */
function matchesSaleFilters(p: Property, f: Filters): boolean {
  if (f.tenure.length > 0 && !(p.tenure && f.tenure.includes(p.tenure))) return false;
  if (f.newBuildOnly && !p.newBuild) return false;
  if (f.completion !== 'any' && !(p.newBuild && p.offPlan === (f.completion === 'off_plan'))) return false;
  if (f.chainFree && !has(p.chainFree)) return false;
  if (f.outdoorSpace.length > 0 && !p.outdoorSpace?.some((x) => f.outdoorSpace.includes(x))) return false;
  if (f.parkingTypes.length > 0 && !p.parking?.some((x) => f.parkingTypes.includes(x))) return false;
  // Lease bounds are about leases, so freehold and Scottish homes pass; a lease with no stated value does not.
  if (p.tenure && LEASE_TENURES.includes(p.tenure)) {
    if (f.minLeaseYears !== null && !(p.leaseYearsRemaining !== undefined && p.leaseYearsRemaining >= f.minLeaseYears)) return false;
    if (f.maxServiceCharge !== null && !(p.serviceChargePerYear !== undefined && p.serviceChargePerYear <= f.maxServiceCharge)) return false;
    if (f.maxGroundRent !== null && !(p.groundRentPerYear !== undefined && p.groundRentPerYear <= f.maxGroundRent)) return false;
  }
  return true;
}

/** Rent-only filters; only consulted in the Rent context. */
function matchesRentFilters(p: Property, f: Filters): boolean {
  if (f.furnishing.length > 0 && !(p.furnishing && f.furnishing.includes(p.furnishing))) return false;
  if (f.petPolicy === 'allowed' && p.petsAllowed !== true) return false;
  if (f.petPolicy === 'not_allowed' && p.petsAllowed !== false) return false;
  if (f.studentFriendly && !has(p.studentFriendly)) return false;
  if (f.sharersAccepted && !has(p.sharersAccepted)) return false;
  if (f.hmoLicensed && !has(p.hmoLicensed)) return false;
  if (f.shortLetsAccepted && !has(p.shortLetsAccepted)) return false;
  if (f.homeOffice && !has(p.homeOffice)) return false;
  if (f.stepFreeAccess && !has(p.stepFreeAccess)) return false;
  if (f.hasLift && !has(p.hasLift)) return false;
  if (f.accessibleBathroom && !has(p.accessibleBathroom)) return false;
  if (f.includedBills.length > 0 && !f.includedBills.every((b) => p.includedBills?.includes(b))) return false;
  if (f.maxDepositWeeks !== null && !(p.depositWeeks !== undefined && p.depositWeeks <= f.maxDepositWeeks)) return false;
  if (f.availableBy && !(p.availableFrom && p.availableFrom <= f.availableBy)) return false;
  return true;
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
type RangeKey = 'minSalePrice' | 'maxSalePrice' | 'minMonthlyPrice' | 'maxMonthlyPrice' | 'minBedrooms' | 'maxBedrooms' | 'minBathrooms' | 'maxBathrooms' | 'minArea' | 'maxArea';

/**
 * Applies a filter change and keeps the result coherent:
 * - picking a city also picks its country; changing country drops a city from another country;
 * - choosing all countries also clears the city;
 * - changing country or sale/rent clears the price range (steps and currency differ);
 * - changing the area unit clears the area range;
 * - statuses that cannot apply to the sale/rent context are dropped, and leaving
 *   Buy or Rent resets that context's own filters (furnishing, pets, lease, …);
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

  if (next.areaUnit !== prev.areaUnit) {
    if (patch.minArea === undefined) next.minArea = null;
    if (patch.maxArea === undefined) next.maxArea = null;
  }

  fixRange(next, patch, 'minSalePrice', 'maxSalePrice');
  fixRange(next, patch, 'minMonthlyPrice', 'maxMonthlyPrice');
  fixRange(next, patch, 'minBedrooms', 'maxBedrooms');
  fixRange(next, patch, 'minBathrooms', 'maxBathrooms');
  fixRange(next, patch, 'minArea', 'maxArea');

  const allowed = statusesFor(next.pricePeriod);
  next.statuses = next.statuses.filter((s) => allowed.includes(s));
  if (next.pricePeriod !== 'monthly') Object.assign(next, RENT_ONLY_DEFAULTS);
  if (next.pricePeriod !== 'total') Object.assign(next, SALE_ONLY_DEFAULTS);

  return next;
}

export function buildCityIndex(list: readonly Property[]): Record<string, CountryCode> {
  const index: Record<string, CountryCode> = {};
  for (const p of list) index[p.city] = p.countryCode;
  return index;
}

/** Rent-only yes/no must-haves, in display order. Accessibility flags are grouped separately in the UI. */
export const RENT_FLAGS = [
  'studentFriendly',
  'sharersAccepted',
  'hmoLicensed',
  'shortLetsAccepted',
  'homeOffice',
  'stepFreeAccess',
  'hasLift',
  'accessibleBathroom',
] as const satisfies readonly (keyof Filters)[];
export type RentFlag = (typeof RENT_FLAGS)[number];

/**
 * One-tap shortcuts shown above the results. A preset is only a patch on the
 * normal filter state, so it shows up as ordinary chips, combines with every
 * other filter and is undone by removing those chips or by "Clear all".
 */
export interface QuickPreset {
  key: string;
  label: string;
  /** Contexts where the preset is offered. A rent- or sale-only preset offered under "Any" switches to its context. */
  contexts: readonly (PricePeriod | 'all')[];
  patch: Partial<Filters>;
  isActive: (f: Filters) => boolean;
}

export const QUICK_PRESETS: readonly QuickPreset[] = [
  {
    key: 'students',
    label: t.presets.students,
    contexts: ['monthly', 'all'],
    patch: { pricePeriod: 'monthly', studentFriendly: true },
    isActive: (f) => f.studentFriendly,
  },
  {
    key: 'pets',
    label: t.presets.pets,
    contexts: ['monthly', 'all'],
    patch: { pricePeriod: 'monthly', petPolicy: 'allowed' },
    isActive: (f) => f.petPolicy === 'allowed',
  },
  {
    key: 'sharers',
    label: t.presets.sharers,
    contexts: ['monthly'],
    patch: { sharersAccepted: true },
    isActive: (f) => f.sharersAccepted,
  },
  {
    key: 'bills',
    label: t.presets.bills,
    contexts: ['monthly'],
    patch: { includedBills: [...BILLS] },
    isActive: (f) => BILLS.every((b) => f.includedBills.includes(b)),
  },
  {
    key: 'accessible',
    label: t.presets.accessible,
    contexts: ['monthly'],
    patch: { stepFreeAccess: true },
    isActive: (f) => f.stepFreeAccess,
  },
  {
    key: 'chainFree',
    label: t.presets.chainFree,
    contexts: ['total', 'all'],
    patch: { pricePeriod: 'total', chainFree: true },
    isActive: (f) => f.chainFree,
  },
  {
    key: 'longLease',
    label: t.presets.longLease,
    contexts: ['total'],
    patch: { minLeaseYears: 99 },
    isActive: (f) => f.minLeaseYears !== null && f.minLeaseYears >= 99,
  },
  {
    key: 'garden',
    label: t.presets.garden,
    contexts: ['total', 'monthly', 'all'],
    patch: { hasGarden: true },
    isActive: (f) => f.hasGarden,
  },
];

export function presetsFor(period: PricePeriod | 'all'): QuickPreset[] {
  return QUICK_PRESETS.filter((p) => p.contexts.includes(period));
}

/** Patch that toggles a preset: applies it, or resets its fields (but never the Buy/Rent context). */
export function togglePreset(preset: QuickPreset, f: Filters): Partial<Filters> {
  if (!preset.isActive(f)) return preset.patch;
  const off: Partial<Filters> = {};
  for (const key of Object.keys(preset.patch) as (keyof Filters)[]) {
    if (key !== 'pricePeriod') Object.assign(off, { [key]: DEFAULT_FILTERS[key] });
  }
  return off;
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

/** Labels one of the two price ranges (sale totals or monthly rents) — used in chips and popovers. */
export function priceRangeLabel(min: number | null, max: number | null, period: PricePeriod): string | null {
  if (min === null && max === null) return null;
  const fmt = (v: number) => formatCompactAmount(v, 'GBP');
  const suffix = period === 'monthly' ? t.price.perMonth : '';
  const label =
    min !== null && max !== null
      ? t.price.range(fmt(min), fmt(max))
      : min !== null
        ? t.price.from(fmt(min))
        : t.price.upTo(fmt(max!));
  return label + suffix;
}

export function getActiveChips(f: Filters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.query.trim()) chips.push({ key: 'query', label: `“${f.query.trim()}”`, remove: { query: '' } });
  if (f.city !== 'all') chips.push({ key: 'city', label: f.city, remove: { city: 'all' } });
  if (f.pricePeriod !== 'all') chips.push({ key: 'period', label: t.listingTag[f.pricePeriod], remove: { pricePeriod: 'all' } });

  // Sale price chip only shows when the sale context is active (or no period filter).
  if (f.pricePeriod !== 'monthly') {
    const sale = priceRangeLabel(f.minSalePrice, f.maxSalePrice, 'total');
    if (sale) chips.push({ key: 'salePrice', label: sale, remove: { minSalePrice: null, maxSalePrice: null } });
  }
  // Monthly rent chip only shows when the rent context is active (or no period filter).
  if (f.pricePeriod !== 'total') {
    const monthly = priceRangeLabel(f.minMonthlyPrice, f.maxMonthlyPrice, 'monthly');
    if (monthly) chips.push({ key: 'monthlyPrice', label: monthly, remove: { minMonthlyPrice: null, maxMonthlyPrice: null } });
  }

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
  if (f.hasGarden) chips.push({ key: 'garden', label: t.filters.gardenChip, remove: { hasGarden: false } });
  if (f.hasParking) chips.push({ key: 'parking', label: t.filters.parkingChip, remove: { hasParking: false } });
  if (f.minEpcRating) chips.push({ key: 'epc', label: t.filters.epcChip(f.minEpcRating), remove: { minEpcRating: null } });
  for (const item of f.tenure) {
    chips.push({ key: `tenure-${item}`, label: t.tenures[item], remove: { tenure: f.tenure.filter((x) => x !== item) } });
  }
  if (f.newBuildOnly) chips.push({ key: 'newBuild', label: t.filters.newBuildChip, remove: { newBuildOnly: false } });
  if (f.completion !== 'any') chips.push({ key: 'completion', label: t.completion[f.completion], remove: { completion: 'any' } });
  if (f.chainFree) chips.push({ key: 'chainFree', label: t.filters.chainFreeChip, remove: { chainFree: false } });
  for (const item of f.outdoorSpace) {
    chips.push({ key: `outdoor-${item}`, label: t.outdoorSpaces[item], remove: { outdoorSpace: f.outdoorSpace.filter((x) => x !== item) } });
  }
  for (const item of f.parkingTypes) {
    chips.push({ key: `parking-${item}`, label: t.parkingTypes[item], remove: { parkingTypes: f.parkingTypes.filter((x) => x !== item) } });
  }
  if (f.minLeaseYears !== null) chips.push({ key: 'lease', label: t.filters.leaseChip(f.minLeaseYears), remove: { minLeaseYears: null } });
  if (f.maxServiceCharge !== null) {
    chips.push({ key: 'serviceCharge', label: t.filters.serviceChargeChip(formatCompactAmount(f.maxServiceCharge, 'GBP')), remove: { maxServiceCharge: null } });
  }
  if (f.maxGroundRent !== null) {
    chips.push({ key: 'groundRent', label: t.filters.groundRentChip(f.maxGroundRent, formatCompactAmount(f.maxGroundRent, 'GBP')), remove: { maxGroundRent: null } });
  }
  if (f.petPolicy !== 'any') chips.push({ key: 'pets', label: t.petPolicy[f.petPolicy], remove: { petPolicy: 'any' } });
  for (const key of RENT_FLAGS) {
    if (f[key]) chips.push({ key, label: t.filters.rentFlags[key].chip, remove: { [key]: false } });
  }
  for (const bill of f.includedBills) {
    chips.push({ key: `bill-${bill}`, label: t.filters.billChip(t.bills[bill]), remove: { includedBills: f.includedBills.filter((x) => x !== bill) } });
  }
  if (f.maxDepositWeeks !== null) chips.push({ key: 'deposit', label: t.filters.depositOption(f.maxDepositWeeks), remove: { maxDepositWeeks: null } });
  if (f.availableBy) chips.push({ key: 'availableBy', label: t.filters.availableByChip(f.availableBy), remove: { availableBy: null } });
  return chips;
}
