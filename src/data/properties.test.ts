import { describe, expect, it } from 'vitest';
import { properties } from './properties';
import { MARKETS, isPriceComparable } from './markets';
import { PHOTO_POOLS, getFallbackImage } from './images';
import {
  COUNTRY_CODES,
  EPC_RATINGS,
  LEASE_TENURES,
  LISTING_STATUSES,
  PRICE_PERIODS,
  PROPERTY_TYPES,
  TENURES,
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

describe('UK-specific fields', () => {
  it('gives every listing an EPC rating from A to G', () => {
    for (const p of properties) expect(EPC_RATINGS, p.id).toContain(p.epcRating);
    const seen = new Set(properties.map((p) => p.epcRating));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('marks every listing with a garden and parking boolean', () => {
    for (const p of properties) {
      expect(typeof p.hasGarden, p.id).toBe('boolean');
      expect(typeof p.hasParking, p.id).toBe('boolean');
    }
    expect(properties.some((p) => p.hasGarden)).toBe(true);
    expect(properties.some((p) => p.hasParking)).toBe(true);
  });

  it('attaches tenure and (optionally) newBuild to sale listings only', () => {
    for (const p of properties) {
      if (p.pricePeriod === 'total') {
        expect(p.tenure, p.id).toBeDefined();
        expect(TENURES, p.id).toContain(p.tenure!);
      } else {
        expect(p.tenure, p.id).toBeUndefined();
        expect(p.newBuild, p.id).toBeUndefined();
      }
    }
    expect(properties.some((p) => p.newBuild)).toBe(true);
  });

  it('attaches availableFrom and optional pet/bills flags to rentals only', () => {
    for (const p of properties) {
      if (p.pricePeriod === 'monthly') {
        expect(p.availableFrom, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(p.availableFrom, p.id).toBeUndefined();
        expect(p.petsAllowed, p.id).toBeUndefined();
        expect(p.includedBills, p.id).toBeUndefined();
      }
    }
    expect(properties.some((p) => p.petsAllowed)).toBe(true);
    expect(properties.some((p) => p.includedBills?.length)).toBe(true);
  });

  const RENT_ONLY = ['couplesWelcome', 'regularIncomeRequired', 'applicantsWelcome', 'availableFrom', 'petsAllowed', 'studentFriendly', 'sharersAccepted', 'hmoLicensed', 'shortLetsAccepted', 'depositWeeks', 'includedBills', 'homeOffice', 'stepFreeAccess', 'hasLift', 'accessibleBathroom'] as const;
  const SALE_ONLY = ['tenure', 'newBuild', 'offPlan', 'completionDate', 'chainFree', 'leaseYearsRemaining', 'serviceChargePerYear', 'groundRentPerYear', 'outdoorSpace', 'parking'] as const;

  it('keeps rent-only and sale-only fields in their own context', () => {
    for (const p of properties) {
      const wrong = p.pricePeriod === 'monthly' ? SALE_ONLY : RENT_ONLY;
      for (const key of wrong) expect(key in p, `${p.id} ${key}`).toBe(false);
    }
  });

  it('seeds a mix of yes, no and not-stated values for each optional fact', () => {
    const rentals = properties.filter((p) => p.pricePeriod === 'monthly');
    const sales = properties.filter((p) => p.pricePeriod === 'total');
    for (const key of ['petsAllowed', 'studentFriendly', 'sharersAccepted', 'shortLetsAccepted', 'homeOffice', 'stepFreeAccess', 'hasLift', 'accessibleBathroom'] as const) {
      expect(rentals.some((p) => p[key] === true), key).toBe(true);
      expect(rentals.some((p) => p[key] === false), key).toBe(true);
      expect(rentals.some((p) => !(key in p)), key).toBe(true);
    }
    expect(rentals.some((p) => p.hmoLicensed === true)).toBe(true);
    expect(rentals.some((p) => p.depositWeeks === 0)).toBe(true);
    expect(rentals.some((p) => p.includedBills?.length === 0)).toBe(true);
    expect(rentals.some((p) => !('includedBills' in p))).toBe(true);
    expect(sales.some((p) => p.chainFree === true) && sales.some((p) => p.chainFree === false)).toBe(true);
    expect(sales.some((p) => p.groundRentPerYear === 0) && sales.some((p) => (p.groundRentPerYear ?? 0) > 0)).toBe(true);
  });

  it('keeps detail fields consistent with the core listing fields', () => {
    for (const p of properties) {
      // HMO licences only appear on 3+ bedroom homes let to sharers.
      if (p.hmoLicensed) expect(p.sharersAccepted && p.bedrooms >= 3, p.id).toBe(true);
      // Sharers need at least two bedrooms.
      if (p.sharersAccepted) expect(p.bedrooms, p.id).toBeGreaterThanOrEqual(2);
      // Deposit caps: England 5 weeks under £50k/yr rent (6 above); Scotland two months.
      if (p.depositWeeks !== undefined) {
        const cap = p.nation === 'scotland' ? (52 / 12) * 2 : p.price * 12 < 50_000 ? 5 : 6;
        expect(p.depositWeeks, p.id).toBeLessThanOrEqual(cap);
      }
      // Lease costs only exist on English/Welsh leases.
      if (!(p.tenure && LEASE_TENURES.includes(p.tenure))) {
        expect(p.leaseYearsRemaining ?? p.serviceChargePerYear ?? p.groundRentPerYear, p.id).toBeUndefined();
      }
      if (p.outdoorSpace) expect(p.outdoorSpace.some((x) => x !== 'balcony'), p.id).toBe(p.hasGarden);
      if (p.parking) expect(p.parking.some((x) => x !== 'permit'), p.id).toBe(p.hasParking);
      if (p.offPlan !== undefined || p.completionDate) expect(p.newBuild, p.id).toBe(true);
      if (p.offPlan === true) expect(p.completionDate! > '2026-10-09', p.id).toBe(true);
      if (p.offPlan === false) expect(p.completionDate! <= p.listedAt, p.id).toBe(true);
      // New leases since 2022 carry no ground rent.
      if (p.newBuild && p.groundRentPerYear !== undefined) expect(p.groundRentPerYear, p.id).toBe(0);
    }
  });

  it('uses Scotland-appropriate tenure and English tenure by property type', () => {
    for (const p of properties.filter((p) => p.pricePeriod === 'total')) {
      if (p.nation === 'scotland') expect(p.tenure, p.id).toBe('outright');
      else {
        expect(p.tenure, p.id).not.toBe('outright');
        if (p.type !== 'apartment') expect(p.tenure, p.id).toBe('freehold');
      }
    }
    expect(properties.filter((p) => p.city === 'Edinburgh').every((p) => p.nation === 'scotland')).toBe(true);
    expect(properties.filter((p) => p.city !== 'Edinburgh').every((p) => p.nation === 'england')).toBe(true);
  });

  it('keeps suitability terms on rentals only, coherent with the listing', () => {
    for (const p of properties) {
      if (p.pricePeriod === 'total') {
        expect(p.couplesWelcome ?? p.regularIncomeRequired ?? p.applicantsWelcome, p.id).toBeUndefined();
      }
      // Student houses are let room by room to students with a guarantor.
      if (p.hmoLicensed && p.studentFriendly) {
        expect(p.couplesWelcome, p.id).toBe(false);
        expect(p.regularIncomeRequired, p.id).toBe(false);
      }
    }
  });

  it('keeps student houses coherent', () => {
    for (const p of properties.filter((p) => p.hmoLicensed)) {
      expect(p.pricePeriod, p.id).toBe('monthly');
      expect(p.furnishing, p.id).toBe('furnished');
    }
  });

  it('prices cities in a plausible relative order', () => {
    const median = (city: string, period: 'total' | 'monthly') => {
      const xs = properties.filter((p) => p.city === city && p.pricePeriod === period).map((p) => p.price).sort((a, b) => a - b);
      return xs[Math.floor(xs.length / 2)];
    };
    for (const city of ['Manchester', 'Birmingham', 'Bristol', 'Edinburgh']) {
      expect(median('London', 'total')).toBeGreaterThan(median(city, 'total'));
      expect(median('London', 'monthly')).toBeGreaterThan(median(city, 'monthly'));
    }
    for (const p of properties) {
      if (p.city !== 'London') {
        // No multi-million regional homes and no £3k+ regional rents in this dataset.
        if (p.pricePeriod === 'total') expect(p.price, p.id).toBeLessThan(1_000_000);
        else expect(p.price, p.id).toBeLessThan(3_000);
      }
      if (p.pricePeriod === 'total') expect(p.price, p.id).toBeGreaterThanOrEqual(150_000);
      else expect(p.price, p.id).toBeGreaterThanOrEqual(700);
    }
  });
});
