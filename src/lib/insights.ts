import { formatAmount } from './format';
import type { Property } from '../types/property';

/**
 * Listing insights: keyword tags, nearby amenities, popularity, area scores,
 * community voices and a keyword summary.
 *
 * Everything here is derived deterministically from the listing and the
 * dataset, so it is the same on every build and needs no network:
 * - Facts recorded on the listing (garden, pets, bills, EPC …) become tags as-is.
 * - Value ("8% below similar homes in Hackney") is computed from the real dataset.
 * - Walking times, school ratings, popularity counts and community comments are
 *   DEMO ESTIMATES, seeded per neighbourhood so neighbours agree with each other.
 *   They are labelled as estimates in the UI and are replaced by live data
 *   (HomeData schools, OpenStreetMap stations/hospitals) in the detail view
 *   when a live source answers. See `src/lib/live/`.
 */

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable pseudo-random number in [0, 1) for a key. */
export function rand(key: string): number {
  return (hash(key) % 100_000) / 100_000;
}

const between = (key: string, min: number, max: number) => Math.round(min + rand(key) * (max - min));

// ---------------------------------------------------------------------------
// Transport naming per city
// ---------------------------------------------------------------------------

/** What locals call the rapid-transit network; cities without one use rail. */
const TRANSIT: Record<string, { label: string; short: string }> = {
  London: { label: 'Tube station', short: 'Tube' },
  Manchester: { label: 'Metrolink stop', short: 'Metrolink' },
  Newcastle: { label: 'Metro station', short: 'Metro' },
  Glasgow: { label: 'Subway station', short: 'Subway' },
  Liverpool: { label: 'Merseyrail station', short: 'Merseyrail' },
  Birmingham: { label: 'Tram / rail stop', short: 'Tram' },
  Sheffield: { label: 'Supertram stop', short: 'Tram' },
  Nottingham: { label: 'Tram stop', short: 'Tram' },
  Edinburgh: { label: 'Tram / rail stop', short: 'Tram' },
};
export const transitFor = (city: string) => TRANSIT[city] ?? { label: 'Train station', short: 'Station' };

