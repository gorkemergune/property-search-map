import { DEMO_INTEREST, INTEREST_SOURCE, type AreaInterest } from '../data/interest';
import type { Filters } from './filters';
import type { Property } from '../types/property';

/** What the map shows: price markers only, or markers over one of two heat layers. */
export const MAP_MODES = ['homes', 'popular', 'density'] as const;
export type MapMode = (typeof MAP_MODES)[number];

/** One weighted point for a heat layer; `weight` is 0–1. */
export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
}

/**
 * Listing density: one point per home in the current results, so the layer
 * always matches the list, the markers and the result count.
 */
export function densityPoints(results: readonly Property[]): HeatPoint[] {
  return results.map((p) => ({ lat: p.lat, lng: p.lng, weight: 1 }));
}

/**
 * Popular areas: one point per neighbourhood, weighted by (demo) interest for
 * the chosen Buy/Rent context and limited to the chosen city. Positions are the
 * centre of that neighbourhood's listings, so no coordinates are invented.
 */
export function interestPoints(
  all: readonly Property[],
  f: Pick<Filters, 'city' | 'pricePeriod'>,
  interest: readonly AreaInterest[] = DEMO_INTEREST,
): { source: typeof INTEREST_SOURCE; points: HeatPoint[] } {
  const centres = new Map<string, { lat: number; lng: number; n: number }>();
  for (const p of all) {
    const key = `${p.city}|${p.neighborhood}`;
    const c = centres.get(key) ?? { lat: 0, lng: 0, n: 0 };
    centres.set(key, { lat: c.lat + p.lat, lng: c.lng + p.lng, n: c.n + 1 });
  }
  const points: HeatPoint[] = [];
  for (const area of interest) {
    if (f.city !== 'all' && area.city !== f.city) continue;
    const c = centres.get(`${area.city}|${area.neighborhood}`);
    if (!c) continue;
    const score = f.pricePeriod === 'total' ? area.buy : f.pricePeriod === 'monthly' ? area.rent : (area.buy + area.rent) / 2;
    points.push({ lat: c.lat / c.n, lng: c.lng / c.n, weight: score / 100 });
  }
  return { source: INTEREST_SOURCE, points };
}
