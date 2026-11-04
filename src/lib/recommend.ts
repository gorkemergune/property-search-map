import { formatAmount } from './format';
import { getInsights, homeNoun, type TagKey } from './insights';
import type { Property, PricePeriod, PropertyType } from '../types/property';

/**
 * Personal recommendations, computed in the browser from what the visitor did
 * on this device only (saved homes, viewed homes, recent searches). Nothing is
 * sent anywhere.
 *
 * 1. `buildProfile` turns those signals into weighted preferences
 *    (saved ×3, viewed ×1): cities, rent/buy, bedrooms, price band, home type,
 *    tags (near Tube, garden, student …) and locations.
 * 2. `commonTraits` lists what most saved homes share, in plain words.
 * 3. `recommend` scores every other listing against the profile and returns
 *    the best with the reasons that drove the score.
 */

export interface Signals {
  saved: readonly Property[];
  viewed: readonly Property[];
}

interface Weighted<T> {
  value: T;
  weight: number;
}

export interface Profile {
  /** Total signal weight; 0 = no history yet. */
  strength: number;
  cities: Weighted<string>[];
  periods: Weighted<PricePeriod>[];
  types: Weighted<PropertyType>[];
  bedrooms: Weighted<number>[];
  tags: Weighted<TagKey>[];
  /** Median price per period. */
  price: Partial<Record<PricePeriod, number>>;
  /** Locations of saved homes, for "near your saved home in …". */
  anchors: Property[];
  seen: ReadonlySet<string>;
}

function tally<T>(items: { value: T; weight: number }[]): Weighted<T>[] {
  const m = new Map<T, number>();
  for (const { value, weight } of items) m.set(value, (m.get(value) ?? 0) + weight);
  return [...m.entries()].map(([value, weight]) => ({ value, weight })).sort((a, b) => b.weight - a.weight);
}

/** Plain trait names for tags (tag labels carry minutes, e.g. "Tube 4 min"). */
export const TAG_TRAIT: Partial<Record<TagKey, string>> = {
  nearTransit: 'Near Tube / station', nearSchool: 'Near a school', goodSchool: 'Outstanding school nearby', nearHospital: 'Near a hospital',
  nearGp: 'GP nearby', nearPark: 'Near a park', nearUni: 'Near university', nearShops: 'Shops nearby', garden: 'Garden', balcony: 'Balcony',
  terrace: 'Terrace', parking: 'Parking', pets: 'Pets considered', furnished: 'Furnished', unfurnished: 'Unfurnished', billsIncluded: 'Bills included',
  student: 'Student friendly', sharers: 'Sharers welcome', homeOffice: 'Home office', lift: 'Lift', stepFree: 'Step-free', newBuild: 'New build',
  chainFree: 'Chain free', freehold: 'Freehold', energyEfficient: 'Energy efficient (EPC A–C)', spacious: 'Spacious', family: 'Family home',
  quiet: 'Quiet street', lively: 'Lively area', noDeposit: 'No deposit', couples: 'Couples welcome', shortLet: 'Short lets', goodValue: 'Good value',
};

