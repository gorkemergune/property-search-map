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
  presetsFor,
  togglePreset,
  sortProperties,
  statusesFor,
  updateFilters,
  type Filters,
} from './filters';

const CITY_INDEX = buildCityIndex(properties);
const f = (patch: Partial<Filters>): Filters => ({ ...DEFAULT_FILTERS, ...patch });

describe('applyFilters', () => {
  it('returns all 200 listings with default filters', () => {
    expect(applyFilters(properties, DEFAULT_FILTERS)).toHaveLength(300);
  });

  it('filters by city and sale/rent', () => {
    expect(applyFilters(properties, f({ city: 'London' })).every((p) => p.city === 'London')).toBe(true);
    expect(applyFilters(properties, f({ city: 'Manchester' }))).toHaveLength(25);
    const rentals = applyFilters(properties, f({ pricePeriod: 'monthly' }));
    expect(rentals.length).toBeGreaterThan(0);
    expect(rentals.every((p) => p.pricePeriod === 'monthly')).toBe(true);
  });

  it('filters by multiple property types and statuses', () => {
    const r = applyFilters(properties, f({ types: ['villa', 'townhouse'], statuses: ['under_offer'] }));
    expect(r.every((p) => ['villa', 'townhouse'].includes(p.type) && p.status === 'under_offer')).toBe(true);
  });

  it('matches studio exactly and N+ as at least N', () => {
    expect(applyFilters(properties, f({ maxBedrooms: 0 })).every((p) => p.bedrooms === 0)).toBe(true);
    const fourPlus = applyFilters(properties, f({ minBedrooms: 4 }));
    expect(fourPlus.length).toBeGreaterThan(0);
    expect(fourPlus.every((p) => p.bedrooms >= 4)).toBe(true);
    expect(matchesRange(0, 1, null)).toBe(false);
  });

  it('applies a sale price range to sale listings', () => {
    const r = applyFilters(properties, f({ pricePeriod: 'total', minSalePrice: 500_000, maxSalePrice: 1_000_000 }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.pricePeriod === 'total' && p.price >= 500_000 && p.price <= 1_000_000)).toBe(true);
  });

  it('applies sale and rent ranges independently when the period is "all"', () => {
    const r = applyFilters(properties, f({ maxSalePrice: 300_000, maxMonthlyPrice: 2_000 }));
    for (const p of r) {
      if (p.pricePeriod === 'total') expect(p.price).toBeLessThanOrEqual(300_000);
      if (p.pricePeriod === 'monthly') expect(p.price).toBeLessThanOrEqual(2_000);
    }
    // Both sale and rent listings should remain.
    expect(r.some((p) => p.pricePeriod === 'total')).toBe(true);
    expect(r.some((p) => p.pricePeriod === 'monthly')).toBe(true);
  });

  it('searches location text without case or accents', () => {
    const r = applyFilters(properties, f({ query: 'shoreditch' }));
    expect(r.every((p) => p.neighborhood === 'Shoreditch')).toBe(true);
    expect(applyFilters(properties, f({ query: 'LONDON' })).length).toBe(120);
    expect(applyFilters(properties, f({ query: 'united kingdom' }))).toHaveLength(300);
    expect(normalizeText('  London ')).toBe('london');
  });
});

describe('sortProperties', () => {
  it('sorts newest first by default', () => {
    const r = sortProperties(properties, 'newest');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].listedAt >= r[i].listedAt).toBe(true);
  });

  it('sorts by price within one sale/rent context', () => {
    const rentals = applyFilters(properties, f({ pricePeriod: 'monthly' }));
    const asc = sortProperties(rentals, 'price-asc').map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortProperties(rentals, 'price-desc').map((p) => p.price);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('never interleaves periods when price-sorting a mixed list', () => {
    const r = sortProperties(properties, 'price-asc');
    const groups = r.map((p) => `${p.currency}:${p.pricePeriod}`);
    const seen = new Set<string>();
    groups.forEach((g, i) => {
      if (i > 0 && g !== groups[i - 1]) expect(seen.has(g)).toBe(false);
      seen.add(g);
    });
  });

  it('falls back to newest when price sorting has no sale/rent context', () => {
    expect(effectiveSort('price-asc', DEFAULT_FILTERS)).toBe('newest');
    expect(effectiveSort('price-asc', f({ pricePeriod: 'total' }))).toBe('price-asc');
  });
});

