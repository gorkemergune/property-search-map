import { describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { applyFilters, DEFAULT_FILTERS } from './filters';
import { buildPlaces, draftToProperty, emptyDraft, isUserListing, nearestPlace, suggestTitle, validateDraft } from './userListings';

const places = buildPlaces(properties);

const filled = () => ({
  ...emptyDraft(),
  city: 'London',
  neighborhood: 'Hackney',
  address: '12 Example Road',
  postcode: 'e8 1aa',
  lat: 51.547,
  lng: -0.054,
  price: '425,000',
  areaSqm: '72',
});

describe('user listings', () => {
  it('lists every dataset city with its neighbourhoods', () => {
    const london = places.find((c) => c.name === 'London');
    expect(london?.areas.some((a) => a.name === 'Hackney')).toBe(true);
    expect(new Set(places.map((c) => c.name)).size).toBe(new Set(properties.map((p) => p.city)).size);
  });

  it('finds the nearest known neighbourhood to a pin', () => {
    const near = nearestPlace(places, { lat: 51.5471, lng: -0.0541 });
    expect(near?.city.name).toBe('London');
    expect(near?.km).toBeLessThan(2);
  });

  it('requires location, price and floor area', () => {
    expect(Object.keys(validateDraft(emptyDraft())).sort()).toEqual(['address', 'areaSqm', 'city', 'neighborhood', 'pin', 'price']);
    expect(validateDraft(filled())).toEqual({});
  });

  it('builds a sale listing that the search filters can find', () => {
    const p = draftToProperty({ ...filled(), outdoorSpace: ['private_garden'], chainFree: true }, 'england');
    expect(isUserListing(p.id)).toBe(true);
    expect(p).toMatchObject({ price: 425_000, areaSqm: 72, city: 'London', address: '12 Example Road, E8 1AA', hasGarden: true, chainFree: true, tenure: 'leasehold' });
    expect(p.furnishing).toBeUndefined();
    const found = applyFilters([p], { ...DEFAULT_FILTERS, city: 'London', pricePeriod: 'total', hasGarden: true });
    expect(found).toHaveLength(1);
  });

  it('builds a rental with rent-only facts and no sale-only ones', () => {
    const p = draftToProperty({ ...filled(), pricePeriod: 'monthly', price: '1,850', petsAllowed: 'yes', includedBills: ['internet'] }, 'england');
    expect(p).toMatchObject({ pricePeriod: 'monthly', price: 1_850, petsAllowed: true, includedBills: ['internet'], furnishing: 'unfurnished' });
    expect(p.tenure).toBeUndefined();
  });

  it('uses outright tenure in Scotland', () => {
    expect(draftToProperty(filled(), 'scotland').tenure).toBe('outright');
  });

  it('suggests a readable title', () => {
    expect(suggestTitle({ bedrooms: 0, type: 'apartment', neighborhood: 'Hackney', city: 'London', pricePeriod: 'monthly' })).toBe('Studio flat in Hackney to rent');
  });
});
