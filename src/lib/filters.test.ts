import { describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import {
  DEFAULT_FILTERS,
  applyFilters,
  areaIn,
  bedroomsLabel,
  clearFilters,
  buildCityIndex,
  effectiveSort,
  getActiveChips,
  getPriceContext,
  matchesRange,
  normalizeText,
  sortProperties,
  statusesFor,
  updateFilters,
  type Filters,
} from './filters';

const CITY_INDEX = buildCityIndex(properties);
const f = (patch: Partial<Filters>): Filters => ({ ...DEFAULT_FILTERS, ...patch });

describe('applyFilters', () => {
  it('returns all 80 listings with default filters', () => {
    expect(applyFilters(properties, DEFAULT_FILTERS)).toHaveLength(80);
  });

  it('filters by country, city and sale/rent', () => {
    expect(applyFilters(properties, f({ country: 'TR' }))).toHaveLength(20);
    expect(applyFilters(properties, f({ city: 'London' })).every((p) => p.city === 'London')).toBe(true);
    const rentals = applyFilters(properties, f({ pricePeriod: 'monthly' }));
    expect(rentals.length).toBeGreaterThan(0);
    expect(rentals.every((p) => p.pricePeriod === 'monthly')).toBe(true);
  });

  it('filters by multiple property types and statuses', () => {
    const r = applyFilters(properties, f({ types: ['villa', 'townhouse'], statuses: ['under_offer'] }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => ['villa', 'townhouse'].includes(p.type) && p.status === 'under_offer')).toBe(true);
  });

  it('matches studio exactly and N+ as at least N', () => {
    // Studio = at most 0 bedrooms; "5+" = at least 5.
    expect(applyFilters(properties, f({ maxBedrooms: 0 })).every((p) => p.bedrooms === 0)).toBe(true);
    const fivePlus = applyFilters(properties, f({ minBedrooms: 5 }));
    expect(fivePlus.some((p) => p.bedrooms === 6)).toBe(true);
    expect(fivePlus.every((p) => p.bedrooms >= 5)).toBe(true);
    expect(matchesRange(0, 1, null)).toBe(false);
  });

  it('applies a price range inside one market and period', () => {
    const r = applyFilters(properties, f({ country: 'US', pricePeriod: 'total', minPrice: 1_000_000, maxPrice: 2_000_000 }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.currency === 'USD' && p.pricePeriod === 'total' && p.price >= 1_000_000 && p.price <= 2_000_000)).toBe(true);
  });

  it('ignores price bounds without a single market and period, so currencies never mix', () => {
    expect(applyFilters(properties, f({ minPrice: 1_000_000 }))).toHaveLength(80);
    expect(applyFilters(properties, f({ country: 'US', minPrice: 1_000_000 }))).toHaveLength(52);
  });

  it('searches location text without case or accents', () => {
    const r = applyFilters(properties, f({ query: 'uskudar' }));
    expect(r.map((p) => p.neighborhood)).toEqual(['Üsküdar']);
    expect(applyFilters(properties, f({ query: 'KADIKÖY' }))).toHaveLength(1);
    expect(applyFilters(properties, f({ query: 'united kingdom' }))).toHaveLength(8);
    expect(normalizeText('  İzmir ')).toBe('izmir');
  });
});

describe('sortProperties', () => {
  it('sorts newest first by default', () => {
    const r = sortProperties(properties, 'newest');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].listedAt >= r[i].listedAt).toBe(true);
  });

  it('sorts by price within one market', () => {
    const us = applyFilters(properties, f({ country: 'US', pricePeriod: 'monthly' }));
    const asc = sortProperties(us, 'price-asc').map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortProperties(us, 'price-desc').map((p) => p.price);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('never interleaves currencies or periods when price-sorting a mixed list', () => {
    const r = sortProperties(properties, 'price-asc');
    const groups = r.map((p) => `${p.currency}:${p.pricePeriod}`);
    const seen = new Set<string>();
    groups.forEach((g, i) => {
      if (i > 0 && g !== groups[i - 1]) expect(seen.has(g)).toBe(false);
      seen.add(g);
    });
  });

  it('falls back to newest when price sorting has no market context', () => {
    expect(effectiveSort('price-asc', DEFAULT_FILTERS)).toBe('newest');
    expect(effectiveSort('price-asc', f({ country: 'GB', pricePeriod: 'total' }))).toBe('price-asc');
  });
});

describe('updateFilters', () => {
  it('picks the country when a city is chosen', () => {
    expect(updateFilters(DEFAULT_FILTERS, { city: 'Izmir' }, CITY_INDEX).country).toBe('TR');
  });

  it('clears the city when all countries are chosen (regression)', () => {
    const london = updateFilters(DEFAULT_FILTERS, { city: 'London' }, CITY_INDEX);
    expect(london).toMatchObject({ country: 'GB', city: 'London' });
    expect(updateFilters(london, { country: 'all' }, CITY_INDEX)).toMatchObject({ country: 'all', city: 'all' });
    expect(applyFilters(properties, updateFilters(london, { country: 'all' }, CITY_INDEX))).toHaveLength(80);
  });

  it('drops a city from another country when the country changes', () => {
    const start = f({ country: 'TR', city: 'Ankara' });
    expect(updateFilters(start, { country: 'US' }, CITY_INDEX).city).toBe('all');
  });

  it('clears the price range when the market or sale/rent context changes', () => {
    const start = f({ country: 'US', pricePeriod: 'total', minPrice: 500_000, maxPrice: 1_000_000 });
    expect(updateFilters(start, { country: 'GB' }, CITY_INDEX)).toMatchObject({ minPrice: null, maxPrice: null });
    expect(updateFilters(start, { pricePeriod: 'monthly' }, CITY_INDEX)).toMatchObject({ minPrice: null, maxPrice: null });
    expect(updateFilters(start, { types: ['house'] }, CITY_INDEX)).toMatchObject({ minPrice: 500_000, maxPrice: 1_000_000 });
  });

  it('keeps the edited bound when min and max cross', () => {
    const start = f({ country: 'US', pricePeriod: 'total', minPrice: 500_000, maxPrice: 1_000_000 });
    expect(updateFilters(start, { minPrice: 2_000_000 }, CITY_INDEX)).toMatchObject({ minPrice: 2_000_000, maxPrice: null });
  });

  it('drops statuses that do not fit sale or rent', () => {
    const start = f({ statuses: ['sold', 'let', 'available'] });
    expect(updateFilters(start, { pricePeriod: 'total' }, CITY_INDEX).statuses).toEqual(['sold', 'available']);
    expect(statusesFor('monthly')).not.toContain('sold');
  });
});

describe('getPriceContext and chips', () => {
  it('requires one country and one sale/rent choice', () => {
    expect(getPriceContext(DEFAULT_FILTERS)).toBeNull();
    expect(getPriceContext(f({ country: 'TR' }))).toBeNull();
    expect(getPriceContext(f({ country: 'TR', pricePeriod: 'monthly' }))).toEqual({ currency: 'TRY', pricePeriod: 'monthly' });
  });

  it('builds one removable chip per active filter', () => {
    const filters = f({ country: 'GB', pricePeriod: 'monthly', maxPrice: 2_000, types: ['apartment'], maxBedrooms: 0 });
    const chips = getActiveChips(filters);
    expect(chips.map((c) => c.label)).toEqual(['United Kingdom', 'For rent', 'Up to £2,000/mo', 'Apartment', 'Studio']);
    const cleared = chips.reduce((acc, c) => updateFilters(acc, c.remove, CITY_INDEX), filters);
    expect(cleared).toEqual(DEFAULT_FILTERS);
  });
});

describe('extended filters', () => {
  it('combines market, sale/rent, price, type, bedroom, bathroom, area and status filters', () => {
    const filters = f({
      country: 'US',
      pricePeriod: 'total',
      minPrice: 500_000,
      maxPrice: 3_000_000,
      types: ['house', 'apartment'],
      minBedrooms: 2,
      maxBedrooms: 4,
      minBathrooms: 2,
      minArea: 75,
      statuses: ['available', 'under_offer'],
    });
    const r = applyFilters(properties, filters);
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) {
      expect(p.countryCode).toBe('US');
      expect(p.pricePeriod).toBe('total');
      expect(p.price).toBeGreaterThanOrEqual(500_000);
      expect(p.price).toBeLessThanOrEqual(3_000_000);
      expect(['house', 'apartment']).toContain(p.type);
      expect(p.bedrooms).toBeGreaterThanOrEqual(2);
      expect(p.bedrooms).toBeLessThanOrEqual(4);
      expect(p.bathrooms).toBeGreaterThanOrEqual(2);
      expect(p.areaSqm).toBeGreaterThanOrEqual(75);
      expect(['available', 'under_offer']).toContain(p.status);
    }
    // Every listing left out fails at least one condition.
    const ids = new Set(r.map((p) => p.id));
    const brute = properties.filter(
      (p) =>
        p.countryCode === 'US' && p.pricePeriod === 'total' && p.price >= 500_000 && p.price <= 3_000_000 &&
        ['house', 'apartment'].includes(p.type) && p.bedrooms >= 2 && p.bedrooms <= 4 && p.bathrooms >= 2 &&
        p.areaSqm >= 75 && ['available', 'under_offer'].includes(p.status),
    );
    expect(brute.map((p) => p.id).sort()).toEqual([...ids].sort());
  });

  it('applies bedroom and bathroom ranges inclusively', () => {
    const r = applyFilters(properties, f({ minBedrooms: 2, maxBedrooms: 2, maxBathrooms: 1 }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.bedrooms === 2 && p.bathrooms === 1)).toBe(true);
  });

  it('filters area in square metres or square feet', () => {
    const sqm = applyFilters(properties, f({ areaUnit: 'sqm', minArea: 100, maxArea: 150 }));
    expect(sqm.every((p) => p.areaSqm >= 100 && p.areaSqm <= 150)).toBe(true);
    const sqft = applyFilters(properties, f({ areaUnit: 'sqft', minArea: 1_000, maxArea: 1_500 }));
    expect(sqft.length).toBeGreaterThan(0);
    expect(sqft.every((p) => areaIn(p, 'sqft') >= 1_000 && areaIn(p, 'sqft') <= 1_500)).toBe(true);
    expect(areaIn({ areaSqm: 100 }, 'sqft')).toBe(1076);
  });

  it('clears the area range when the unit changes', () => {
    const start = f({ areaUnit: 'sqm', minArea: 50, maxArea: 100 });
    expect(updateFilters(start, { areaUnit: 'sqft' }, CITY_INDEX)).toMatchObject({ areaUnit: 'sqft', minArea: null, maxArea: null });
  });

  it('filters furnishing only for rentals and clears it outside Rent', () => {
    const rent = f({ pricePeriod: 'monthly', furnishing: ['furnished'] });
    const r = applyFilters(properties, rent);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.pricePeriod === 'monthly' && p.furnishing === 'furnished')).toBe(true);
    expect(updateFilters(rent, { pricePeriod: 'total' }, CITY_INDEX).furnishing).toEqual([]);
    // Defensive: a stray furnishing value never filters sale listings.
    expect(applyFilters(properties, f({ furnishing: ['furnished'] }))).toHaveLength(80);
  });

  it('keeps the edited bound when bedroom or area ranges cross', () => {
    const start = f({ minBedrooms: 2, maxBedrooms: 3 });
    expect(updateFilters(start, { maxBedrooms: 1 }, CITY_INDEX)).toMatchObject({ minBedrooms: null, maxBedrooms: 1 });
    expect(updateFilters(f({ minArea: 50, maxArea: 75 }), { minArea: 100 }, CITY_INDEX)).toMatchObject({ minArea: 100, maxArea: null });
  });
});

