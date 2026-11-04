import { beforeAll, describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { primeInsights } from './insights';
import { affinity, buildProfile, commonTraits, recommend, similarTo, traitsToQuery } from './recommend';

beforeAll(() => primeInsights(properties));

const londonRentals = properties.filter((p) => p.city === 'London' && p.pricePeriod === 'monthly' && p.bedrooms === 2 && p.status === 'available').slice(0, 3);

describe('recommendations', () => {
  it('returns nothing without any history', () => {
    expect(recommend(properties, buildProfile({ saved: [], viewed: [] }))).toEqual([]);
  });

  it('recommends unseen homes like the saved ones, with reasons', () => {
    const profile = buildProfile({ saved: londonRentals, viewed: [] });
    const recs = recommend(properties, profile, 5);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(londonRentals.map((p) => p.id)).not.toContain(r.property.id);
      expect(r.property.pricePeriod).toBe('monthly');
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });

  it('scores a matching home above a very different one', () => {
    const profile = buildProfile({ saved: londonRentals, viewed: [] });
    const similar = properties.find((p) => p.city === 'London' && p.pricePeriod === 'monthly' && p.bedrooms === 2 && !londonRentals.includes(p))!;
    const different = properties.find((p) => p.city !== 'London' && p.pricePeriod === 'total' && p.bedrooms >= 4)!;
    expect(affinity(similar, profile).score).toBeGreaterThan(affinity(different, profile).score);
  });

  it('lists common traits of the basket and turns them into a search', () => {
    const traits = commonTraits(londonRentals);
    const labels = traits.map((t) => t.label);
    expect(labels).toEqual(expect.arrayContaining(['In London', 'To rent', '2 bedrooms']));
    const q = traitsToQuery(traits);
    expect(q).toMatch(/2 bed/);
    expect(q).toMatch(/in London/);
  });

  it('needs at least two saved homes for traits', () => {
    expect(commonTraits(londonRentals.slice(0, 1))).toEqual([]);
  });

  it('finds similar homes for a listing', () => {
    const recs = similarTo(londonRentals[0], properties, 4);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.property.id !== londonRentals[0].id)).toBe(true);
  });
});
