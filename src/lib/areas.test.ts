import { describe, expect, it } from 'vitest';
import ladsJson from '../data/geo/lad.json';
import wardsJson from '../data/geo/wards.json';
import { properties } from '../data/properties';
import { assignToAreas, containsPoint, countByArea, populationColor, type Geometry, type LadCollection, type WardCollection } from './areas';

const lads = ladsJson as LadCollection;
const wards = wardsJson as WardCollection;
describe('geographic layers', () => {
  it('excludes polygon holes and supports multipolygons', () => {
    const geometry: Geometry = { type: 'MultiPolygon', coordinates: [
      [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]],
      [[[8, 8], [9, 8], [9, 9], [8, 9], [8, 8]]],
    ] };
    expect(containsPoint(geometry, 0.5, 0.5)).toBe(true);
    expect(containsPoint(geometry, 1.5, 1.5)).toBe(false);
    expect(containsPoint(geometry, 8.5, 8.5)).toBe(true);
    expect(containsPoint(geometry, 6, 6)).toBe(false);
  });
  it('uses UK-wide population coverage and never paints a value white', () => {
    expect(new Set(lads.features.map((f) => f.properties.code[0]))).toEqual(new Set(['E', 'W', 'S', 'N']));
    for (const { properties: p } of lads.features) {
      expect(p.density).not.toBeNull();
      expect(populationColor(p.density)).not.toBe('#ffffff');
    }
    expect(populationColor(1)).toBe(populationColor(0));
    expect(populationColor(10000)).not.toBe(populationColor(10));
  });
  it('accounts for every home and respects filtered result counts, including areas without wards', () => {
    const assignment = assignToAreas(properties, lads, wards);
    const all = countByArea(properties, assignment);
    expect(properties.filter((p) => !assignment.get(p.id)?.lad).map((p) => `${p.id} ${p.city} ${p.neighborhood}`)).toEqual([]);
    expect([...all.lad.values()].reduce((a, b) => a + b, 0)).toBe(properties.length);
    const filtered = properties.filter((p) => p.city === 'Cardiff');
    expect(filtered).toHaveLength(3);
    const counts = countByArea(filtered, assignment);
    expect([...counts.lad.values()].reduce((a, b) => a + b, 0)).toBe(3);
    expect(countByArea([], assignment).lad.size).toBe(0);
  });
});
