import { describe, expect, it } from 'vitest';
import { DEMO_INTEREST, INTEREST_SOURCE } from '../data/interest';
import { properties } from '../data/properties';
import { DEFAULT_FILTERS, applyFilters } from './filters';
import { densityPoints, interestPoints } from './heat';

describe('listing density', () => {
  it('has one point per home in the current results', () => {
    const results = applyFilters(properties, { ...DEFAULT_FILTERS, city: 'Bristol', pricePeriod: 'monthly' });
    const points = densityPoints(results);
    expect(points).toHaveLength(results.length);
    expect(points.map((p) => [p.lat, p.lng])).toEqual(results.map((p) => [p.lat, p.lng]));
    expect(densityPoints([])).toEqual([]);
  });
});

describe('popular areas (demo interest)', () => {
  it('is labelled as demo data and covers every neighbourhood with listings', () => {
    expect(INTEREST_SOURCE).toBe('demo');
    const hoods = new Set(properties.map((p) => `${p.city}|${p.neighborhood}`));
    expect(new Set(DEMO_INTEREST.map((a) => `${a.city}|${a.neighborhood}`))).toEqual(hoods);
    for (const a of DEMO_INTEREST) for (const v of [a.buy, a.rent]) expect(v >= 0 && v <= 100, a.neighborhood).toBe(true);
  });

  it('follows the chosen city and Buy/Rent context', () => {
    const all = interestPoints(properties, { city: 'all', pricePeriod: 'all' }).points;
    const leeds = interestPoints(properties, { city: 'Edinburgh', pricePeriod: 'monthly' }).points;
    expect(all).toHaveLength(DEMO_INTEREST.length);
    expect(leeds).toHaveLength(DEMO_INTEREST.filter((a) => a.city === 'Edinburgh').length);
    const marchmont = DEMO_INTEREST.find((a) => a.neighborhood === 'Marchmont')!;
    expect(leeds.map((p) => p.weight)).toContain(marchmont.rent / 100);
    const buy = interestPoints(properties, { city: 'Edinburgh', pricePeriod: 'total' }).points;
    expect(buy.map((p) => p.weight)).toContain(marchmont.buy / 100);
  });

  it('places areas at the centre of their listings, not at invented coordinates', () => {
    const [point] = interestPoints(properties, { city: 'all', pricePeriod: 'all' }, [{ city: 'London', neighborhood: 'Mayfair', buy: 50, rent: 50 }]).points;
    const mayfair = properties.filter((p) => p.neighborhood === 'Mayfair');
    expect(point.lat).toBeCloseTo(mayfair.reduce((s, p) => s + p.lat, 0) / mayfair.length, 6);
    expect(point.weight).toBe(0.5);
  });
});
