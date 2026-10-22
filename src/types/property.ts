/**
 * Shared listing model for the UK market.
 *
 * Prices are stored as plain numbers in GBP. Country and currency are kept as
 * named constants rather than string literals so the data model stays open to
 * adding more markets later without renaming fields.
 */

export const COUNTRY_CODES = ['GB'] as const;
/** ISO 3166-1 alpha-2 country code. */
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const CURRENCIES = ['GBP'] as const;
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
 * Availability of a listing.
 * - `available`: on the market.
 * - `under_offer`: offer accepted, deal not completed (UK "Under offer" / "Sold STC").
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
 * UK Energy Performance Certificate rating. A is most efficient, G is least.
 * Required on UK property listings since 2008.
 */
export const EPC_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type EpcRating = (typeof EPC_RATINGS)[number];

/** Nation within the UK. Tenure, deposit and licensing rules differ between them. */
export const NATIONS = ['england', 'wales', 'scotland', 'northern_ireland'] as const;
export type Nation = (typeof NATIONS)[number];

/**
 * UK ownership structure. In England and Wales houses are usually freehold and
 * flats leasehold; "share of freehold" is a common hybrid for mansion blocks.
 * Scotland abolished residential leasehold, so Scottish homes are owned
 * outright (heritable title) and never carry lease length or ground rent.
 */
export const TENURES = ['freehold', 'leasehold', 'share_of_freehold', 'outright'] as const;
/** Tenures that come with a lease, and so with lease length, service charge and ground rent. */
export const LEASE_TENURES: readonly Tenure[] = ['leasehold', 'share_of_freehold'];
export type Tenure = (typeof TENURES)[number];

/** Utilities a rent can include. "All bills" is never a value: each bill is recorded on its own. */
export const BILLS = ['electricity', 'gas', 'water', 'internet'] as const;
export type Bill = (typeof BILLS)[number];

/** Kind of outdoor space on a sale listing. A balcony alone does not count as `hasGarden`. */
export const OUTDOOR_SPACES = ['private_garden', 'shared_garden', 'balcony', 'terrace'] as const;
export type OutdoorSpace = (typeof OUTDOOR_SPACES)[number];

/** Kind of parking on a sale listing. Permit/street parking alone does not count as `hasParking`. */
export const PARKING_TYPES = ['driveway', 'garage', 'allocated', 'permit'] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

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
  nation: Nation;
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
  /** UK Energy Performance Certificate rating (A best, G worst). */
  epcRating: EpcRating;
  /** Outdoor space (private garden, patio or roof terrace). */
  hasGarden: boolean;
  /** Dedicated parking (off-street, driveway or garage). */
  hasParking: boolean;
  /**
   * Optional facts below follow one rule: `undefined` means the listing does not
   * say, which is different from `false`, `0` or an empty list. Filters and the
   * listing summary never treat a missing value as a yes or a no.
   */

  // --- Rentals only (`pricePeriod === 'monthly'`) ---
  /** ISO date (YYYY-MM-DD) tenancy can start. */
  availableFrom?: string;
  /** `true` pets accepted, `false` no pets, `undefined` policy not stated. */
  petsAllowed?: boolean;
  /** Student tenants accepted / student-focused home. */
  studentFriendly?: boolean;
  /** Let to sharers (unrelated housemates on one tenancy). */
  sharersAccepted?: boolean;
  /** Holds a council HMO licence. Only `true` when the listing says so. */
  hmoLicensed?: boolean;
  /** Short lets (under 6 months) considered. */
  shortLetsAccepted?: boolean;
  /**
   * Tenancy deposit in weeks of rent; `0` = no deposit. England caps it at 5 weeks
   * below £50k/yr rent (6 above); Scotland at two months' rent (~8.7 weeks).
   */
  depositWeeks?: number;
  /** Bills included in the rent; `[]` = none included. */
  includedBills?: Bill[];
  /** Dedicated workspace or home office room. */
  homeOffice?: boolean;
  /** Step-free route from the street to the front door. */
  stepFreeAccess?: boolean;
  /** Building has a lift. */
  hasLift?: boolean;
  /** Wet room or adapted bathroom. */
  accessibleBathroom?: boolean;

  // --- Sale listings only (`pricePeriod === 'total'`) ---
  /** Freehold / leasehold / share of freehold. */
  tenure?: Tenure;
  /** Newly built (within last 2 years) or off-plan. */
  newBuild?: boolean;
  /** New builds only: `true` not yet built, `false` completed. */
  offPlan?: boolean;
  /** New builds only: ISO date of completion (expected when off-plan). */
  completionDate?: string;
  /** Seller is not buying onward and there is no chain. */
  chainFree?: boolean;
  /** `LEASE_TENURES` only (never in Scotland): years left on the lease. */
  leaseYearsRemaining?: number;
  /** `LEASE_TENURES` only: annual service charge in `currency`. */
  serviceChargePerYear?: number;
  /** `LEASE_TENURES` only: annual ground rent in `currency`; `0` = none (peppercorn). */
  groundRentPerYear?: number;
  /** Types of outdoor space; `[]` = none. */
  outdoorSpace?: OutdoorSpace[];
  /** Types of parking; `[]` = none. */
  parking?: ParkingType[];
}
