import { describe, expect, it } from 'vitest';
import { properties } from './properties';
import { MARKETS, isPriceComparable } from './markets';
import { PHOTO_POOLS, getFallbackImage } from './images';
import {
  COUNTRY_CODES,
  LISTING_STATUSES,
  PRICE_PERIODS,
  PROPERTY_TYPES,
  type CountryCode,
  type Currency,
  type PricePeriod,
} from '../types/property';

const countBy = <K extends string>(keyOf: (p: (typeof properties)[number]) => K) =>
  properties.reduce<Record<string, number>>((acc, p) => {
    const k = keyOf(p);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

/** City centers; every listing must sit within `radiusKm` of its city. */
const CITY_CENTERS: Record<string, { country: CountryCode; lat: number; lng: number; radiusKm: number }> = {
  'New York': { country: 'US', lat: 40.7128, lng: -74.006, radiusKm: 25 },
  'Los Angeles': { country: 'US', lat: 34.0522, lng: -118.2437, radiusKm: 30 },
  Miami: { country: 'US', lat: 25.7617, lng: -80.1918, radiusKm: 20 },
  'San Francisco': { country: 'US', lat: 37.7749, lng: -122.4194, radiusKm: 12 },
  Chicago: { country: 'US', lat: 41.8781, lng: -87.6298, radiusKm: 20 },
  Austin: { country: 'US', lat: 30.2672, lng: -97.7431, radiusKm: 25 },
  Istanbul: { country: 'TR', lat: 41.0082, lng: 28.9784, radiusKm: 40 },
  Ankara: { country: 'TR', lat: 39.9334, lng: 32.8597, radiusKm: 25 },
  Izmir: { country: 'TR', lat: 38.4237, lng: 27.1428, radiusKm: 45 },
  Antalya: { country: 'TR', lat: 36.8969, lng: 30.7133, radiusKm: 25 },
  London: { country: 'GB', lat: 51.5072, lng: -0.1276, radiusKm: 20 },
  Manchester: { country: 'GB', lat: 53.4808, lng: -2.2426, radiusKm: 15 },
  Birmingham: { country: 'GB', lat: 52.4862, lng: -1.8904, radiusKm: 15 },
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Loose plausibility bands per market, to catch typos like a missing zero. */
const PRICE_BANDS: Record<Currency, Record<PricePeriod, [number, number]>> = {
  USD: { total: [200_000, 15_000_000], monthly: [1_000, 15_000] },
  TRY: { total: [2_000_000, 150_000_000], monthly: [10_000, 150_000] },
  GBP: { total: [150_000, 5_000_000], monthly: [800, 8_000] },
};

describe('property dataset', () => {
  it('has exactly 80 listings', () => {
    expect(properties).toHaveLength(80);
  });

  it('has the 52 / 20 / 8 country split', () => {
    expect(countBy((p) => p.countryCode)).toEqual({ US: 52, TR: 20, GB: 8 });
  });

  it('covers every required city and no others', () => {
    expect(new Set(properties.map((p) => p.city))).toEqual(new Set(Object.keys(CITY_CENTERS)));
  });

  it('has unique ids', () => {
    expect(new Set(properties.map((p) => p.id)).size).toBe(properties.length);
  });

  it('uses only the shared enums', () => {
    for (const p of properties) {
      expect(COUNTRY_CODES).toContain(p.countryCode);
      expect(PROPERTY_TYPES).toContain(p.type);
      expect(LISTING_STATUSES).toContain(p.status);
      expect(PRICE_PERIODS).toContain(p.pricePeriod);
    }
  });

  it('uses the market currency of each country', () => {
    for (const p of properties) {
      expect(p.currency, p.id).toBe(MARKETS[p.countryCode].currency);
    }
  });

  it('places every listing in its own country and near its city', () => {
    for (const p of properties) {
      const center = CITY_CENTERS[p.city];
      expect(center.country, p.id).toBe(p.countryCode);
      expect(distanceKm(p.lat, p.lng, center.lat, center.lng), p.id).toBeLessThanOrEqual(center.radiusKm);
    }
  });

  it('keeps prices numeric, positive and inside plausible local bands', () => {
    for (const p of properties) {
      expect(Number.isInteger(p.price), p.id).toBe(true);
      const [min, max] = PRICE_BANDS[p.currency][p.pricePeriod];
      expect(p.price, p.id).toBeGreaterThanOrEqual(min);
      expect(p.price, p.id).toBeLessThanOrEqual(max);
    }
  });

  it('never repeats a price', () => {
    expect(new Set(properties.map((p) => p.price)).size).toBe(properties.length);
  });

  it('has both sale and rent listings in every country', () => {
    for (const country of COUNTRY_CODES) {
      const periods = new Set(properties.filter((p) => p.countryCode === country).map((p) => p.pricePeriod));
      expect(periods, country).toEqual(new Set(PRICE_PERIODS));
    }
  });

  it('only marks sale listings as sold and rentals as let', () => {
    for (const p of properties) {
      if (p.status === 'sold') expect(p.pricePeriod, p.id).toBe('total');
      if (p.status === 'let') expect(p.pricePeriod, p.id).toBe('monthly');
    }
  });

  it('has varied bedroom counts including studios and 5+', () => {
    for (const p of properties) {
      expect(Number.isInteger(p.bedrooms) && p.bedrooms >= 0, p.id).toBe(true);
    }
    const bedrooms = new Set(properties.map((p) => p.bedrooms));
    expect(bedrooms.size).toBeGreaterThanOrEqual(6);
    expect(properties.some((p) => p.bedrooms === 0)).toBe(true);
    expect(properties.filter((p) => p.bedrooms >= 5).length).toBeGreaterThanOrEqual(3);
  });

  it('only uses studios for apartments', () => {
    for (const p of properties.filter((p) => p.bedrooms === 0)) {
      expect(p.type, p.id).toBe('apartment');
    }
  });

  it('has valid listing dates that are not in the future', () => {
    for (const p of properties) {
      expect(p.listedAt, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(p.listedAt)), p.id).toBe(false);
      expect(p.listedAt <= '2026-10-09', p.id).toBe(true);
    }
  });

  it('uses photos from the approved pool for the listing type', () => {
    for (const p of properties) {
      expect(PHOTO_POOLS[p.type], p.id).toContain(p.image);
      expect(p.image.startsWith('https://images.unsplash.com/'), p.id).toBe(true);
      expect(p.imageAlt.length, p.id).toBeGreaterThan(0);
    }
  });
});

describe('image fallback', () => {
  it('returns an inline SVG for every property type', () => {
    for (const type of PROPERTY_TYPES) {
      const src = getFallbackImage(type);
      expect(src.startsWith('data:image/svg+xml,')).toBe(true);
      expect(decodeURIComponent(src)).toContain('<svg');
    }
  });
});

describe('isPriceComparable', () => {
  const find = (country: CountryCode, period: PricePeriod) =>
    properties.find((p) => p.countryCode === country && p.pricePeriod === period)!;

  it('allows same currency and same price period', () => {
    const sales = properties.filter((p) => p.countryCode === 'US' && p.pricePeriod === 'total');
    expect(isPriceComparable(sales[0], sales[1])).toBe(true);
  });

  it('rejects different currencies', () => {
    expect(isPriceComparable(find('US', 'total'), find('GB', 'total'))).toBe(false);
  });

  it('rejects sale vs rent in the same currency', () => {
    expect(isPriceComparable(find('TR', 'total'), find('TR', 'monthly'))).toBe(false);
  });
});

describe('extended listing fields', () => {
  it('has plausible bathrooms and floor area for the bedroom count', () => {
    for (const p of properties) {
      expect(Number.isInteger(p.bathrooms) && p.bathrooms >= 1 && p.bathrooms <= p.bedrooms + 2, p.id).toBe(true);
      expect(Number.isInteger(p.areaSqm) && p.areaSqm >= 25 && p.areaSqm <= 750, p.id).toBe(true);
    }
    const studios = properties.filter((p) => p.bedrooms === 0);
    const bigHomes = properties.filter((p) => p.bedrooms >= 4);
    expect(Math.max(...studios.map((p) => p.areaSqm))).toBeLessThan(Math.min(...bigHomes.map((p) => p.areaSqm)));
  });

  it('has furnishing on every rental and on no sale listing', () => {
    for (const p of properties) {
      if (p.pricePeriod === 'monthly') expect(p.furnishing, p.id).toBeDefined();
      else expect(p.furnishing, p.id).toBeUndefined();
    }
    const kinds = new Set(properties.map((p) => p.furnishing).filter(Boolean));
    expect(kinds.size).toBe(3);
  });

  it('has an update date between the listing date and today', () => {
    for (const p of properties) {
      expect(p.updatedAt >= p.listedAt, p.id).toBe(true);
      expect(p.updatedAt <= '2026-10-09', p.id).toBe(true);
    }
    expect(properties.some((p) => p.updatedAt !== p.listedAt)).toBe(true);
    expect(properties.some((p) => p.updatedAt === p.listedAt)).toBe(true);
  });

  it('has a title and a description that says it is demo data', () => {
    for (const p of properties) {
      expect(p.title, p.id).toContain(p.neighborhood);
      expect(p.description.startsWith('Demo listing'), p.id).toBe(true);
      // Floor area is left out of the stored text so it can be shown in the viewer's unit.
      expect(p.description, p.id).not.toMatch(/m²|sq ft|\d+ ?m\b/);
    }
  });
});

describe('fictional addresses and approximate locations', () => {
  const FICTIONAL_STREETS = /(Sample Street|Example Avenue|Placeholder Lane|Demo Boulevard|Mockup Place|Örnek Sokak|Deneme Caddesi|Demo Sokak|Taslak Sokak|Example Road|Sample Mews|Placeholder Row|Demo Lane)/;

  it('uses only clearly fictional street names', () => {
    for (const p of properties) expect(p.address, p.id).toMatch(FICTIONAL_STREETS);
  });

  it('does not reuse an address within a city', () => {
    const keys = properties.map((p) => `${p.city}|${p.address}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('formats addresses per market', () => {
    for (const p of properties) {
      if (p.countryCode === 'TR') expect(p.address, p.id).toMatch(/ No: \d+/);
      if (p.countryCode === 'US') expect(p.address, p.id).toMatch(/^\d+ /);
      if (p.countryCode === 'GB') expect(p.address, p.id).not.toMatch(/\b[A-Z]{1,2}\d{1,2}\b$/); // no real postcodes
    }
  });

  it('keeps the old real street names out of the data', () => {
    const json = JSON.stringify(properties);
    for (const street of ['Willoughby', 'Brickell Bay Dr', 'Canonbury Road', 'Moda Cd', 'Tunalı Hilmi', 'Wilshire Blvd']) {
      expect(json).not.toContain(street);
    }
  });
});
