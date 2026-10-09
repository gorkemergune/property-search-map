import { describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import { editDistance, matchWord, matchesQuery, normalizeText, scoreText, tokenize } from './text';

describe('normalizeText', () => {
  it('folds Turkish capitals, dotless i and accents', () => {
    expect(normalizeText('İstanbul')).toBe('istanbul');
    expect(normalizeText('ISTANBUL')).toBe('istanbul');
    expect(normalizeText('İzmir')).toBe(normalizeText('Izmir'));
    expect(normalizeText('Kızılay')).toBe('kizilay');
    expect(normalizeText('Üsküdar Şişli Çankaya Göztepe')).toBe('uskudar sisli cankaya goztepe');
  });

  it('tokenizes on punctuation', () => {
    expect(tokenize('Moda Cd. No: 48 D: 5')).toEqual(['moda', 'cd', 'no', '48', 'd', '5']);
  });
});

describe('editDistance', () => {
  it('counts a swap of adjacent letters as one edit', () => {
    expect(editDistance('yrok', 'york')).toBe(1);
    expect(editDistance('manchster', 'manchester')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });

  it('stops early above the limit', () => {
    expect(editDistance('austin', 'birmingham', 2)).toBe(3);
  });
});

describe('matchWord', () => {
  it('ranks exact, prefix and fuzzy matches', () => {
    expect(matchWord('york', 'york')).toBe('exact');
    expect(matchWord('brook', 'brooklyn')).toBe('prefix');
    expect(matchWord('yrok', 'york')).toBe('fuzzy');
    expect(matchWord('manchestr', 'manchester')).toBe('fuzzy');
  });

  it('only allows swapped letters in four-letter words', () => {
    expect(matchWord('yrok', 'york')).toBe('fuzzy');
    expect(matchWord('part', 'park')).toBeNull();
    expect(matchWord('lodnon', 'london')).toBe('fuzzy');
  });

  it('does not allow typos in very short words', () => {
    expect(matchWord('ny', 'la')).toBeNull();
    expect(matchWord('lnd', 'london')).toBeNull();
  });
});

describe('scoreText and matchesQuery', () => {
  it('needs every query word to match', () => {
    expect(scoreText('new york', 'New York')).toBe(3);
    expect(scoreText('new yrok', 'New York')).toBeGreaterThan(0);
    expect(scoreText('new paris', 'New York')).toBe(0);
  });

  it('finds listings with Turkish characters typed either way', () => {
    const plain = properties.filter((p) => matchesQuery(p, 'istanbul'));
    const dotted = properties.filter((p) => matchesQuery(p, 'İSTANBUL'));
    expect(plain).toHaveLength(9);
    expect(dotted.map((p) => p.id)).toEqual(plain.map((p) => p.id));
    expect(properties.filter((p) => matchesQuery(p, 'İzmir'))).toHaveLength(4);
  });

  it('tolerates typos in place names', () => {
    expect(properties.filter((p) => matchesQuery(p, 'New Yrok'))).toHaveLength(12);
    expect(properties.filter((p) => matchesQuery(p, 'Manchstr'))).toHaveLength(2);
  });

  it('searches title, type, country, address and description', () => {
    expect(properties.filter((p) => matchesQuery(p, 'villa')).every((p) => p.type === 'villa' || /villa/i.test(p.title))).toBe(true);
    expect(properties.filter((p) => matchesQuery(p, 'turkey'))).toHaveLength(20);
    // Addresses are fictional; a unique one still finds exactly its listing.
    expect(properties.filter((p) => matchesQuery(p, '23 Demo Boulevard')).map((p) => p.id)).toEqual(['us-nyc-11']);
    expect(properties.filter((p) => matchesQuery(p, 'part-furnished')).every((p) => p.furnishing === 'part_furnished')).toBe(true);
  });
});

describe('filler and template words (regression)', () => {
  const count = (q: string) => properties.filter((p) => matchesQuery(p, q)).length;

  it('does not match every listing through the generated description wording', () => {
    expect(count('demo')).toBe(80); // filler only → the query does not narrow
    expect(count('bath')).toBe(0); // e.g. the UK city of Bath is not in the data
    expect(count('Bath')).toBe(0);
    expect(count('fictional details')).toBe(80);
    expect(count('with london')).toBe(4);
  });

  it('ignores filler words but keeps meaningful ones', () => {
    expect(count('in')).toBe(80);
    expect(count('homes in chelsea')).toBe(0); // "homes" is not a stop word and matches nothing
    expect(count('apartment in chelsea')).toBe(1);
    expect(count('for rent')).toBe(37);
    expect(properties.filter((p) => matchesQuery(p, 'furnished')).every((p) => p.furnishing === 'furnished' || p.furnishing === 'part_furnished')).toBe(true);
  });
});
