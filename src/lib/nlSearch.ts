import { DEFAULT_FILTERS, type Filters } from './filters';
import { getInsights, hasTag, type TagKey } from './insights';
import { matchWord, normalizeText, tokenize } from './text';
import type { Property, PropertyType } from '../types/property';

/**
 * Natural-language search: "2 bed flat in Hackney near the tube with a garden under £2,500".
 *
 * `parseQuery` splits a sentence into
 * - hard criteria that become ordinary filters (city, rent/buy, bedrooms, price, home type), and
 * - soft criteria (features and proximity) that rank results and explain matches.
 * Words it does not recognise become keyword criteria matched against each
 * listing's keyword index (tags, places, title, description).
 *
 * Runs fully in the browser, no model call; the same interface could be backed
 * by an LLM later (the parser output is plain data).
 */

export interface Criterion {
  id: string;
  label: string;
  icon: string;
  kind: 'feature' | 'place' | 'keyword';
  /** Text in the query that produced this criterion, so a chip can remove it from the sentence. */
  phrase: string;
  weight: number;
  test: (p: Property) => boolean;
  /** Concrete evidence for the "why it matched" note, e.g. "Tube 4 min". */
  evidence?: (p: Property) => string | null;
}

export interface HardCriterion {
  label: string;
  icon: string;
  phrase: string;
  patch: Partial<Filters>;
}

