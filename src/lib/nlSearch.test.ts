import { beforeAll, describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { applyFilters, buildCityIndex, DEFAULT_FILTERS, updateFilters } from './filters';
import { primeInsights } from './insights';
import { buildVocabulary, explainMatch, parseQuery, rankResults, removeCriterionFromQuery, suggestRelaxations, type Vocabulary } from './nlSearch';

let vocab: Vocabulary;
const idx = buildCityIndex(properties);
const run = (q: string) => {
  const parsed = parseQuery(q, vocab);
  const filters = updateFilters(DEFAULT_FILTERS, parsed.filters, idx);
  const ranked = rankResults(applyFilters(properties, { ...filters, query: '' }), parsed.soft);
  return { parsed, filters, ranked, full: ranked.filter((r) => r.score >= 0.999) };
};

beforeAll(() => {
  primeInsights(properties);
  vocab = buildVocabulary(properties);
});

describe('parseQuery', () => {
  it('reads rent, budget, bedrooms, place and type as filters', () => {
    const { parsed } = run('2 bed flat in Hackney near the tube with a garden under £2,500 pcm');
    expect(parsed.filters).toMatchObject({ pricePeriod: 'monthly', maxMonthlyPrice: 2500, minBedrooms: 2, maxBedrooms: 2, city: 'London', types: ['apartment'] });
    expect(parsed.soft.map((s) => s.id)).toEqual(['hood:hackney', 'nearTransit', 'garden']);
    expect(parsed.ignored).toEqual([]);
  });

  it('infers a sale from a large budget and tolerates a typo in the city', () => {
    const { parsed } = run('quiet 3 bedroom house in manchster under 450k chain free');
    expect(parsed.filters).toMatchObject({ pricePeriod: 'total', maxSalePrice: 450_000, city: 'Manchester', minBedrooms: 3 });
    expect(parsed.soft.map((s) => s.id)).toEqual(expect.arrayContaining(['chainFree', 'quiet']));
  });

  it('understands proximity to schools, hospitals and GPs', () => {
    const { parsed } = run('family home near an outstanding school and a hospital');
    expect(parsed.soft.map((s) => s.id)).toEqual(expect.arrayContaining(['goodSchool', 'nearHospital', 'family']));
  });

  it('treats "2+ beds" as a minimum and "studio" as zero bedrooms', () => {
    expect(run('2+ beds in Bristol').parsed.filters).toMatchObject({ minBedrooms: 2, maxBedrooms: null, city: 'Bristol' });
    expect(run('studio in London').parsed.filters).toMatchObject({ maxBedrooms: 0 });
  });

  it('does not read "near the park" as the Nottingham neighbourhood "The Park"', () => {
    const { parsed } = run('flat near the park in Leeds');
    expect(parsed.filters.city).toBe('Leeds');
    expect(parsed.soft.map((s) => s.id)).toEqual(['nearPark']);
  });

  it('reports words that match nothing in the listings', () => {
    expect(run('flat with a jacuzzi in London').parsed.ignored).toEqual(['jacuzzi']);
  });
});

describe('ranking and explanations', () => {
  it('puts listings that meet every criterion first and explains why', () => {
    const { ranked, full, parsed } = run('2 bed flat to rent near a hospital and a GP, step free');
    expect(full.length).toBeGreaterThan(0);
    expect(ranked[0].score).toBe(1);
    expect(explainMatch(ranked[0], parsed.hard)).toMatch(/matches all 3 things you asked for/);
  });

  it('names what a partial match is missing', () => {
    const { ranked, parsed } = run('2 bed flat in Hackney near the tube with a garden under £2,500 pcm');
    const partial = ranked.find((r) => r.score < 1 && r.score > 0)!;
    expect(explainMatch(partial, parsed.hard)).toMatch(/; no /);
  });

  it('removes a criterion phrase from the sentence', () => {
    expect(removeCriterionFromQuery('flat in Leeds with a balcony near the park', { phrase: 'balcony' })).toBe('flat in Leeds with a near the park');
  });

  it('suggests relaxations with real counts when nothing matches', () => {
    const { parsed, filters, full } = run('2 bed flat in Hackney near the tube with a garden under £2,500 pcm');
    expect(full).toHaveLength(0);
    const relax = suggestRelaxations(parsed, filters, (f, soft) => rankResults(applyFilters(properties, { ...f, query: '' }), soft).filter((r) => r.score >= 0.999).length);
    expect(relax.length).toBeGreaterThan(0);
    for (const r of relax) expect(r.count).toBeGreaterThan(0);
  });
});