describe('price filters per currency and period', () => {
  it('uses TRY monthly rent amounts for Turkish rentals only', () => {
    const r = applyFilters(properties, f({ country: 'TR', pricePeriod: 'monthly', minPrice: 25_000, maxPrice: 40_000 }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.currency === 'TRY' && p.pricePeriod === 'monthly' && p.price >= 25_000 && p.price <= 40_000)).toBe(true);
  });

  it('uses GBP totals for UK sales and never includes rentals', () => {
    const r = applyFilters(properties, f({ country: 'GB', pricePeriod: 'total', maxPrice: 550_000 }));
    expect(r.map((p) => p.id).sort()).toEqual(['gb-bhm-02', 'gb-man-02']);
  });

  it('a USD rent bound never filters TRY or GBP listings by raw number', () => {
    const usRent = updateFilters(DEFAULT_FILTERS, { country: 'US', pricePeriod: 'monthly', maxPrice: 3_000 }, CITY_INDEX);
    const switched = updateFilters(usRent, { country: 'TR' }, CITY_INDEX);
    expect(switched.maxPrice).toBeNull();
    expect(applyFilters(properties, switched).every((p) => p.currency === 'TRY')).toBe(true);
  });
});

describe('chips and clear all', () => {
  const busy = f({
    query: 'park',
    country: 'US',
    city: 'New York',
    pricePeriod: 'monthly',
    maxPrice: 5_000,
    types: ['apartment', 'house'],
    minBedrooms: 1,
    maxBedrooms: 3,
    minBathrooms: 1,
    areaUnit: 'sqft',
    minArea: 500,
    furnishing: ['furnished', 'unfurnished'],
    statuses: ['available'],
  });

  it('labels every active filter', () => {
    expect(getActiveChips(busy).map((c) => c.label)).toEqual([
      '“park”',
      'United States',
      'New York',
      'For rent',
      'Up to $5,000/mo',
      'Apartment',
      'House',
      '1–3 beds',
      '1+ baths',
      'From 500 sq ft',
      'Furnished',
      'Unfurnished',
      'Available',
    ]);
  });

  it('removes each chip on its own without touching the others', () => {
    const chips = getActiveChips(busy);
    for (const chip of chips) {
      const after = getActiveChips(updateFilters(busy, chip.remove, CITY_INDEX)).map((c) => c.key);
      const expected = chips
        .map((c) => c.key)
        // Removing the country also removes its city.
        .filter((k) => k !== chip.key && !(chip.key === 'country' && k === 'city'))
        // Without a single market the price range no longer applies.
        .filter((k) => !(chip.key === 'country' && k === 'price'))
        // Without Rent, furnishing and the price range no longer apply.
        .filter((k) => !(chip.key === 'period' && (k.startsWith('furnishing-') || k === 'price')));
      expect(after, `removing ${chip.key}`).toEqual(expected);
    }
  });

  it('clear all resets every filter but keeps the area unit preference', () => {
    expect(clearFilters(busy)).toEqual({ ...DEFAULT_FILTERS, areaUnit: 'sqft' });
    expect(applyFilters(properties, clearFilters(busy))).toHaveLength(80);
  });

  it('labels bedroom ranges including studio and 5+', () => {
    expect(bedroomsLabel(null, 0)).toBe('Studio');
    expect(bedroomsLabel(5, null)).toBe('5+ beds');
    expect(bedroomsLabel(null, 2)).toBe('Up to 2 beds');
    expect(bedroomsLabel(2, 2)).toBe('2 beds');
  });
});

describe('empty results', () => {
  it('returns nothing for an impossible but valid combination', () => {
    expect(applyFilters(properties, f({ country: 'GB', types: ['villa'] }))).toEqual([]);
    expect(applyFilters(properties, f({ query: 'zzzz' }))).toEqual([]);
  });
});

describe('date and size sorting', () => {
  it('sorts by most recent update', () => {
    const r = sortProperties(properties, 'updated');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].updatedAt >= r[i].updatedAt).toBe(true);
  });

  it('sorts largest first', () => {
    const r = sortProperties(properties, 'area-desc');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].areaSqm >= r[i].areaSqm).toBe(true);
  });
});