/** Cities with a large university presence; student areas there sit close to campus. */
const UNIVERSITY_CITIES = new Set([
  'London', 'Manchester', 'Birmingham', 'Bristol', 'Edinburgh', 'Leeds', 'Liverpool', 'Newcastle', 'Nottingham',
  'Sheffield', 'Brighton', 'Oxford', 'Cambridge', 'Glasgow', 'Cardiff', 'York', 'Coventry', 'Leicester', 'Exeter',
  'Southampton', 'Aberdeen', 'Dundee', 'Swansea', 'Belfast', 'Norwich', 'Lincoln', 'Plymouth', 'Hull',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AmenityKind = 'transit' | 'primarySchool' | 'secondarySchool' | 'gp' | 'hospital' | 'park' | 'supermarket' | 'university';

export type SchoolRating = 'Outstanding' | 'Good' | 'Requires improvement';

export interface Amenity {
  kind: AmenityKind;
  label: string;
  /** Straight-line distance in metres. */
  meters: number;
  /** Walking minutes at ~80 m/min. */
  walkMin: number;
  /** England only (Ofsted). */
  rating?: SchoolRating;
}

export type TagKey =
  | 'nearTransit' | 'nearSchool' | 'goodSchool' | 'nearHospital' | 'nearGp' | 'nearPark' | 'nearUni' | 'nearShops'
  | 'garden' | 'balcony' | 'terrace' | 'parking' | 'pets' | 'furnished' | 'unfurnished' | 'billsIncluded'
  | 'student' | 'sharers' | 'homeOffice' | 'lift' | 'stepFree' | 'newBuild' | 'chainFree' | 'freehold'
  | 'energyEfficient' | 'spacious' | 'family' | 'quiet' | 'lively' | 'noDeposit' | 'couples' | 'shortLet' | 'goodValue';

export interface Tag {
  key: TagKey;
  label: string;
  /** Material Symbols icon name. */
  icon: string;
  /** Visual group: proximity tags (the ones UK buyers care about most) are highlighted. */
  tone: 'proximity' | 'feature' | 'area';
}

export interface AreaScores {
  transport: number;
  schools: number;
  green: number;
  amenities: number;
  quiet: number;
  nightlife: number;
}

export interface Popularity {
  viewsWeek: number;
  saves: number;
  enquiries: number;
  /** % change in views vs last week. */
  trend: number;
  level: 'High demand' | 'Popular' | 'Steady';
  /** Percentile within its city (0–100). */
  cityPercentile: number;
}

export interface Value {
  /** Price per m² compared to similar homes (same period) in the neighbourhood, or the city if too few. */
  diffPct: number;
  comparedTo: string;
  sample: number;
}

export interface CommunityVoice {
  author: string;
  meta: string;
  text: string;
  sentiment: 'positive' | 'mixed' | 'negative';
  topic: string;
}

export interface Insights {
  amenities: Amenity[];
  tags: Tag[];
  scores: AreaScores;
  popularity: Popularity;
  value: Value | null;
  voices: CommunityVoice[];
  /** Plain-text words this listing can be found by (tags, places, type …). */
  keywords: string[];
  /** 2–3 sentence summary built from the keywords. */
  summary: string;
  /** Short reasons someone would choose this home/area. */
  whyHere: string[];
}

// ---------------------------------------------------------------------------
// Amenities and area scores (seeded per neighbourhood)
// ---------------------------------------------------------------------------

function areaKey(p: Property) {
  return `${p.city}|${p.neighborhood}`;
}

function amenitiesFor(p: Property): Amenity[] {
  const area = areaKey(p);
  const own = p.id;
  const big = p.city === 'London';
  const transit = transitFor(p.city);
  const hasRapid = p.city in TRANSIT;
  // Area baseline + small per-listing variation, never below 1 minute.
  const walk = (kind: string, min: number, max: number, spread = 2) =>
    Math.max(1, between(`${area}:${kind}`, min, max) + between(`${own}:${kind}`, -spread, spread));
  const make = (kind: AmenityKind, label: string, walkMin: number, rating?: SchoolRating): Amenity => ({
    kind,
    label,
    walkMin,
    meters: walkMin * 80,
    ...(rating ? { rating } : {}),
  });

  const england = p.nation === 'england';
  const ratingFor = (salt: string): SchoolRating | undefined => {
    if (!england) return undefined;
    const r = rand(`${area}:${salt}:ofsted`);
    return r < 0.28 ? 'Outstanding' : r < 0.86 ? 'Good' : 'Requires improvement';
  };

  const list: Amenity[] = [
    make('transit', transit.label, big ? walk('transit', 3, 10) : hasRapid ? walk('transit', 4, 14) : walk('transit', 7, 20)),
    make('primarySchool', 'Primary school', walk('primary', 3, 12), ratingFor('primary')),
    make('secondarySchool', 'Secondary school', walk('secondary', 6, 20), ratingFor('secondary')),
    make('gp', 'GP surgery', walk('gp', 3, 12)),
    make('hospital', 'Hospital (A&E)', walk('hospital', big ? 10 : 12, big ? 28 : 40, 3)),
    make('park', 'Park or green space', walk('park', 2, 11)),
    make('supermarket', 'Supermarket', walk('shop', 2, 9)),
  ];
  if (UNIVERSITY_CITIES.has(p.city)) {
    const studentArea = p.studentFriendly === true || rand(`${area}:uni-area`) < 0.35;
    list.push(make('university', 'University campus', studentArea ? walk('uni', 4, 13) : walk('uni', 14, 35, 3)));
  }
  return list;
}

const clamp = (n: number) => Math.max(5, Math.min(98, Math.round(n)));
const fromWalk = (min: number, best: number, worst: number) => clamp(100 - ((min - best) / (worst - best)) * 90);

function scoresFor(p: Property, a: Amenity[]): AreaScores {
  const get = (k: AmenityKind) => a.find((x) => x.kind === k)?.walkMin ?? 30;
  const area = areaKey(p);
  const school = a.find((x) => x.kind === 'primarySchool');
  const schoolBonus = school?.rating === 'Outstanding' ? 12 : school?.rating === 'Requires improvement' ? -12 : 0;
  const nightlife = clamp(between(`${area}:night`, 20, 95) + (p.city === 'London' ? 8 : 0));
  return {
    transport: fromWalk(get('transit'), 2, 22),
    schools: clamp(fromWalk((get('primarySchool') + get('secondarySchool')) / 2, 3, 20) + schoolBonus),
    green: clamp(fromWalk(get('park'), 1, 12) + (p.hasGarden ? 5 : 0)),
    amenities: fromWalk((get('supermarket') + get('gp')) / 2, 2, 14),
    quiet: clamp(100 - nightlife * 0.7 + between(`${area}:quiet`, 0, 25)),
    nightlife,
  };
}

// ---------------------------------------------------------------------------
// Value against the dataset (real computation)
// ---------------------------------------------------------------------------

interface Bucket {
  perSqm: number[];
}
let valueIndex: Map<string, Bucket> | null = null;
let dataset: readonly Property[] = [];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function buildValueIndex(list: readonly Property[]) {
  const idx = new Map<string, Bucket>();
  const add = (key: string, v: number) => {
    const b = idx.get(key) ?? { perSqm: [] };
    b.perSqm.push(v);
    idx.set(key, b);
  };
  for (const p of list) {
    const v = p.price / p.areaSqm;
    add(`hood|${p.pricePeriod}|${p.city}|${p.neighborhood}`, v);
    add(`city|${p.pricePeriod}|${p.city}`, v);
  }
  return idx;
}

function valueFor(p: Property): Value | null {
  if (!valueIndex) return null;
  const v = p.price / p.areaSqm;
  const hood = valueIndex.get(`hood|${p.pricePeriod}|${p.city}|${p.neighborhood}`);
  const city = valueIndex.get(`city|${p.pricePeriod}|${p.city}`);
  const use = hood && hood.perSqm.length >= 4 ? { b: hood, name: p.neighborhood } : city && city.perSqm.length >= 3 ? { b: city, name: p.city } : null;
  if (!use) return null;
  const m = median(use.b.perSqm);
  return { diffPct: Math.round(((v - m) / m) * 100), comparedTo: use.name, sample: use.b.perSqm.length };
}

// ---------------------------------------------------------------------------
// Popularity (demo estimate, shaped by real signals: value, freshness, city)
// ---------------------------------------------------------------------------

const TODAY = Date.UTC(2026, 10, 4);

function rawPopularity(p: Property, value: Value | null, scores: AreaScores): number {
  const ageDays = Math.max(0, (TODAY - Date.parse(`${p.listedAt}T00:00:00Z`)) / 86_400_000);
  const fresh = Math.max(0.55, 1.4 - ageDays / 60);
  const cheap = value ? Math.max(0.6, Math.min(1.5, 1 - value.diffPct / 60)) : 1;
  const cityPull = p.city === 'London' ? 1.5 : ['Manchester', 'Bristol', 'Edinburgh', 'Brighton', 'Oxford', 'Cambridge'].includes(p.city) ? 1.2 : 1;
  const area = 0.8 + (scores.transport + scores.amenities) / 400;
  const status = p.status === 'available' ? 1 : 0.45;
  return 180 * fresh * cheap * cityPull * area * status * (0.75 + rand(`${p.id}:pop`) * 0.5);
}

let popularityRank: Map<string, number> | null = null;

function popularityFor(p: Property, value: Value | null, scores: AreaScores): Popularity {
  const raw = rawPopularity(p, value, scores);
  const viewsWeek = Math.round(raw);
  const saves = Math.round(viewsWeek * (0.05 + rand(`${p.id}:saves`) * 0.07));
  const enquiries = Math.max(0, Math.round(saves * (0.2 + rand(`${p.id}:enq`) * 0.3)));
  const trend = between(`${p.id}:trend`, -18, 42);
  const pct = popularityRank?.get(p.id) ?? 50;
  const level = pct >= 80 ? 'High demand' : pct >= 50 ? 'Popular' : 'Steady';
  return { viewsWeek, saves, enquiries, trend, level, cityPercentile: pct };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function tagsFor(p: Property, a: Amenity[], scores: AreaScores, value: Value | null): Tag[] {
  const tags: Tag[] = [];
  const add = (key: TagKey, label: string, icon: string, tone: Tag['tone'] = 'feature') => tags.push({ key, label, icon, tone });
  const am = (k: AmenityKind) => a.find((x) => x.kind === k);

  const transit = am('transit')!;
  if (transit.walkMin <= 8) add('nearTransit', `${transitFor(p.city).short} ${transit.walkMin} min`, 'directions_subway', 'proximity');
  const primary = am('primarySchool')!;
  const secondary = am('secondarySchool')!;
  const nearest = primary.walkMin <= secondary.walkMin ? primary : secondary;
  if (nearest.walkMin <= 7) add('nearSchool', `School ${nearest.walkMin} min`, 'school', 'proximity');
  if ([primary, secondary].some((s) => s.rating === 'Outstanding' && s.walkMin <= 15)) add('goodSchool', 'Outstanding school nearby', 'workspace_premium', 'proximity');
  const hospital = am('hospital')!;
  if (hospital.walkMin <= 18) add('nearHospital', `Hospital ${(hospital.meters / 1000).toFixed(1)} km`, 'local_hospital', 'proximity');
  const gp = am('gp')!;
  if (gp.walkMin <= 6) add('nearGp', `GP ${gp.walkMin} min`, 'medical_services', 'proximity');
  const park = am('park')!;
  if (park.walkMin <= 5) add('nearPark', `Park ${park.walkMin} min`, 'park', 'proximity');
  const uni = am('university');
  if (uni && uni.walkMin <= 12) add('nearUni', `Campus ${uni.walkMin} min`, 'school', 'proximity');
  if (am('supermarket')!.walkMin <= 4) add('nearShops', 'Shops on the doorstep', 'local_grocery_store', 'proximity');

  const outdoor = p.outdoorSpace;
  if (outdoor?.includes('private_garden') || outdoor?.includes('shared_garden') || (!outdoor && p.hasGarden)) add('garden', 'Garden', 'yard');
  if (outdoor?.includes('balcony')) add('balcony', 'Balcony', 'balcony');
  if (outdoor?.includes('terrace')) add('terrace', 'Terrace', 'deck');
  if (p.hasParking || p.parking?.some((x) => x !== 'permit')) add('parking', 'Parking', 'local_parking');
  if (p.petsAllowed === true) add('pets', 'Pets considered', 'pets');
  if (p.furnishing === 'furnished') add('furnished', 'Furnished', 'chair');
  if (p.furnishing === 'unfurnished') add('unfurnished', 'Unfurnished', 'weekend');
  if (p.includedBills && p.includedBills.length >= 2) add('billsIncluded', p.includedBills.length === 4 ? 'All bills included' : 'Bills included', 'receipt_long');
  if (p.studentFriendly) add('student', 'Student friendly', 'backpack');
  if (p.sharersAccepted) add('sharers', 'Sharers welcome', 'group');
  if (p.homeOffice) add('homeOffice', 'Home office', 'laptop_mac');
  if (p.hasLift) add('lift', 'Lift', 'elevator');
  if (p.stepFreeAccess) add('stepFree', 'Step-free access', 'accessible');
  if (p.newBuild) add('newBuild', p.offPlan ? 'Off-plan new build' : 'New build', 'construction');
  if (p.chainFree) add('chainFree', 'Chain free', 'link_off');
  if (p.tenure === 'freehold' || p.tenure === 'outright') add('freehold', p.tenure === 'outright' ? 'Owned outright' : 'Freehold', 'verified');
  if (p.epcRating <= 'C') add('energyEfficient', `EPC ${p.epcRating}`, 'bolt');
  if (p.depositWeeks === 0) add('noDeposit', 'No deposit', 'savings');
  if (p.couplesWelcome) add('couples', 'Couples welcome', 'favorite');
  if (p.shortLetsAccepted) add('shortLet', 'Short lets', 'event');

  const perBed = p.areaSqm / Math.max(1, p.bedrooms);
  if (perBed >= 44 || p.areaSqm >= 160) add('spacious', 'Spacious', 'open_in_full');
  if (p.bedrooms >= 3 && p.type !== 'apartment' && (scores.schools >= 60 || p.hasGarden)) add('family', 'Family home', 'family_restroom', 'area');
  if (scores.quiet >= 74) add('quiet', 'Quiet street', 'volume_off', 'area');
  if (scores.nightlife >= 78) add('lively', 'Lively area', 'nightlife', 'area');
  if (value && value.diffPct <= -8) add('goodValue', `${Math.abs(value.diffPct)}% below area avg`, 'trending_down', 'area');
  return tags;
}

// ---------------------------------------------------------------------------
// Community voices (DEMO: sample comments, not real posts)
// ---------------------------------------------------------------------------

const HANDLES = ['local_resident', 'commuter_jo', 'parent_of_two', 'flatshare_sam', 'dog_walker', 'new_to_the_area', 'cyclist_k', 'renter_since_19', 'homeowner_m', 'night_owl'];

function voicesFor(p: Property, scores: AreaScores, a: Amenity[]): CommunityVoice[] {
  const area = p.neighborhood;
  const key = areaKey(p);
  const transit = a.find((x) => x.kind === 'transit')!;
  const pool: CommunityVoice[] = [];
  const v = (topic: string, sentiment: CommunityVoice['sentiment'], text: string) =>
    pool.push({ topic, sentiment, text, author: '', meta: '' });

  if (scores.transport >= 70) v('Transport', 'positive', `Commuting from ${area} is easy — the ${transitFor(p.city).short.toLowerCase()} is a few minutes' walk and runs late.`);
  else if (scores.transport < 45) v('Transport', 'mixed', `You'll want a bike or a car in ${area}; the nearest ${transitFor(p.city).short.toLowerCase()} is about ${transit.walkMin} minutes on foot.`);
  if (scores.schools >= 72) v('Schools', 'positive', `We moved to ${area} for the schools and haven't regretted it. Catchment areas are tight though, check before you commit.`);
  else if (scores.schools < 45) v('Schools', 'mixed', `Good for couples and sharers; families tend to look a bit further out for schools.`);
  if (scores.green >= 70) v('Green space', 'positive', `The park is the best thing about living here — busy on sunny weekends but lovely in the mornings.`);
  if (scores.nightlife >= 75) v('Nightlife', 'mixed', `Great bars and restaurants, but Friday and Saturday nights can be noisy on the main roads.`);
  if (scores.quiet >= 70) v('Atmosphere', 'positive', `Very quiet residential streets. Neighbours actually say hello here.`);
  if (scores.amenities >= 70) v('Shops', 'positive', `Everything you need is walkable: supermarket, GP, pharmacy, a decent coffee place.`);
  if (p.pricePeriod === 'monthly') v('Renting', 'mixed', `Rentals in ${area} go fast — book viewings early in the week and have references ready.`);
  else v('Buying', 'mixed', `Prices in ${area} have held up well; well-presented homes don't sit on the market for long.`);
  if (pool.length < 3) v('General', 'positive', `${area} has a real community feel — independent shops and a weekend market.`);

  // Pick three, stable per neighbourhood, so neighbours share the same voices.
  const start = hash(key) % pool.length;
  const picked = [0, 1, 2].map((i) => pool[(start + i) % pool.length]).filter((x, i, arr) => arr.indexOf(x) === i);
  return picked.map((c, i) => ({
    ...c,
    author: HANDLES[(hash(`${key}:${i}`) + i) % HANDLES.length],
    meta: `${between(`${key}:${i}:yrs`, 1, 12)} yrs in ${area}`,
  }));
}

// ---------------------------------------------------------------------------
// Keyword summary ("AI summary" built from the keywords)
// ---------------------------------------------------------------------------

const TYPE_NOUN: Record<Property['type'], string> = { apartment: 'flat', house: 'house', townhouse: 'townhouse', villa: 'detached home' };

export function homeNoun(p: Pick<Property, 'bedrooms' | 'type'>): string {
  return p.bedrooms === 0 ? 'studio' : `${p.bedrooms}-bed ${TYPE_NOUN[p.type]}`;
}

function summaryFor(p: Property, tags: Tag[], a: Amenity[], value: Value | null, pop: Popularity): string {
  const has = (k: TagKey) => tags.some((t) => t.key === k);
  const am = (k: AmenityKind) => a.find((x) => x.kind === k)!;
  const near: string[] = [];
  const transit = am('transit');
  near.push(`${transit.walkMin} min to the ${transitFor(p.city).short === 'Station' ? 'station' : transitFor(p.city).short}`);
  const schools = [am('primarySchool'), am('secondarySchool')];
  const school = schools.find((x) => x.rating === 'Outstanding' && x.walkMin <= 15) ?? schools.sort((a, b) => a.walkMin - b.walkMin)[0];
  const level = school.kind === 'primarySchool' ? 'primary' : 'secondary';
  near.push(school.rating === 'Outstanding' ? `${school.walkMin} min to an Outstanding-rated ${level} school` : `${school.walkMin} min to a ${level} school`);
  if (has('nearHospital')) near.push(`${(am('hospital').meters / 1000).toFixed(1)} km to a hospital`);
  else if (has('nearPark')) near.push(`${am('park').walkMin} min to a park`);

  const furn = p.furnishing ? `${p.furnishing.replace('_', '-')} ` : '';
  const use = p.pricePeriod === 'monthly' ? 'to rent' : 'for sale';
  const first = `A ${furn}${homeNoun(p)} ${use} in ${p.neighborhood}, ${p.city} — ${near.join(', ')}.`;

  const features = tags.filter((t) => t.tone === 'feature').slice(0, 4).map((t) => t.label.toLowerCase());
  const second = features.length ? `Highlights: ${features.join(', ')}.` : '';

  let third = '';
  if (value) {
    const price = formatAmount(p.price, p.currency);
    if (value.diffPct <= -5) third = `At ${price} it is ${Math.abs(value.diffPct)}% below similar homes in ${value.comparedTo} per m²`;
    else if (value.diffPct >= 8) third = `At ${price} it is ${value.diffPct}% above similar homes in ${value.comparedTo} per m², reflecting its spec`;
    else third = `At ${price} it is priced in line with ${value.comparedTo}`;
    third += pop.level === 'High demand' ? ', and it is one of the most viewed listings in the city this week.' : '.';
  }
  return [first, second, third].filter(Boolean).join(' ');
}

function whyHereFor(p: Property, tags: Tag[], scores: AreaScores, value: Value | null, pop: Popularity): string[] {
  const out: string[] = [];
  const best = (Object.entries(scores) as [keyof AreaScores, number][]).filter(([k]) => k !== 'nightlife' || scores.nightlife >= 80).sort((a, b) => b[1] - a[1]);
  const label: Record<keyof AreaScores, string> = {
    transport: 'Excellent transport links',
    schools: 'Strong local schools',
    green: 'Plenty of green space',
    amenities: 'Shops & GP within a short walk',
    quiet: 'Calm, residential streets',
    nightlife: 'Buzzing food & nightlife scene',
  };
  for (const [k, s] of best.slice(0, 2)) if (s >= 60) out.push(`${label[k]} (${s}/100)`);
  if (value && value.diffPct <= -5) out.push(`Good value: ${Math.abs(value.diffPct)}% below ${value.comparedTo} average per m²`);
  if (pop.level === 'High demand') out.push(`In demand: top ${100 - pop.cityPercentile || 1}% most viewed in ${p.city}`);
  if (tags.some((t) => t.key === 'goodSchool')) out.push('Outstanding-rated school within walking distance');
  return out.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const cache = new Map<string, Insights>();

/** Registers the dataset used for value comparisons and popularity percentiles. Call once at start-up. */
export function primeInsights(list: readonly Property[]): void {
  if (dataset === list) return;
  dataset = list;
  cache.clear();
  valueIndex = buildValueIndex(list);
  popularityRank = null;
  // Percentile of raw popularity within each city.
  const byCity = new Map<string, { id: string; raw: number }[]>();
  for (const p of list) {
    const a = amenitiesFor(p);
    const s = scoresFor(p, a);
    const raw = rawPopularity(p, valueFor(p), s);
    byCity.set(p.city, [...(byCity.get(p.city) ?? []), { id: p.id, raw }]);
  }
  const rank = new Map<string, number>();
  for (const group of byCity.values()) {
    const sorted = [...group].sort((a, b) => a.raw - b.raw);
    sorted.forEach((x, i) => rank.set(x.id, sorted.length === 1 ? 50 : Math.round((i / (sorted.length - 1)) * 100)));
  }
  popularityRank = rank;
}

export function getInsights(p: Property): Insights {
  const hit = cache.get(p.id);
  if (hit) return hit;
  const amenities = amenitiesFor(p);
  const scores = scoresFor(p, amenities);
  const value = valueFor(p);
  const popularity = popularityFor(p, value, scores);
  const tags = tagsFor(p, amenities, scores, value);
  const voices = voicesFor(p, scores, amenities);
  const keywords = [
    ...tags.map((t) => t.label),
    ...tags.map((t) => t.key),
    p.neighborhood,
    p.city,
    homeNoun(p),
    p.type,
    p.pricePeriod === 'monthly' ? 'rent let rental' : 'sale buy',
  ];
  const insights: Insights = {
    amenities,
    tags,
    scores,
    popularity,
    value,
    voices,
    keywords,
    summary: summaryFor(p, tags, amenities, value, popularity),
    whyHere: whyHereFor(p, tags, scores, value, popularity),
  };
  cache.set(p.id, insights);
  return insights;
}

export const hasTag = (p: Property, key: TagKey) => getInsights(p).tags.some((t) => t.key === key);