export interface ParsedQuery {
  text: string;
  hard: HardCriterion[];
  /** All hard patches merged. */
  filters: Partial<Filters>;
  soft: Criterion[];
  /** Query words that matched nothing in the data. */
  ignored: string[];
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

interface FeatureDef {
  id: string;
  label: string;
  icon: string;
  phrases: string[];
  test: (p: Property) => boolean;
  tag?: TagKey;
  weight?: number;
}

const tagLabel = (p: Property, key: TagKey) => getInsights(p).tags.find((t) => t.key === key)?.label ?? null;
const tagTest = (...keys: TagKey[]) => (p: Property) => keys.some((k) => hasTag(p, k));

/** Longer phrases first so "outstanding school" wins over "school", "unfurnished" over "furnished". */
const FEATURES: FeatureDef[] = [
  { id: 'goodSchool', label: 'Outstanding school', icon: 'workspace_premium', tag: 'goodSchool', test: tagTest('goodSchool'), phrases: ['outstanding school', 'outstanding schools', 'good schools', 'best schools', 'ofsted outstanding', 'top schools'], weight: 1.4 },
  { id: 'nearSchool', label: 'Near a school', icon: 'school', tag: 'nearSchool', test: tagTest('nearSchool', 'goodSchool'), phrases: ['near school', 'near schools', 'schools', 'school', 'catchment', 'ofsted'], weight: 1.3 },
  { id: 'nearHospital', label: 'Near a hospital', icon: 'local_hospital', tag: 'nearHospital', test: tagTest('nearHospital'), phrases: ['hospital', 'hospitals', 'a&e', 'a e', 'nhs'], weight: 1.3 },
  { id: 'nearGp', label: 'Near a GP', icon: 'medical_services', tag: 'nearGp', test: tagTest('nearGp', 'nearHospital'), phrases: ['gp', 'doctor', 'doctors', 'surgery', 'medical'] },
  { id: 'nearTransit', label: 'Near Tube / station', icon: 'directions_subway', tag: 'nearTransit', test: tagTest('nearTransit'), phrases: ['near the tube', 'near tube', 'tube', 'underground', 'metro', 'metrolink', 'subway', 'tram', 'train station', 'station', 'stations', 'transport links', 'transport', 'commute', 'commuter'], weight: 1.3 },
  { id: 'nearPark', label: 'Near a park', icon: 'park', tag: 'nearPark', test: tagTest('nearPark'), phrases: ['green space', 'park', 'parks', 'green'] },
  { id: 'nearUni', label: 'Near university', icon: 'school', tag: 'nearUni', test: tagTest('nearUni'), phrases: ['university', 'uni', 'campus', 'college'] },
  { id: 'nearShops', label: 'Shops nearby', icon: 'local_grocery_store', tag: 'nearShops', test: tagTest('nearShops'), phrases: ['shops', 'supermarket', 'amenities'] },
  { id: 'unfurnished', label: 'Unfurnished', icon: 'weekend', tag: 'unfurnished', test: (p) => p.furnishing === 'unfurnished', phrases: ['unfurnished'] },
  { id: 'furnished', label: 'Furnished', icon: 'chair', tag: 'furnished', test: (p) => p.furnishing === 'furnished' || p.furnishing === 'part_furnished', phrases: ['furnished'] },
  { id: 'garden', label: 'Garden', icon: 'yard', tag: 'garden', test: (p) => p.hasGarden || hasTag(p, 'garden'), phrases: ['outdoor space', 'garden', 'gardens', 'yard', 'patio', 'outside space'] },
  { id: 'balcony', label: 'Balcony / terrace', icon: 'balcony', test: tagTest('balcony', 'terrace'), phrases: ['balcony', 'terrace', 'roof terrace'] },
  { id: 'parking', label: 'Parking', icon: 'local_parking', tag: 'parking', test: tagTest('parking'), phrases: ['off street parking', 'parking', 'driveway', 'garage', 'car space'] },
  { id: 'pets', label: 'Pets considered', icon: 'pets', tag: 'pets', test: (p) => p.petsAllowed === true, phrases: ['pet friendly', 'pets allowed', 'pets', 'pet', 'dog', 'dogs', 'cat', 'cats'] },
  { id: 'billsIncluded', label: 'Bills included', icon: 'receipt_long', tag: 'billsIncluded', test: tagTest('billsIncluded'), phrases: ['bills included', 'all bills', 'including bills', 'inclusive', 'bills'] },
  { id: 'student', label: 'Student friendly', icon: 'backpack', tag: 'student', test: (p) => p.studentFriendly === true, phrases: ['student house', 'student', 'students'] },
  { id: 'sharers', label: 'Sharers welcome', icon: 'group', tag: 'sharers', test: (p) => p.sharersAccepted === true, phrases: ['house share', 'flat share', 'flatshare', 'houseshare', 'sharers', 'sharing', 'hmo', 'share'] },
  { id: 'homeOffice', label: 'Home office', icon: 'laptop_mac', tag: 'homeOffice', test: (p) => p.homeOffice === true, phrases: ['home office', 'work from home', 'wfh', 'study room', 'office'] },
  { id: 'lift', label: 'Lift', icon: 'elevator', tag: 'lift', test: (p) => p.hasLift === true, phrases: ['lift', 'elevator'] },
  { id: 'stepFree', label: 'Step-free', icon: 'accessible', tag: 'stepFree', test: (p) => p.stepFreeAccess === true || p.accessibleBathroom === true, phrases: ['step free', 'wheelchair', 'accessible', 'accessibility', 'ground floor'] },
  { id: 'newBuild', label: 'New build', icon: 'construction', tag: 'newBuild', test: (p) => p.newBuild === true, phrases: ['new build', 'newly built', 'off plan', 'brand new'] },
  { id: 'chainFree', label: 'Chain free', icon: 'link_off', tag: 'chainFree', test: (p) => p.chainFree === true, phrases: ['chain free', 'no chain', 'no onward chain'] },
  { id: 'freehold', label: 'Freehold', icon: 'verified', tag: 'freehold', test: tagTest('freehold'), phrases: ['freehold'] },
  { id: 'energyEfficient', label: 'Energy efficient', icon: 'bolt', tag: 'energyEfficient', test: (p) => p.epcRating <= 'C', phrases: ['energy efficient', 'eco', 'low bills', 'efficient', 'epc a', 'epc b', 'epc c'] },
  { id: 'spacious', label: 'Spacious', icon: 'open_in_full', tag: 'spacious', test: tagTest('spacious'), phrases: ['spacious', 'large', 'big', 'roomy'] },
  { id: 'family', label: 'Family friendly', icon: 'family_restroom', tag: 'family', test: (p) => hasTag(p, 'family') || (p.bedrooms >= 3 && hasTag(p, 'nearSchool')), phrases: ['family home', 'family', 'families', 'kids', 'children'] },
  { id: 'quiet', label: 'Quiet', icon: 'volume_off', tag: 'quiet', test: tagTest('quiet'), phrases: ['quiet', 'peaceful', 'calm'] },
  { id: 'lively', label: 'Lively area', icon: 'nightlife', tag: 'lively', test: tagTest('lively'), phrases: ['lively', 'nightlife', 'vibrant', 'buzzy', 'bars', 'restaurants'] },
  { id: 'noDeposit', label: 'No deposit', icon: 'savings', tag: 'noDeposit', test: (p) => p.depositWeeks === 0, phrases: ['no deposit', 'zero deposit', 'deposit free'] },
  { id: 'couples', label: 'Couples welcome', icon: 'favorite', tag: 'couples', test: (p) => p.couplesWelcome === true, phrases: ['couples', 'couple'] },
  { id: 'shortLet', label: 'Short let', icon: 'event', tag: 'shortLet', test: (p) => p.shortLetsAccepted === true, phrases: ['short let', 'short term', 'short lets'] },
  { id: 'goodValue', label: 'Good value', icon: 'trending_down', tag: 'goodValue', test: (p) => (getInsights(p).value?.diffPct ?? 0) <= -5, phrases: ['good value', 'affordable', 'cheap', 'bargain', 'budget', 'value'] },
  { id: 'bright', label: 'Bright', icon: 'wb_sunny', test: (p) => /bright|light/i.test(p.title), phrases: ['light filled', 'bright', 'sunny', 'light'] },
  { id: 'renovated', label: 'Renovated', icon: 'architecture', test: (p) => /renovated|modern/i.test(p.title) || p.newBuild === true, phrases: ['renovated', 'refurbished', 'modern'] },
];

const TYPE_WORDS: [string, PropertyType[], string][] = [
  ['townhouse', ['townhouse'], 'Townhouse'],
  ['terraced', ['townhouse', 'house'], 'House'],
  ['bungalow', ['house', 'villa'], 'House'],
  ['detached', ['house', 'villa'], 'House'],
  ['villa', ['villa'], 'Villa'],
  ['apartment', ['apartment'], 'Flat'],
  ['apartments', ['apartment'], 'Flat'],
  ['flat', ['apartment'], 'Flat'],
  ['flats', ['apartment'], 'Flat'],
  ['studio', ['apartment'], 'Studio'],
  ['house', ['house', 'townhouse', 'villa'], 'House'],
  ['houses', ['house', 'townhouse', 'villa'], 'House'],
  ['home', [], ''],
];

/** Words that carry no search meaning on their own once criteria are pulled out. */
const FILLER = new Set([
  'a', 'an', 'the', 'in', 'of', 'to', 'for', 'with', 'and', 'or', 'at', 'on', 'near', 'nearby', 'close', 'by', 'walking',
  'walk', 'distance', 'minutes', 'mins', 'min', 'within', 'around', 'area', 'looking', 'want', 'need', 'i', 'im', 'we',
  'my', 'our', 'is', 'that', 'has', 'have', 'some', 'good', 'nice', 'lovely', 'place', 'property', 'properties', 'home',
  'homes', 'somewhere', 'please', 'ideally', 'preferably', 'must', 'should', 'be', 'it', 'up', 'max', 'maximum', 'under',
  'below', 'less', 'than', 'over', 'above', 'from', 'between', 'pcm', 'pw', 'per', 'month', 'monthly', 'k', 'm', 'bed',
  'beds', 'bedroom', 'bedrooms', 'br', 'room', 'rooms', 'plus', 'at', 'least', 'minimum', 'min', 'rent', 'rental', 'let',
  'buy', 'sale', 'purchase', 'to', 'which', 'very', 'really', 'quite', 'also', 'location', 'located', 'uk', 'england',
  'city', 'centre', 'center', 'central', 'about', 'like', 'only', 'just', 'one', 'two', 'three', 'four', 'five', 'no',
]);

/** Neighbourhood names that are also everyday words; only matched together with their city. */
const GENERIC_HOODS = new Set(['the park', 'city centre', 'crown', 'avenues', 'new town', 'uplands', 'west end']);

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export interface Vocabulary {
  cities: readonly string[];
  /** neighbourhood → city (first city wins on duplicates such as "West End"). */
  neighborhoods: ReadonlyMap<string, { name: string; city: string; lat: number; lng: number }>;
  /** Normalised keyword corpus, to decide whether a leftover word means anything. */
  corpus: ReadonlySet<string>;
}

export function buildVocabulary(list: readonly Property[]): Vocabulary {
  const cities = [...new Set(list.map((p) => p.city))];
  const hoods = new Map<string, { name: string; city: string; lat: number; lng: number; n: number }>();
  const corpus = new Set<string>();
  for (const p of list) {
    const key = normalizeText(p.neighborhood);
    const h = hoods.get(key);
    if (!h) hoods.set(key, { name: p.neighborhood, city: p.city, lat: p.lat, lng: p.lng, n: 1 });
    else if (h.city === p.city) {
      h.lat = (h.lat * h.n + p.lat) / (h.n + 1);
      h.lng = (h.lng * h.n + p.lng) / (h.n + 1);
      h.n += 1;
    }
    for (const w of tokenize([p.title, p.description, ...getInsights(p).keywords].join(' '))) corpus.add(w);
  }
  return { cities, neighborhoods: hoods, corpus };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (phrase: string) => new RegExp(`(^|[^a-z0-9])${escape(phrase)}(?=$|[^a-z0-9])`);

function parseAmount(num: string, suffix: string | undefined): number {
  const n = parseFloat(num.replace(/,/g, ''));
  if (suffix === 'k') return Math.round(n * 1_000);
  if (suffix === 'm' || suffix === 'mil' || suffix === 'million') return Math.round(n * 1_000_000);
  return Math.round(n);
}

const fmt = (n: number) => (n >= 1_000_000 ? `£${+(n / 1_000_000).toFixed(2)}m` : n >= 10_000 ? `£${Math.round(n / 1000)}k` : `£${n.toLocaleString('en-GB')}`);

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

export function parseQuery(text: string, vocab: Vocabulary): ParsedQuery {
  // Work on a normalised copy; consumed phrases are blanked out so they are not read twice.
  let rest = ` ${normalizeText(text).replace(/(\d),(\d{3})/g, '$1$2').replace(/£/g, ' £').replace(/[,;!?]/g, ' ')} `;
  const consume = (re: RegExp) => {
    rest = rest.replace(re, ' ');
  };
  const hard: HardCriterion[] = [];
  const soft: Criterion[] = [];

  // Rent / buy.
  let period: Filters['pricePeriod'] = 'all';
  const rentRe = /\b(to rent|for rent|to let|renting|rental|rent|pcm|per month|a month|monthly)\b/;
  const buyRe = /\b(to buy|for sale|buy|buying|purchase|own|freehold home)\b/;
  const rentM = rest.match(rentRe);
  const buyM = rest.match(buyRe);
  if (rentM && !buyM) period = 'monthly';
  if (buyM && !rentM) period = 'total';

  // Price: "under £2,500", "below 450k", "between 300k and 400k", "£1500 pcm", "max 2k".
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  const num = '£?\\s?(\\d+(?:[.,]\\d+)?)\\s?(k|m|mil|million)?';
  const between = rest.match(new RegExp(`(?:between|from)\\s+${num}\\s+(?:and|to|-)\\s+${num}`));
  if (between) {
    minPrice = parseAmount(between[1], between[2]);
    maxPrice = parseAmount(between[3], between[4] ?? between[2]);
    consume(new RegExp(escape(between[0])));
  }
  const maxM = rest.match(new RegExp(`(?:under|below|less than|max(?:imum)?|up to|no more than|budget(?: of)?|<)\\s*${num}`));
  if (maxM) {
    maxPrice = parseAmount(maxM[1], maxM[2]);
    consume(new RegExp(escape(maxM[0])));
  }
  const minM = rest.match(new RegExp(`(?:over|above|more than|at least|from|min(?:imum)?|>)\\s*£\\s?(\\d+(?:[.,]\\d+)?)\\s?(k|m|mil|million)?`));
  if (minM) {
    minPrice = parseAmount(minM[1], minM[2]);
    consume(new RegExp(escape(minM[0])));
  }
  const bare = rest.match(/£\s?(\d+(?:[.,]\d+)?)\s?(k|m|mil|million)?/);
  if (bare && maxPrice === null && minPrice === null) {
    maxPrice = parseAmount(bare[1], bare[2]);
    consume(new RegExp(escape(bare[0])));
  }
  if (maxPrice !== null || minPrice !== null) {
    const ref = maxPrice ?? minPrice!;
    if (period === 'all') period = ref < 20_000 ? 'monthly' : 'total';
    const monthly = period === 'monthly';
    const label = minPrice !== null && maxPrice !== null ? `${fmt(minPrice)}–${fmt(maxPrice)}` : maxPrice !== null ? `Under ${fmt(maxPrice)}` : `Over ${fmt(minPrice!)}`;
    hard.push({
      label: `${label}${monthly ? ' pcm' : ''}`,
      icon: 'payments',
      phrase: '',
      patch: monthly ? { minMonthlyPrice: minPrice, maxMonthlyPrice: maxPrice } : { minSalePrice: minPrice, maxSalePrice: maxPrice },
    });
  }
  if (period !== 'all') {
    hard.unshift({ label: period === 'monthly' ? 'To rent' : 'For sale', icon: period === 'monthly' ? 'key' : 'sell', phrase: (rentM ?? buyM)?.[0] ?? '', patch: { pricePeriod: period } });
    consume(period === 'monthly' ? new RegExp(rentRe.source, 'g') : new RegExp(buyRe.source, 'g'));
  }

  // Bedrooms: "2 bed", "3-bedroom", "2+ beds", "at least 3 bedrooms", "studio".
  const bedM = rest.match(/(at least |min(?:imum)? )?\b(\d|one|two|three|four|five|six)\s*(\+)?\s*-?\s*(?:bed(?:room)?s?|br|b\/r)\b(\s*\+|\s*or more)?/);
  if (bedM) {
    const n = Math.min(5, /\d/.test(bedM[2]) ? Number(bedM[2]) : NUMBER_WORDS[bedM[2]]);
    const atLeast = Boolean(bedM[1] || bedM[3] || bedM[5]) || n >= 5;
    hard.push({ label: atLeast ? `${n}+ beds` : `${n} bed`, icon: 'bed', phrase: bedM[0].trim(), patch: { minBedrooms: n, maxBedrooms: atLeast ? null : n } });
    consume(new RegExp(escape(bedM[0])));
  } else if (/\bstudio\b/.test(rest)) {
    hard.push({ label: 'Studio', icon: 'bed', phrase: 'studio', patch: { minBedrooms: null, maxBedrooms: 0 } });
    consume(/\bstudio\b/);
  }

  // City first (so a neighbourhood name shared by two cities picks the right one), then neighbourhood.
  let city: string | null = null;
  for (const c of [...vocab.cities].sort((a, b) => b.length - a.length)) {
    if (phraseRe(normalizeText(c)).test(rest)) {
      city = c;
      break;
    }
  }
  if (!city) {
    // Typo tolerance for single-word city names ("manchster", "edinburh").
    for (const w of rest.split(/\s+/).filter((x) => x.length >= 5)) {
      const hit = vocab.cities.find((c) => !c.includes(' ') && matchWord(w, normalizeText(c)) === 'fuzzy');
      if (hit) {
        city = hit;
        consume(phraseRe(w));
        break;
      }
    }
  }
  const hoods = [...vocab.neighborhoods.entries()]
    .filter(([key, h]) => !GENERIC_HOODS.has(key) || (city !== null && h.city === city))
    .sort((a, b) => Number(b[1].city === city) - Number(a[1].city === city) || b[0].length - a[0].length);
  for (const [key, h] of hoods) {
    if (key.length > 2 && phraseRe(key).test(rest)) {
      city = h.city;
      const centre = { lat: h.lat, lng: h.lng };
      soft.push({
        id: `hood:${key}`,
        label: `${h.name} & nearby`,
        icon: 'location_on',
        kind: 'place',
        phrase: h.name,
        weight: 2.2,
        test: (p) => p.city === h.city && (p.neighborhood === h.name || distanceKm(p, centre) <= 2.2),
        evidence: (p) => (p.neighborhood === h.name ? `In ${h.name}` : `${distanceKm(p, centre).toFixed(1)} km from ${h.name}`),
      });
      consume(new RegExp(phraseRe(key).source, 'g'));
      break;
    }
  }
  if (city) consume(new RegExp(phraseRe(normalizeText(city)).source, 'g'));
  if (city) hard.push({ label: city, icon: 'location_city', phrase: city, patch: { city } });

  // Features.
  for (const f of FEATURES) {
    for (const phrase of f.phrases) {
      const re = phraseRe(phrase);
      if (re.test(rest)) {
        if (!soft.some((s) => s.id === f.id)) {
          soft.push({
            id: f.id,
            label: f.label,
            icon: f.icon,
            kind: 'feature',
            phrase,
            weight: f.weight ?? 1,
            test: f.test,
            evidence: f.tag ? (p) => tagLabel(p, f.tag!) : undefined,
          });
        }
        consume(new RegExp(re.source, 'g'));
      }
    }
  }
  // Home type.
  for (const [word, types, label] of TYPE_WORDS) {
    if (phraseRe(word).test(rest)) {
      if (types.length) hard.push({ label, icon: types[0] === 'apartment' ? 'apartment' : 'house', phrase: word, patch: { types } });
      consume(new RegExp(phraseRe(word).source, 'g'));
      break;
    }
  }


  // Leftover words: keywords if they mean something in the data, otherwise ignored.
  const ignored: string[] = [];
  for (const w of tokenize(rest)) {
    if (FILLER.has(w) || /^\d+$/.test(w) || w.length < 3) continue;
    const known = [...vocab.corpus].some((c) => matchWord(w, c) === 'exact' || matchWord(w, c) === 'prefix');
    if (!known) {
      ignored.push(w);
      continue;
    }
    soft.push({
      id: `kw:${w}`,
      label: `“${w}”`,
      icon: 'search',
      kind: 'keyword',
      phrase: w,
      weight: 0.8,
      test: (p) => {
        const words = tokenize([p.title, p.neighborhood, p.city, p.description, ...getInsights(p).keywords].join(' '));
        return words.some((x) => {
          const m = matchWord(w, x);
          return m === 'exact' || m === 'prefix';
        });
      },
    });
  }

  const filters = Object.assign({}, ...hard.map((h) => h.patch)) as Partial<Filters>;
  return { text, hard, filters, soft, ignored };
}

// ---------------------------------------------------------------------------
// Ranking and explanations
// ---------------------------------------------------------------------------

export interface RankedResult {
  property: Property;
  /** 0–1 share of soft criteria (by weight) the listing meets; 1 when there are none. */
  score: number;
  matched: Criterion[];
  missing: Criterion[];
}

/**
 * Ranks listings that already passed the hard filters.
 * `boost` (0–1, e.g. from the personal profile) breaks ties between equally good matches.
 */
export function rankResults(list: readonly Property[], soft: readonly Criterion[], boost?: (p: Property) => number): RankedResult[] {
  const total = soft.reduce((s, c) => s + c.weight, 0);
  return list
    .map((property) => {
      const matched = soft.filter((c) => c.test(property));
      const missing = soft.filter((c) => !matched.includes(c));
      const score = total === 0 ? 1 : matched.reduce((s, c) => s + c.weight, 0) / total;
      return { property, score, matched, missing };
    })
    .sort((a, b) => {
      const diff = b.score - a.score;
      if (Math.abs(diff) > 1e-9) return diff;
      const pa = (boost?.(a.property) ?? 0) * 100 + getInsights(a.property).popularity.cityPercentile / 100;
      const pb = (boost?.(b.property) ?? 0) * 100 + getInsights(b.property).popularity.cityPercentile / 100;
      return pb - pa;
    });
}

/** One-sentence "Why it matched" for a ranked result. */
export function explainMatch(r: RankedResult, hard: readonly HardCriterion[]): string {
  const bits = r.matched.map((c) => c.evidence?.(r.property) ?? c.label);
  const asked = r.matched.length + r.missing.length;
  if (asked === 0) {
    return hard.length ? `Meets your criteria (${hard.map((h) => h.label).join(', ')}). ${getInsights(r.property).summary}` : getInsights(r.property).summary;
  }
  const head = `${bits.join(' · ')}`;
  const tail = r.missing.length === 0 ? (asked === 1 ? '— exactly what you asked for.' : `— matches all ${asked} things you asked for.`) : `— matches ${r.matched.length} of ${asked}; no ${r.missing.map((m) => m.label.toLowerCase()).join(', ')}.`;
  return `${head} ${tail}`.trim();
}

// ---------------------------------------------------------------------------
// Relaxations for empty / thin results
// ---------------------------------------------------------------------------

export interface Relaxation {
  title: string;
  description: string;
  icon: string;
  /** New query text and filter patch that applies the relaxation. */
  query: string;
  patch: Partial<Filters>;
  count: number;
}

const removePhrase = (text: string, phrase: string) =>
  phrase ? text.replace(new RegExp(`\\s*\\b${escape(phrase)}\\b`, 'i'), '').replace(/\s{2,}/g, ' ').trim() : text;

export function removeCriterionFromQuery(text: string, c: { phrase: string }): string {
  return removePhrase(text, c.phrase);
}

/**
 * Suggests dropping one criterion at a time and counts the full matches each would give.
 * `count(patch, soft)` returns the number of full matches for a filter patch and soft list.
 */
export function suggestRelaxations(
  parsed: ParsedQuery,
  filters: Filters,
  count: (filters: Filters, soft: readonly Criterion[]) => number,
): Relaxation[] {
  const out: Relaxation[] = [];
  for (const c of parsed.soft) {
    const soft = parsed.soft.filter((x) => x !== c);
    out.push({
      title: `Drop “${c.label}”`,
      description: `Keep everything else and see homes without this.`,
      icon: 'close',
      query: removeCriterionFromQuery(parsed.text, c),
      patch: {},
      count: count(filters, soft),
    });
  }
  const reset = (keys: (keyof Filters)[]) => Object.fromEntries(keys.map((k) => [k, DEFAULT_FILTERS[k]])) as Partial<Filters>;
  const tries: [string, string, string, Partial<Filters>][] = [
    ['Widen the location', 'Search all UK cities, not just this one.', 'near_me', reset(['city'])],
    ['Flex the bedrooms', 'Include one bedroom fewer or more.', 'bed', {
      minBedrooms: filters.minBedrooms !== null ? Math.max(0, filters.minBedrooms - 1) || null : null,
      maxBedrooms: filters.maxBedrooms !== null ? filters.maxBedrooms + 1 : null,
    }],
    ['Stretch the budget by 15%', 'Small budget increases often unlock more homes.', 'payments', {
      maxMonthlyPrice: filters.maxMonthlyPrice !== null ? Math.round(filters.maxMonthlyPrice * 1.15) : null,
      maxSalePrice: filters.maxSalePrice !== null ? Math.round(filters.maxSalePrice * 1.15) : null,
    }],
    ['Any home type', 'Flats, houses and townhouses.', 'home_work', reset(['types'])],
  ];
  const active: Record<string, boolean> = {
    'Widen the location': filters.city !== 'all',
    'Flex the bedrooms': filters.minBedrooms !== null || filters.maxBedrooms !== null,
    'Stretch the budget by 15%': filters.maxMonthlyPrice !== null || filters.maxSalePrice !== null,
    'Any home type': filters.types.length > 0,
  };
  for (const [title, description, icon, patch] of tries) {
    if (!active[title]) continue;
    out.push({ title, description, icon, query: parsed.text, patch, count: count({ ...filters, ...patch }, parsed.soft) });
  }
  return out.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
}
