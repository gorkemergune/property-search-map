/**
 * Shared listing model for every market the POC covers (US, TR, GB).
 *
 * Prices are stored as plain numbers in the listing's own currency. They are
 * never converted, and listings in different currencies must never be compared
 * by raw price (see `src/data/markets.ts`).
 */

export const COUNTRY_CODES = ['US', 'TR', 'GB'] as const;
/** ISO 3166-1 alpha-2 country code. */
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const CURRENCIES = ['USD', 'TRY', 'GBP'] as const;
/** ISO 4217 currency code. */
export type Currency = (typeof CURRENCIES)[number];

/**
 * What `price` means:
 * - `total`: total asking price of a property for sale.
 * - `monthly`: monthly rent of a property to let.
 *
 * This is also the sale/rent distinction used by filters.
 */
export const PRICE_PERIODS = ['total', 'monthly'] as const;
export type PricePeriod = (typeof PRICE_PERIODS)[number];

export const PROPERTY_TYPES = ['apartment', 'house', 'townhouse', 'villa'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/**
 * Availability of a listing, shared across all markets.
 * - `available`: on the market.
 * - `under_offer`: offer accepted, deal not completed (UK "Under offer" / "Sold STC", US "Pending", TR "opsiyonlu").
 * - `sold`: sale completed (sale listings only).
 * - `let`: rental agreed (rental listings only).
 */
export const LISTING_STATUSES = ['available', 'under_offer', 'sold', 'let'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Furnishing of a rental. Sale listings do not carry this field. */
export const FURNISHINGS = ['furnished', 'part_furnished', 'unfurnished'] as const;
export type Furnishing = (typeof FURNISHINGS)[number];

/** Floor area is stored in square metres; square feet are derived for display and filtering. */
export const AREA_UNITS = ['sqm', 'sqft'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];
export const SQFT_PER_SQM = 10.7639;

/**
 * Bedroom count. `0` means a studio. Filters treat `5` as "5+", so values
 * above 5 are valid and match the 5+ option.
 */
export type Bedrooms = number;

export interface Property {
  id: string;
  /** Generated, clearly fictional headline, e.g. "Bright 2-bedroom apartment in Chelsea". */
  title: string;
  /** Generated demo description built from the listing's own fields. */
  description: string;
  /** Remote photo URL. May fail to load; use `getFallbackImage` from `src/data/images.ts`. */
  image: string;
  imageAlt: string;
  /** Unformatted amount in `currency`. Meaning depends on `pricePeriod`. */
  price: number;
  currency: Currency;
  pricePeriod: PricePeriod;
  /** Street-level address line (fictional house numbers). */
  address: string;
  neighborhood: string;
  city: string;
  countryCode: CountryCode;
  type: PropertyType;
  bedrooms: Bedrooms;
  /** Full or shared bathrooms, at least 1. */
  bathrooms: number;
  /** Internal floor area in square metres. */
  areaSqm: number;
  /** Rentals only (`pricePeriod === 'monthly'`). */
  furnishing?: Furnishing;
  status: ListingStatus;
  lat: number;
  lng: number;
  /** ISO date (YYYY-MM-DD) the listing went live. Used for "newest" sorting. */
  listedAt: string;
  /** ISO date (YYYY-MM-DD) of the last change to the listing; equals `listedAt` if never updated. */
  updatedAt: string;
}
