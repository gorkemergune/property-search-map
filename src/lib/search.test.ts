import { describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { DEFAULT_FILTERS, applyFilters, buildCityIndex, updateFilters, type Filters } from './filters';
import { formatPrice } from './format';
import { flattenSuggestions, getSuggestions } from './search';
import type { Property } from '../types/property';

const CITY_INDEX = buildCityIndex(properties);
const detail = (p: Property) => `${formatPrice(p)} · ${p.city}`;
const suggest = (query: string, filters: Filters = DEFAULT_FILTERS) =>
  getSuggestions(query, properties, { ...filters, query }, CITY_INDEX, detail);

describe('getSuggestions', () => {
  it('suggests nothing for one character', () => {
    expect(flattenSuggestions(suggest('n'))).toEqual([]);
  });

  it('suggests New York for a misspelling, as a "did you mean" with the real count', () => {
    const { places } = suggest('New Yrok');
    const ny = places.find((s) => s.kind === 'city' && s.label === 'New York');
    expect(ny).toBeDefined();
    expect(ny!.fuzzy).toBe(true);
    expect(ny!.count).toBe(12);
    expect(ny!.patch).toEqual({ city: 'New York', query: '' });
  });

  it('matches Turkish place names typed without special characters', () => {
    const labels = suggest('uskudar').places.map((s) => s.label);
    expect(labels).toContain('Üsküdar');
    expect(suggest('izmir').places.find((s) => s.kind === 'city')?.label).toBe('Izmir');
  });

  it('suggests countries and home types with counts', () => {
    expect(suggest('turk').places.find((s) => s.kind === 'country')).toMatchObject({ label: 'Turkey', count: 20 });
    const apartment = suggest('apartmnet').types.find((s) => s.label === 'Apartment');
    expect(apartment).toMatchObject({ fuzzy: true, count: 51 });
    expect(suggest('villa').types.find((s) => s.label === 'Villa')).toMatchObject({ fuzzy: false, count: 6 });
  });

  it('counts within the current filters and keeps them when applied', () => {
    const rentals = updateFilters(DEFAULT_FILTERS, { pricePeriod: 'monthly' }, CITY_INDEX);
    const ny = suggest('new york', rentals).places.find((s) => s.label === 'New York')!;
    const expected = applyFilters(properties, { ...rentals, city: 'New York', country: 'US' }).length;
    expect(ny.count).toBe(expected);
    // Applying the suggestion keeps Rent and only changes city/query.
    const applied = updateFilters(rentals, ny.patch, CITY_INDEX);
    expect(applied.pricePeriod).toBe('monthly');
    expect(applyFilters(properties, applied)).toHaveLength(expected);
  });

  it('lists matching listings with price and place', () => {
    const { listings } = suggest('brickell');
    expect(listings.length).toBe(2);
    expect(listings[0].detail).toMatch(/^\$[\d,]+(\/mo)? · Miami$/);
  });

  it('offers the typed keyword itself with its result count', () => {
    const { query } = suggest('Chelsea');
    expect(query).toMatchObject({ kind: 'query', patch: { query: 'Chelsea' } });
    expect(query!.count).toBe(applyFilters(properties, { ...DEFAULT_FILTERS, query: 'Chelsea' }).length);
  });

  it('flattens groups in display order for keyboard navigation', () => {
    const g = suggest('lon');
    const flat = flattenSuggestions(g);
    expect(flat[0].kind).toBe('query');
    expect(flat.map((s) => s.id)).toEqual([g.query!, ...g.places, ...g.types, ...g.listings].map((s) => s.id));
  });
});

describe('getSuggestions noise (regression)', () => {
  it('suggests nothing for filler-only queries', () => {
    expect(flattenSuggestions(suggest('in'))).toEqual([]);
    expect(flattenSuggestions(suggest('the'))).toEqual([]);
  });

  it('does not suggest random listings for words every title shares', () => {
    expect(suggest('apartment in').listings.every((s) => s.property.type === 'apartment' || /apartment/i.test(s.label))).toBe(true);
  });

  it('offers only the keyword row, with 0 homes, when nothing matches', () => {
    const g = suggest('paris');
    expect(g.places).toEqual([]);
    expect(g.types).toEqual([]);
    expect(g.listings).toEqual([]);
    expect(g.query?.count).toBe(0);
  });
});