describe('updateFilters', () => {
  it('keeps country GB when a city is chosen', () => {
    expect(updateFilters(DEFAULT_FILTERS, { city: 'Bristol' }, CITY_INDEX)).toMatchObject({ country: 'GB', city: 'Bristol' });
  });

  it('clears the city when "all" is picked (regression)', () => {
    const london = updateFilters(DEFAULT_FILTERS, { city: 'London' }, CITY_INDEX);
    expect(london).toMatchObject({ country: 'GB', city: 'London' });
    expect(updateFilters(london, { city: 'all' }, CITY_INDEX)).toMatchObject({ city: 'all' });
    expect(applyFilters(properties, updateFilters(london, { city: 'all' }, CITY_INDEX))).toHaveLength(300);
  });

  it('keeps the sale range when switching to rent (ranges are independent per period)', () => {
    const start = f({ pricePeriod: 'total', minSalePrice: 500_000, maxSalePrice: 1_000_000 });
    expect(updateFilters(start, { pricePeriod: 'monthly' }, CITY_INDEX)).toMatchObject({
      minSalePrice: 500_000,
      maxSalePrice: 1_000_000,
    });
  });

  it('keeps the edited bound when min and max cross', () => {
    const start = f({ pricePeriod: 'total', minSalePrice: 500_000, maxSalePrice: 1_000_000 });
    expect(updateFilters(start, { minSalePrice: 2_000_000 }, CITY_INDEX)).toMatchObject({
      minSalePrice: 2_000_000,
      maxSalePrice: null,
    });
  });

  it('drops statuses that do not fit sale or rent', () => {
    const start = f({ statuses: ['sold', 'let', 'available'] });
    expect(updateFilters(start, { pricePeriod: 'total' }, CITY_INDEX).statuses).toEqual(['sold', 'available']);
    expect(statusesFor('monthly')).not.toContain('sold');
  });
});

describe('getPriceContext and chips', () => {
  it('requires a sale/rent choice (country is always GB)', () => {
    expect(getPriceContext(DEFAULT_FILTERS)).toBeNull();
    expect(getPriceContext(f({ pricePeriod: 'monthly' }))).toEqual({ currency: 'GBP', pricePeriod: 'monthly' });
  });

  it('builds one removable chip per active filter', () => {
    const filters = f({ pricePeriod: 'monthly', maxMonthlyPrice: 2_000, types: ['apartment'], maxBedrooms: 0 });
    const chips = getActiveChips(filters);
    expect(chips.map((c) => c.label)).toEqual(['For rent', 'Up to £2,000/mo', 'Apartment', 'Studio']);
    const cleared = chips.reduce((acc, c) => updateFilters(acc, c.remove, CITY_INDEX), filters);
    expect(cleared).toEqual(DEFAULT_FILTERS);
  });
});

