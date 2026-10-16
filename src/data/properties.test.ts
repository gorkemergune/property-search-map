import { describe, expect, it } from 'vitest';
import { properties } from './properties';
import { MARKETS, isPriceComparable } from './markets';
import { PHOTO_POOLS, getFallbackImage } from './images';
import {
  COUNTRY_CODES,
  LISTING_STATUSES,
  PRICE_PERIODS,
  PROPERTY_TYPES,
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
const CITY_CENTERS: Record<string, { lat: number; lng: number; radiusKm: number }> = {
  London: { lat: 51.5072, lng: -0.1276, radiusKm: 20 },
  Manchester: { lat: 53.4808, lng: -2.2426, radiusKm: 15 },
  Birmingham: { lat: 52.4862, lng: -1.8904, radiusKm: 15 },
  Bristol: { lat: 51.4545, lng: -2.5879, radiusKm: 15 },
  Edinburgh: { lat: 55.9533, lng: -3.1883, radiusKm: 15 },
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
  GBP: { total: [150_000, 5_000_000], monthly: [800, 8_000] },
};

describe('property dataset', () => {
  it('has exactly 200 listings', () => {
    expect(properties).toHaveLength(200);
  });

  it('is a UK-only dataset', () => {
    expect(countBy((p) => p.countryCode)).toEqual({ GB: 200 });
  });

  it('clusters listings across the five expected UK cities', () => {
    expect(countBy((p) => p.city)).toEqual({
      London: 120,
      Manchester: 25,
      Birmingham: 20,
      Bristol: 20,
      Edinburgh: 15,
    });
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

  it('places every listing within its city radius', () => {
    for (const p of properties) {
      const center = CITY_CENTERS[p.city];
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

  it('has both sale and rent listings', () => {
    const periods = new Set(properties.map((p) => p.pricePeriod));
    expect(periods).toEqual(new Set(PRICE_PERIODS));
  });

  it('only marks sale listings as sold and rentals as let', () => {
    for (const p of properties) {
      if (p.status === 'sold') expect(p.pricePeriod, p.id).toBe('total');
      if (p.status === 'let') expect(p.pricePeriod, p.id).toBe('monthly');
    }
  });

  it('has varied bedroom counts including studios and 4+', () => {
    for (const p of properties) {
      expect(Number.isInteger(p.bedrooms) && p.bedrooms >= 0, p.id).toBe(true);
    }
    const bedrooms = new Set(properties.map((p) => p.bedrooms));
    expect(bedrooms.size).toBeGreaterThanOrEqual(5);
    expect(properties.some((p) => p.bedrooms === 0)).toBe(true);
    expect(properties.filter((p) => p.bedrooms >= 4).length).toBeGreaterThanOrEqual(10);
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
  const find = (period: PricePeriod) => properties.find((p) => p.pricePeriod === period)!;

  it('allows same currency and same price period', () => {
    const sales = properties.filter((p) => p.pricePeriod === 'total');
    expect(isPriceComparable(sales[0], sales[1])).toBe(true);
  });

  it('rejects sale vs rent in the same currency', () => {
    expect(isPriceComparable(find('total'), find('monthly'))).toBe(false);
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
      expect(p.description, p.id).not.toMatch(/m²|sq ft|\d+ ?m\b/);
    }
  });
});

describe('fictional addresses and approximate locations', () => {
  const FICTIONAL_STREETS = /(Sample Street|Example Avenue|Placeholder Lane|Demo Boulevard|Mockup Place|Example Road|Sample Mews|Placeholder Row|Demo Lane)/;

  it('uses only clearly fictional street names', () => {
    for (const p of properties) expect(p.address, p.id).toMatch(FICTIONAL_STREETS);
  });

  it('does not reuse an address within a city', () => {
    const keys = properties.map((p) => `${p.city}|${p.address}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('does not include real postcodes at the end of an address', () => {
    for (const p of properties) {
      expect(p.address, p.id).not.toMatch(/\b[A-Z]{1,2}\d{1,2}\b$/);
    }
  });
});
