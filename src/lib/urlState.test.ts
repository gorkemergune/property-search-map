import { describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { DEFAULT_FILTERS, buildCityIndex, type Filters } from './filters';
import { DEFAULT_SEARCH_STATE, decodeSearch, encodeSearch, onlyQueryChanged, type SearchState } from './urlState';

const CITY_INDEX = buildCityIndex(properties);
const state = (filters: Partial<Filters>, rest: Partial<SearchState> = {}): SearchState => ({
  ...DEFAULT_SEARCH_STATE,
  ...rest,
  filters: { ...DEFAULT_FILTERS, ...filters },
});
const roundTrip = (s: SearchState) => decodeSearch(encodeSearch(s), CITY_INDEX);

describe('share link encoding', () => {
  it('leaves defaults out entirely', () => {
    expect(encodeSearch(DEFAULT_SEARCH_STATE)).toBe('');
    expect(decodeSearch('', CITY_INDEX)).toEqual(DEFAULT_SEARCH_STATE);
  });

  it('writes short, readable parameters', () => {
    const qs = encodeSearch(
      state({ city: 'London', pricePeriod: 'monthly', minBedrooms: 2, maxMonthlyPrice: 2_000, petPolicy: 'allowed', includedBills: ['gas', 'water'] }, { mapMode: 'density' }),
    );
    expect(qs).toBe('?city=London&for=rent&rent=-2000&beds=2-&pets=yes&bills=gas,water&map=density');
  });

  it('round-trips a rich rental search including the new suitability filters', () => {
    const s = state(
      {
        query: 'quiet street',
        city: 'Manchester',
        pricePeriod: 'monthly',
        minMonthlyPrice: 1_000,
        maxMonthlyPrice: 2_500,
        types: ['apartment', 'house'],
        minBedrooms: 1,
        maxBedrooms: 3,
        areaUnit: 'sqft',
        minArea: 500,
        furnishing: ['part_furnished'],
        hasGarden: true,
        minEpcRating: 'C',
        petPolicy: 'not_allowed',
        couplesWelcome: true,
        studentFriendly: true,
        incomeCheck: 'not_required',
        applicantsWelcome: ['teachers', 'civil_servants'],
        stepFreeAccess: true,
        maxDepositWeeks: 0,
        availableBy: '2026-12-01',
      },
      { sort: 'price-asc', mapMode: 'popular' },
    );
    expect(roundTrip(s)).toEqual({ ...s, filters: { ...s.filters, query: 'quiet street' } });
  });

  it('round-trips a sale search with lease filters and zero ground rent', () => {
    const s = state({
      pricePeriod: 'total',
      minSalePrice: 300_000,
      tenure: ['leasehold', 'share_of_freehold'],
      chainFree: true,
      minLeaseYears: 99,
      maxGroundRent: 0,
      outdoorSpace: ['balcony'],
      parkingTypes: ['allocated'],
      completion: 'off_plan',
    });
    expect(encodeSearch(s)).toContain('tenure=leasehold,share-of-freehold');
    expect(roundTrip(s)).toEqual(s);
  });

  it('ignores unknown parameters and malformed values', () => {
    const s = decodeSearch(
      '?city=Atlantis&for=lease&beds=5-2&price=abc&type=castle,house&pets=maybe&deposit=-1&availableby=2026-13-45&map=satellite&sort=cheapest&utm_source=x&epc=z',
      CITY_INDEX,
    );
    expect(s.filters).toEqual({ ...DEFAULT_FILTERS, types: ['house'] });
    expect(s.sort).toBe('newest');
    expect(s.mapMode).toBe('homes');
  });

  it('keeps the result coherent: rent-only values need the Rent context, a city implies its country', () => {
    expect(decodeSearch('?for=sale&pets=yes&couples=1', CITY_INDEX).filters).toMatchObject({ pricePeriod: 'total', petPolicy: 'any', couplesWelcome: false });
    expect(decodeSearch('?country=all&city=Bristol', CITY_INDEX).filters).toMatchObject({ country: 'GB', city: 'Bristol' });
  });

  it('never contains personal data fields', () => {
    const qs = encodeSearch(state({ pricePeriod: 'monthly', couplesWelcome: true }));
    expect(qs).not.toMatch(/note|rating|saved|viewed/i);
  });

  it('tells typing apart from other changes', () => {
    expect(onlyQueryChanged('?q=a&for=rent', '?q=ab&for=rent')).toBe(true);
    expect(onlyQueryChanged('?q=a', '?q=a&for=rent')).toBe(false);
    expect(onlyQueryChanged('?for=rent', '?for=rent')).toBe(false);
  });
});
