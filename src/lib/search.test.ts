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

  it('suggests London for a misspelling, as a "did you mean" with the real count', () => {
    const { places } = suggest('Lonndon');
    const lon = places.find((s) => s.kind === 'city' && s.label === 'London');
    expect(lon).toBeDefined();
    expect(lon!.fuzzy).toBe(true);
    expect(lon!.count).toBe(120);
    expect(lon!.patch).toEqual({ city: 'London', query: '' });
  });

  it('matches UK place names typed with different casing', () => {
    const labels = suggest('shoreditch').places.map((s) => s.label);
    expect(labels).toContain('Shoreditch');
    expect(suggest('BRISTOL').places.find((s) => s.kind === 'city')?.label).toBe('Bristol');
  });

  it('suggests countries and home types with counts', () => {
    expect(suggest('united').places.find((s) => s.kind === 'country')).toMatchObject({ label: 'United Kingdom', count: 300 });
    const apartment = suggest('apartmnet').types.find((s) => s.label === 'Apartment');
    expect(apartment).toMatchObject({ fuzzy: true });
    expect(apartment!.count).toBeGreaterThan(0);
    expect(suggest('house').types.find((s) => s.label === 'House')).toMatchObject({ fuzzy: false });
  });

  it('counts within the current filters and keeps them when applied', () => {
    const rentals = updateFilters(DEFAULT_FILTERS, { pricePeriod: 'monthly' }, CITY_INDEX);
    const london = suggest('london', rentals).places.find((s) => s.label === 'London')!;
    const expected = applyFilters(properties, { ...rentals, city: 'London', country: 'GB' }).length;
    expect(london.count).toBe(expected);
    const applied = updateFilters(rentals, london.patch, CITY_INDEX);
    expect(applied.pricePeriod).toBe('monthly');
    expect(applyFilters(properties, applied)).toHaveLength(expected);
  });

  it('lists matching listings with price and place', () => {
    const { listings } = suggest('shoreditch');
    expect(listings.length).toBeGreaterThan(0);
    expect(listings[0].detail).toMatch(/^£[\d,]+(\/mo)? · London$/);
  });

  it('offers the typed keyword itself with its result count', () => {
    const { query } = suggest('Clapham');
    expect(query).toMatchObject({ kind: 'query', patch: { query: 'Clapham' } });
    expect(query!.count).toBe(applyFilters(properties, { ...DEFAULT_FILTERS, query: 'Clapham' }).length);
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
