import type { CountryCode, Currency, PricePeriod, Property } from '../types/property';

export interface Market {
  countryCode: CountryCode;
  name: string;
  currency: Currency;
  /** BCP 47 locale for number/currency formatting in this market. */
  locale: string;
}

/**
 * One market per country, one currency per market. A price range filter must
 * always run inside a single market so it never compares different currencies.
 * There is deliberately no exchange-rate table.
 */
export const MARKETS: Record<CountryCode, Market> = {
  GB: { countryCode: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
};

/**
 * Preset min/max price options per currency and price period. Ranges only
 * apply inside one sale/rent context.
 */
export const PRICE_STEPS: Record<Currency, Record<PricePeriod, readonly number[]>> = {
  GBP: {
    total: [200_000, 300_000, 400_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000],
    monthly: [1_000, 1_250, 1_500, 2_000, 2_500, 3_000, 4_000, 5_000],
  },
};

/** True when two listings' prices can be compared directly. */
export function isPriceComparable(a: Property, b: Property): boolean {
  return a.currency === b.currency && a.pricePeriod === b.pricePeriod;
}