const median = (xs: number[]) => {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function buildProfile({ saved, viewed }: Signals): Profile {
  const savedIds = new Set(saved.map((p) => p.id));
  const weighted = [
    ...saved.map((p) => ({ p, w: 3 })),
    ...viewed.filter((p) => !savedIds.has(p.id)).map((p) => ({ p, w: 1 })),
  ];
  const strength = weighted.reduce((s, x) => s + x.w, 0);
  const priceFor = (period: PricePeriod) => median(weighted.filter((x) => x.p.pricePeriod === period).map((x) => x.p.price));
  return {
    strength,
    cities: tally(weighted.map(({ p, w }) => ({ value: p.city, weight: w }))),
    periods: tally(weighted.map(({ p, w }) => ({ value: p.pricePeriod, weight: w }))),
    types: tally(weighted.map(({ p, w }) => ({ value: p.type, weight: w }))),
    bedrooms: tally(weighted.map(({ p, w }) => ({ value: p.bedrooms, weight: w }))),
    tags: tally(weighted.flatMap(({ p, w }) => getInsights(p).tags.map((t) => ({ value: t.key, weight: w })))),
    price: { total: priceFor('total'), monthly: priceFor('monthly') },
    anchors: saved.length ? [...saved] : viewed.slice(0, 5),
    seen: new Set([...saved, ...viewed].map((p) => p.id)),
  };
}

const share = <T>(list: Weighted<T>[], value: T, strength: number) => (strength ? (list.find((x) => x.value === value)?.weight ?? 0) / strength : 0);

const km = (a: Property, b: Property) => {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

export interface Recommendation {
  property: Property;
  /** 0–1. */
  score: number;
  reasons: string[];
}

/** 0–1 affinity of one listing to the profile; also used to break ties in search results. */
export function affinity(p: Property, profile: Profile): { score: number; reasons: string[] } {
  if (profile.strength === 0) return { score: 0, reasons: [] };
  const s = profile.strength;
  const reasons: string[] = [];
  let score = 0;

  const period = share(profile.periods, p.pricePeriod, s);
  score += period * 0.22;

  const city = share(profile.cities, p.city, s);
  score += city * 0.18;

  const beds = profile.bedrooms.reduce((acc, b) => acc + (b.weight / s) * Math.max(0, 1 - Math.abs(b.value - p.bedrooms) * 0.5), 0);
  score += beds * 0.14;
  if (beds >= 0.6) reasons.push(`${p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} bedrooms`}, like most homes you saved`);

  score += share(profile.types, p.type, s) * 0.06;

  const ref = profile.price[p.pricePeriod];
  if (ref) {
    const ratio = p.price / ref;
    const closeness = Math.max(0, 1 - Math.abs(Math.log(ratio)) * 2.2);
    score += closeness * 0.16;
    if (closeness >= 0.7) reasons.push(`Similar price to your picks (${formatAmount(p.price, p.currency)} vs ~${formatAmount(Math.round(ref / 25) * 25, p.currency)})`);
    else if (ratio < 0.85 && closeness > 0.3) reasons.push(`Cheaper than your usual picks`);
  }

  const tags = getInsights(p).tags;
  const liked = profile.tags.filter((t) => t.weight / s >= 0.5);
  const hit = liked.filter((t) => tags.some((x) => x.key === t.value));
  score += (liked.length ? hit.length / liked.length : 0) * 0.16;
  if (hit.length) {
    const labels = hit.slice(0, 3).map((h) => TAG_TRAIT[h.value] ?? h.value);
    reasons.push(`Has what you keep choosing: ${labels.join(', ')}`);
  }

  const nearest = profile.anchors
    .filter((a) => a.id !== p.id && a.city === p.city)
    .map((a) => ({ a, d: km(a, p) }))
    .sort((x, y) => x.d - y.d)[0];
  if (nearest && nearest.d <= 2.5) {
    score += (1 - nearest.d / 2.5) * 0.08;
    reasons.unshift(nearest.a.neighborhood === p.neighborhood ? `Same area as a home you liked in ${p.neighborhood}` : `${nearest.d.toFixed(1)} km from your saved home in ${nearest.a.neighborhood}`);
  } else if (city >= 0.5) {
    reasons.push(`In ${p.city}, where you've been looking`);
  }

  return { score: Math.min(1, score), reasons: reasons.slice(0, 3) };
}

export function recommend(all: readonly Property[], profile: Profile, limit = 6, exclude: ReadonlySet<string> = new Set()): Recommendation[] {
  if (profile.strength === 0) return [];
  return all
    .filter((p) => p.status === 'available' && !profile.seen.has(p.id) && !exclude.has(p.id))
    .map((p) => ({ property: p, ...affinity(p, profile) }))
    .filter((r) => r.score > 0.35)
    .sort((a, b) => b.score - a.score || getInsights(b.property).popularity.cityPercentile - getInsights(a.property).popularity.cityPercentile)
    .slice(0, limit);
}

/** Homes most like one listing ("Similar homes"), by the same scoring with that listing as the only signal. */
export function similarTo(p: Property, all: readonly Property[], limit = 4): Recommendation[] {
  return recommend(all, buildProfile({ saved: [p], viewed: [] }), limit);
}

// ---------------------------------------------------------------------------
// Common traits of the basket
// ---------------------------------------------------------------------------

export interface Trait {
  label: string;
  icon: string;
  /** How many of the saved homes share it. */
  count: number;
  total: number;
  /** Search sentence fragment, so a trait can seed "Find more like this". */
  phrase: string;
}

/** Traits shared by at least ~60% of saved homes (min. 2), strongest first. */
export function commonTraits(saved: readonly Property[]): Trait[] {
  const n = saved.length;
  if (n < 2) return [];
  const need = Math.max(2, Math.ceil(n * 0.6));
  const out: Trait[] = [];
  const add = (label: string, icon: string, count: number, phrase: string) => {
    if (count >= need) out.push({ label, icon, count, total: n, phrase });
  };
  const top = <T>(values: T[]) => tally(values.map((value) => ({ value, weight: 1 })))[0];

  const city = top(saved.map((p) => p.city));
  add(`In ${city.value}`, 'location_city', city.weight, `in ${city.value}`);
  const hood = top(saved.map((p) => p.neighborhood));
  if (hood.value !== city.value) add(`Around ${hood.value}`, 'location_on', hood.weight, `near ${hood.value}`);
  const period = top(saved.map((p) => p.pricePeriod));
  add(period.value === 'monthly' ? 'To rent' : 'For sale', period.value === 'monthly' ? 'key' : 'sell', period.weight, period.value === 'monthly' ? 'to rent' : 'to buy');
  const beds = top(saved.map((p) => p.bedrooms));
  add(beds.value === 0 ? 'Studios' : `${beds.value} bedrooms`, 'bed', beds.weight, beds.value === 0 ? 'studio' : `${beds.value} bed`);
  const type = top(saved.map((p) => homeNoun({ bedrooms: 1, type: p.type }).replace('1-bed ', '')));
  add(`${type.value[0].toUpperCase()}${type.value.slice(1)}s`, 'home', type.weight, type.value);

  const tagCounts = tally(saved.flatMap((p) => getInsights(p).tags.map((t) => ({ value: t.key, weight: 1 }))));
  const PHRASE: Partial<Record<TagKey, string>> = {
    nearTransit: 'near the tube', nearSchool: 'near a school', goodSchool: 'outstanding school', nearHospital: 'near a hospital',
    nearPark: 'near a park', nearUni: 'near university', garden: 'with a garden', parking: 'with parking', pets: 'pets allowed',
    furnished: 'furnished', billsIncluded: 'bills included', student: 'student', sharers: 'house share', homeOffice: 'home office',
    energyEfficient: 'energy efficient', family: 'family home', quiet: 'quiet', lively: 'lively area', goodValue: 'good value',
    chainFree: 'chain free', newBuild: 'new build', spacious: 'spacious', balcony: 'balcony',
  };
  for (const t of tagCounts) {
    const phrase = PHRASE[t.value];
    if (!phrase) continue;
    const sample = saved.map((p) => getInsights(p).tags.find((x) => x.key === t.value)).find(Boolean)!;
    add(TAG_TRAIT[t.value] ?? sample.label, sample.icon, t.weight, phrase);
  }

  const prices = saved.filter((p) => p.pricePeriod === period.value).map((p) => p.price);
  if (prices.length >= need) {
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const cur = saved[0].currency;
    out.push({
      label: `${formatAmount(lo, cur)}–${formatAmount(hi, cur)}${period.value === 'monthly' ? ' pcm' : ''}`,
      icon: 'payments',
      count: prices.length,
      total: n,
      phrase: `under £${Math.round((hi * 1.1) / (period.value === 'monthly' ? 50 : 5000)) * (period.value === 'monthly' ? 50 : 5000)}`,
    });
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 7);
}

/** A search sentence built from the basket's traits, for "Find more like these". */
export function traitsToQuery(traits: readonly Trait[]): string {
  const order = ['bed', 'home', 'key', 'sell', 'location_city', 'location_on'];
  const head = traits.filter((t) => order.includes(t.icon)).sort((a, b) => order.indexOf(a.icon) - order.indexOf(b.icon));
  const tail = traits.filter((t) => !order.includes(t.icon));
  return [...head, ...tail].map((t) => t.phrase).join(' ').replace(/\s+/g, ' ').trim();
}
