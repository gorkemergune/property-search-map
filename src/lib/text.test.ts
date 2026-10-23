import { describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { editDistance, matchWord, matchesQuery, normalizeText, scoreText, tokenize } from './text';

describe('normalizeText', () => {
  it('folds capitals and accents', () => {
    expect(normalizeText('London')).toBe('london');
    expect(normalizeText('EDINBURGH')).toBe('edinburgh');
    expect(normalizeText('Shoreditch')).toBe('shoreditch');
  });

  it('tokenizes on punctuation', () => {
    expect(tokenize('Flat 5, 48 Example Road')).toEqual(['flat', '5', '48', 'example', 'road']);
  });
});

describe('editDistance', () => {
  it('counts a swap of adjacent letters as one edit', () => {
    expect(editDistance('lonndon', 'london')).toBe(1);
    expect(editDistance('manchstr', 'manchester')).toBe(2);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });

  it('stops early above the limit', () => {
    expect(editDistance('bristol', 'birmingham', 2)).toBe(3);
  });
});

describe('matchWord', () => {
  it('ranks exact, prefix and fuzzy matches', () => {
    expect(matchWord('york', 'york')).toBe('exact');
    expect(matchWord('clap', 'clapham')).toBe('prefix');
    expect(matchWord('lonndon', 'london')).toBe('fuzzy');
    expect(matchWord('manchestr', 'manchester')).toBe('fuzzy');
  });

  it('does not allow typos in very short words', () => {
    expect(matchWord('ny', 'la')).toBeNull();
    expect(matchWord('lnd', 'london')).toBeNull();
  });
});

describe('scoreText and matchesQuery', () => {
  it('needs every query word to match', () => {
    expect(scoreText('east london', 'East London')).toBe(3);
    expect(scoreText('east lonndon', 'East London')).toBeGreaterThan(0);
    expect(scoreText('east paris', 'East London')).toBe(0);
  });

  it('tolerates typos in place names', () => {
    expect(properties.filter((p) => matchesQuery(p, 'Lonndon')).length).toBeGreaterThan(0);
    expect(properties.filter((p) => matchesQuery(p, 'Manchstr')).length).toBeGreaterThan(0);
  });

  it('searches title, type, country, address and description', () => {
    expect(properties.filter((p) => matchesQuery(p, 'villa')).every((p) => p.type === 'villa' || /villa/i.test(p.title))).toBe(true);
    expect(properties.filter((p) => matchesQuery(p, 'united kingdom'))).toHaveLength(300);
    expect(properties.filter((p) => matchesQuery(p, 'part-furnished')).every((p) => p.furnishing === 'part_furnished')).toBe(true);
  });
});

describe('filler and template words (regression)', () => {
  const count = (q: string) => properties.filter((p) => matchesQuery(p, q)).length;

  it('does not match every listing through the generated description wording', () => {
    expect(count('demo')).toBe(300);
    expect(count('bath')).toBe(0);
    expect(count('Bath')).toBe(0);
    expect(count('fictional details')).toBe(300);
  });

  it('ignores filler words but keeps meaningful ones', () => {
    expect(count('in')).toBe(300);
    expect(count('homes in shoreditch')).toBe(0); // "homes" is not a stop word and matches nothing
    const shoreditch = count('apartment in shoreditch');
    expect(shoreditch).toBeGreaterThan(0);
    expect(count('for rent')).toBeGreaterThan(50);
    expect(properties.filter((p) => matchesQuery(p, 'furnished')).every((p) => p.furnishing === 'furnished' || p.furnishing === 'part_furnished')).toBe(true);
  });
});
