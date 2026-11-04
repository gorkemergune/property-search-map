import { beforeAll, describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { getInsights, primeInsights } from './insights';

beforeAll(() => primeInsights(properties));

describe('insights', () => {
  it('is deterministic', () => {
    const p = properties[10];
    expect(JSON.stringify(getInsights(p))).toBe(JSON.stringify(getInsights({ ...p })));
  });

  it('tags recorded facts exactly as the listing states them', () => {
    for (const p of properties) {
      const keys = getInsights(p).tags.map((t) => t.key);
      expect(keys.includes('pets')).toBe(p.petsAllowed === true);
      expect(keys.includes('student')).toBe(p.studentFriendly === true);
    }
  });

  it('gives every listing transport, school and hospital distances', () => {
    for (const p of properties.slice(0, 50)) {
      const kinds = getInsights(p).amenities.map((a) => a.kind);
      expect(kinds).toEqual(expect.arrayContaining(['transit', 'primarySchool', 'hospital']));
    }
  });

  it('only uses Ofsted ratings for schools in England', () => {
    const scottish = properties.find((p) => p.nation === 'scotland')!;
    expect(getInsights(scottish).amenities.every((a) => a.rating === undefined)).toBe(true);
  });

  it('keeps proximity tags selective enough to be useful', () => {
    const share = (key: string) => properties.filter((p) => getInsights(p).tags.some((t) => t.key === key)).length / properties.length;
    for (const key of ['nearTransit', 'nearSchool', 'nearHospital', 'nearPark']) {
      expect(share(key)).toBeGreaterThan(0.05);
      expect(share(key)).toBeLessThan(0.8);
    }
  });

  it('shares community voices within a neighbourhood', () => {
    const [a, b] = properties.filter((p) => p.neighborhood === 'Shoreditch');
    expect(getInsights(a).voices.map((v) => v.text)).toEqual(getInsights(b).voices.map((v) => v.text));
  });
});