describe('extended filters', () => {
  it('combines sale/rent, price, type, bedroom, bathroom, area and status filters', () => {
    const filters = f({
      pricePeriod: 'total',
      minSalePrice: 500_000,
      maxSalePrice: 3_000_000,
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
    expect(applyFilters(properties, f({ furnishing: ['furnished'] }))).toHaveLength(300);
  });

  it('keeps the edited bound when bedroom or area ranges cross', () => {
    const start = f({ minBedrooms: 2, maxBedrooms: 3 });
    expect(updateFilters(start, { maxBedrooms: 1 }, CITY_INDEX)).toMatchObject({ minBedrooms: null, maxBedrooms: 1 });
    expect(updateFilters(f({ minArea: 50, maxArea: 75 }), { minArea: 100 }, CITY_INDEX)).toMatchObject({ minArea: 100, maxArea: null });
  });
});

describe('chips and clear all', () => {
  const busy = f({
    query: 'park',
    city: 'London',
    pricePeriod: 'monthly',
    maxMonthlyPrice: 3_000,
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
      'London',
      'For rent',
      'Up to £3,000/mo',
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
        // Removing a filter drops its own chip.
        .filter((k) => k !== chip.key)
        // Removing the Rent period also drops furnishing (which only applies to rent).
        .filter((k) => !(chip.key === 'period' && k.startsWith('furnishing-')));
      expect(after, `removing ${chip.key}`).toEqual(expected);
    }
  });

  it('clear all resets every filter but keeps the area unit preference', () => {
    expect(clearFilters(busy)).toEqual({ ...DEFAULT_FILTERS, areaUnit: 'sqft' });
    expect(applyFilters(properties, clearFilters(busy))).toHaveLength(300);
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
    expect(applyFilters(properties, f({ city: 'Edinburgh', types: ['villa'] }))).toEqual([]);
    expect(applyFilters(properties, f({ query: 'zzzz' }))).toEqual([]);
  });
});

describe('price filters by period', () => {
  it('uses GBP monthly rent amounts', () => {
    const r = applyFilters(properties, f({ pricePeriod: 'monthly', minMonthlyPrice: 1_500, maxMonthlyPrice: 3_000 }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.currency === 'GBP' && p.pricePeriod === 'monthly' && p.price >= 1_500 && p.price <= 3_000)).toBe(true);
  });

  it('uses GBP totals for UK sales and never includes rentals', () => {
    const r = applyFilters(properties, f({ pricePeriod: 'total', maxSalePrice: 300_000 }));
    expect(r.every((p) => p.pricePeriod === 'total' && p.price <= 300_000)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
});

describe('UK must-have features', () => {
  it('filters by garden, parking and minimum EPC rating', () => {
    const garden = applyFilters(properties, f({ hasGarden: true }));
    expect(garden.length).toBeGreaterThan(0);
    expect(garden.every((p) => p.hasGarden)).toBe(true);

    const parking = applyFilters(properties, f({ hasParking: true }));
    expect(parking.every((p) => p.hasParking)).toBe(true);

    const epc = applyFilters(properties, f({ minEpcRating: 'C' }));
    expect(epc.every((p) => ['A', 'B', 'C'].includes(p.epcRating))).toBe(true);
  });

  it('applies tenure and new build only within the sale context', () => {
    const freehold = applyFilters(properties, f({ pricePeriod: 'total', tenure: ['freehold'] }));
    expect(freehold.every((p) => p.tenure === 'freehold')).toBe(true);

    const newBuild = applyFilters(properties, f({ pricePeriod: 'total', newBuildOnly: true }));
    expect(newBuild.every((p) => p.newBuild === true)).toBe(true);

    // Without the sale context, these filters are inert.
    expect(applyFilters(properties, f({ tenure: ['freehold'] }))).toHaveLength(300);
    expect(applyFilters(properties, f({ newBuildOnly: true }))).toHaveLength(300);
  });

  it('applies pets, bills and availableBy only within the rent context', () => {
    const pets = applyFilters(properties, f({ pricePeriod: 'monthly', petPolicy: 'allowed' }));
    expect(pets.every((p) => p.petsAllowed === true)).toBe(true);

    const bills = applyFilters(properties, f({ pricePeriod: 'monthly', includedBills: ['gas'] }));
    expect(bills.length).toBeGreaterThan(0);
    expect(bills.every((p) => p.includedBills?.includes('gas'))).toBe(true);

    const soon = applyFilters(properties, f({ pricePeriod: 'monthly', availableBy: '2026-10-20' }));
    expect(soon.every((p) => p.availableFrom && p.availableFrom <= '2026-10-20')).toBe(true);

    // Without the rent context, these filters are inert.
    expect(applyFilters(properties, f({ petPolicy: 'allowed' }))).toHaveLength(300);
    expect(applyFilters(properties, f({ availableBy: '2026-10-20' }))).toHaveLength(300);
  });

  it('clears sale-only or rent-only filters when the context flips', () => {
    const sale = f({ pricePeriod: 'total', tenure: ['freehold'], newBuildOnly: true });
    const flipped = updateFilters(sale, { pricePeriod: 'monthly' }, CITY_INDEX);
    expect(flipped).toMatchObject({ tenure: [], newBuildOnly: false });

    const rent = f({ pricePeriod: 'monthly', petPolicy: 'allowed', includedBills: ['gas'], availableBy: '2026-11-01' });
    const flipped2 = updateFilters(rent, { pricePeriod: 'total' }, CITY_INDEX);
    expect(flipped2).toMatchObject({ petPolicy: 'any', includedBills: [], availableBy: null });
  });
});

describe('UK rental filters', () => {
  const rent = (patch: Partial<Filters>) => applyFilters(properties, f({ pricePeriod: 'monthly', ...patch }));
  const rentals = rent({});

  it('treats an unstated pet policy as matching neither explicit policy', () => {
    const allowed = rent({ petPolicy: 'allowed' });
    const notAllowed = rent({ petPolicy: 'not_allowed' });
    const unknown = rentals.filter((p) => p.petsAllowed === undefined);
    expect(allowed.length).toBeGreaterThan(0);
    expect(notAllowed.length).toBeGreaterThan(0);
    expect(unknown.length).toBeGreaterThan(0);
    expect(notAllowed.every((p) => p.petsAllowed === false)).toBe(true);
    expect(allowed.length + notAllowed.length + unknown.length).toBe(rentals.length);
  });

  it.each(['studentFriendly', 'sharersAccepted', 'hmoLicensed', 'shortLetsAccepted', 'homeOffice', 'stepFreeAccess', 'hasLift', 'accessibleBathroom'] as const)(
    'keeps only listings that explicitly state %s',
    (key) => {
      const r = rent({ [key]: true });
      expect(r.length).toBeGreaterThan(0);
      expect(r.length).toBeLessThan(rentals.length);
      expect(r.every((p) => p[key] === true)).toBe(true);
    },
  );

  it('requires every selected bill and never reads unknown bills as included', () => {
    const r = rent({ includedBills: ['electricity', 'internet'] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.includedBills?.includes('electricity') && p.includedBills.includes('internet'))).toBe(true);
    // Internet-only listings exist, so "internet included" is not the same as "all bills included".
    const internet = rent({ includedBills: ['internet'] });
    expect(internet.some((p) => !p.includedBills!.includes('gas'))).toBe(true);
  });

  it('filters by maximum deposit, keeping "no deposit" distinct from unknown', () => {
    const none = rent({ maxDepositWeeks: 0 });
    expect(none.length).toBeGreaterThan(0);
    expect(none.every((p) => p.depositWeeks === 0)).toBe(true);
    const upTo4 = rent({ maxDepositWeeks: 4 });
    expect(upTo4.every((p) => p.depositWeeks !== undefined && p.depositWeeks <= 4)).toBe(true);
    expect(rent({ maxDepositWeeks: 5 }).length).toBeLessThan(rentals.length);
  });

  it('clears every rent-only choice when leaving Rent, and shows a chip for each', () => {
    const rentFilters = f({
      pricePeriod: 'monthly',
      petPolicy: 'not_allowed',
      sharersAccepted: true,
      hasLift: true,
      includedBills: ['water'],
      maxDepositWeeks: 5,
    });
    const keys = getActiveChips(rentFilters).map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining(['pets', 'sharersAccepted', 'hasLift', 'bill-water', 'deposit']));
    for (const chip of getActiveChips(rentFilters)) {
      const removed = updateFilters(rentFilters, chip.remove, CITY_INDEX);
      expect(getActiveChips(removed).some((c) => c.key === chip.key), chip.key).toBe(false);
    }
    for (const period of ['total', 'all'] as const) {
      const next = updateFilters(rentFilters, { pricePeriod: period }, CITY_INDEX);
      expect(next).toMatchObject({ petPolicy: 'any', sharersAccepted: false, hasLift: false, includedBills: [], maxDepositWeeks: null });
    }
  });
});

describe('UK sale filters', () => {
  const sale = (patch: Partial<Filters>) => applyFilters(properties, f({ pricePeriod: 'total', ...patch }));
  const sales = sale({});

  it('filters chain-free sales and ignores unknown chain status', () => {
    const r = sale({ chainFree: true });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.chainFree === true)).toBe(true);
    expect(sales.some((p) => p.chainFree === undefined)).toBe(true);
  });

  it('applies lease bounds to leaseholds only and drops leaseholds with unstated values', () => {
    const r = sale({ minLeaseYears: 99 });
    expect(r.some((p) => p.tenure === 'freehold')).toBe(true);
    for (const p of r.filter((p) => p.tenure === 'leasehold' || p.tenure === 'share_of_freehold')) expect(p.leaseYearsRemaining!).toBeGreaterThanOrEqual(99);
    expect(r.some((p) => p.tenure === 'leasehold')).toBe(true);
    // Scottish homes have no lease, so lease bounds do not remove them.
    expect(r.some((p) => p.tenure === 'outright')).toBe(true);
    expect(sales.some((p) => p.tenure === 'leasehold' && (p.leaseYearsRemaining ?? 0) < 99)).toBe(true);

    const noGround = sale({ maxGroundRent: 0, tenure: ['leasehold'] });
    expect(noGround.length).toBeGreaterThan(0);
    expect(noGround.every((p) => p.groundRentPerYear === 0)).toBe(true);

    const cheap = sale({ maxServiceCharge: 2_000, tenure: ['leasehold', 'share_of_freehold'] });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.every((p) => p.serviceChargePerYear! <= 2_000)).toBe(true);
  });

  it('matches any selected outdoor space or parking type', () => {
    const outdoor = sale({ outdoorSpace: ['balcony', 'terrace'] });
    expect(outdoor.length).toBeGreaterThan(0);
    expect(outdoor.every((p) => p.outdoorSpace?.some((x) => x === 'balcony' || x === 'terrace'))).toBe(true);
    const garage = sale({ parkingTypes: ['garage'] });
    expect(garage.length).toBeGreaterThan(0);
    expect(garage.every((p) => p.parking?.includes('garage') && p.hasParking)).toBe(true);
    // Compatible with the generic garden/parking must-haves.
    expect(sale({ hasGarden: true, outdoorSpace: ['private_garden'] }).every((p) => p.hasGarden)).toBe(true);
  });

  it('separates completed new builds from off-plan ones', () => {
    const ready = sale({ completion: 'ready' });
    const offPlan = sale({ completion: 'off_plan' });
    expect(ready.length).toBeGreaterThan(0);
    expect(offPlan.length).toBeGreaterThan(0);
    expect(ready.every((p) => p.newBuild && p.offPlan === false)).toBe(true);
    expect(offPlan.every((p) => p.newBuild && p.offPlan === true)).toBe(true);
  });

  it('clears sale-only choices outside Buy', () => {
    const saleFilters = f({ pricePeriod: 'total', chainFree: true, minLeaseYears: 99, outdoorSpace: ['balcony'], parkingTypes: ['garage'], completion: 'ready' });
    expect(getActiveChips(saleFilters).map((c) => c.key)).toEqual(
      expect.arrayContaining(['chainFree', 'lease', 'outdoor-balcony', 'parking-garage', 'completion']),
    );
    const next = updateFilters(saleFilters, { pricePeriod: 'monthly' }, CITY_INDEX);
    expect(next).toMatchObject({ chainFree: false, minLeaseYears: null, outdoorSpace: [], parkingTypes: [], completion: 'any' });
    expect(clearFilters(saleFilters)).toEqual(DEFAULT_FILTERS);
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

describe('quick presets', () => {
  const apply = (f0: Filters, key: string) => {
    const preset = presetsFor(f0.pricePeriod).find((p) => p.key === key)!;
    return updateFilters(f0, togglePreset(preset, f0), CITY_INDEX);
  };

  it('only offers presets that fit the Buy/Rent context', () => {
    const keys = (period: Filters['pricePeriod']) => presetsFor(period).map((p) => p.key);
    expect(keys('monthly')).toEqual(expect.arrayContaining(['students', 'pets', 'sharers', 'bills', 'accessible']));
    expect(keys('monthly')).not.toContain('chainFree');
    expect(keys('total')).toEqual(expect.arrayContaining(['chainFree', 'longLease']));
    expect(keys('total')).not.toContain('students');
  });

  it('switches to the right context from "Any" and shows up as ordinary chips', () => {
    const next = apply(DEFAULT_FILTERS, 'students');
    expect(next).toMatchObject({ pricePeriod: 'monthly', studentFriendly: true });
    expect(getActiveChips(next).map((c) => c.key)).toEqual(expect.arrayContaining(['period', 'studentFriendly']));
    expect(applyFilters(properties, next).every((p) => p.pricePeriod === 'monthly' && p.studentFriendly === true)).toBe(true);
  });

  it('composes with other filters and toggles off without leaving the context', () => {
    const base = f({ pricePeriod: 'monthly', city: 'London' });
    const both = apply(apply(base, 'pets'), 'sharers');
    const r = applyFilters(properties, both);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.city === 'London' && p.petsAllowed === true && p.sharersAccepted === true)).toBe(true);
    const off = apply(both, 'pets');
    expect(off).toMatchObject({ pricePeriod: 'monthly', city: 'London', petPolicy: 'any', sharersAccepted: true });
    expect(clearFilters(both)).toEqual(DEFAULT_FILTERS);
  });

  it('has matching listings for every preset', () => {
    for (const period of ['monthly', 'total'] as const) {
      for (const preset of presetsFor(period)) {
        const r = applyFilters(properties, apply(f({ pricePeriod: period }), preset.key));
        expect(r.length, `${period} ${preset.key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('rental suitability filters', () => {
  const rent = (patch: Partial<Filters>) => applyFilters(properties, f({ pricePeriod: 'monthly', ...patch }));
  const rentals = rent({});

  it('keeps only listings that state couples are welcome', () => {
    const r = rent({ couplesWelcome: true });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.couplesWelcome === true)).toBe(true);
    expect(rentals.some((p) => p.couplesWelcome === false)).toBe(true);
    expect(rentals.some((p) => p.couplesWelcome === undefined)).toBe(true);
  });

  it('matches income check required / not required only on explicit statements', () => {
    const required = rent({ incomeCheck: 'required' });
    const notRequired = rent({ incomeCheck: 'not_required' });
    const unknown = rentals.filter((p) => p.regularIncomeRequired === undefined);
    expect(required.every((p) => p.regularIncomeRequired === true)).toBe(true);
    expect(notRequired.every((p) => p.regularIncomeRequired === false)).toBe(true);
    expect(required.length && notRequired.length && unknown.length).toBeGreaterThan(0);
    expect(required.length + notRequired.length + unknown.length).toBe(rentals.length);
  });

  it.each(['salaried', 'civil_servants', 'teachers'] as const)('finds listings that welcome %s', (group) => {
    const r = rent({ applicantsWelcome: [group] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.applicantsWelcome?.includes(group))).toBe(true);
  });

  it('matches any selected applicant group and never an unstated or empty list', () => {
    const r = rent({ applicantsWelcome: ['teachers', 'civil_servants'] });
    expect(r.every((p) => p.applicantsWelcome!.some((g) => g === 'teachers' || g === 'civil_servants'))).toBe(true);
    expect(r.some((p) => !p.applicantsWelcome?.length)).toBe(false);
  });

  it('shows chips, removes them one by one, and clears outside Rent', () => {
    const rentFilters = f({ pricePeriod: 'monthly', couplesWelcome: true, incomeCheck: 'not_required', applicantsWelcome: ['teachers'] });
    const chips = getActiveChips(rentFilters);
    expect(chips.map((c) => c.label)).toEqual(expect.arrayContaining(['Couples welcome', 'No income check', 'Welcomes teachers']));
    for (const chip of chips.filter((c) => c.key !== 'period')) {
      expect(getActiveChips(updateFilters(rentFilters, chip.remove, CITY_INDEX)).some((c) => c.key === chip.key)).toBe(false);
    }
    expect(updateFilters(rentFilters, { pricePeriod: 'total' }, CITY_INDEX)).toMatchObject({
      couplesWelcome: false,
      incomeCheck: 'any',
      applicantsWelcome: [],
    });
    // Inert outside the Rent context.
    expect(applyFilters(properties, f({ couplesWelcome: true, incomeCheck: 'required' }))).toHaveLength(300);
  });
});
