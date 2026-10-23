/**
 * Administrative areas for the two map heat modes: point-in-polygon lookup,
 * listing counts per area and the colour scales. Pure functions, no Leaflet.
 *
 * Geometry comes from src/data/geo/ (built by scripts/build_geo.py from ONS
 * data). Positions are GeoJSON order: [lng, lat].
 */

export type Position = [number, number];
export type Geometry = { type: 'Polygon'; coordinates: Position[][] } | { type: 'MultiPolygon'; coordinates: Position[][][] };

export interface Feature<P> {
  type: 'Feature';
  properties: P;
  geometry: Geometry;
}
export interface FeatureCollection<P> {
  type: 'FeatureCollection';
  features: Feature<P>[];
}

/** Local authority district (council area in Scotland) with ONS mid-year population figures. */
export interface LadProps {
  code: string;
  name: string;
  population: number;
  areaKm2: number;
  /** People per km² of land (excluding inland water). */
  density: number | null;
}
export interface WardProps {
  code: string;
  name: string;
  /** Code of the local authority the ward belongs to. */
  lad: string;
}

export type LadCollection = FeatureCollection<LadProps>;
export type WardCollection = FeatureCollection<WardProps>;

export interface AreaSources {
  population: { title: string; publisher: string; year: string; published: string; url: string };
  lad: { title: string; publisher: string; url: string };
  wards: { title: string; publisher: string; url: string };
  licence: string;
}

type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

function polygonsOf(g: Geometry): Position[][][] {
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

export function bboxOf(g: Geometry): BBox {
  const box: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polygonsOf(g))
    for (const [lng, lat] of poly[0]) {
      if (lng < box[0]) box[0] = lng;
      if (lat < box[1]) box[1] = lat;
      if (lng > box[2]) box[2] = lng;
      if (lat > box[3]) box[3] = lat;
    }
  return box;
}

/** Even-odd ray casting; holes (inner rings) are excluded. */
function inRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function containsPoint(g: Geometry, lng: number, lat: number): boolean {
  return polygonsOf(g).some((poly) => inRing(lng, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lng, lat, hole)));
}

/** Area lookup with a bounding-box prefilter. */
export function createLocator<P extends { code: string }>(features: readonly Feature<P>[]) {
  const boxes = features.map((f) => bboxOf(f.geometry));
  return (lng: number, lat: number): Feature<P> | null => {
    for (let i = 0; i < features.length; i++) {
      const b = boxes[i];
      if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) continue;
      if (containsPoint(features[i].geometry, lng, lat)) return features[i];
    }
    return null;
  };
}

export interface AreaAssignment {
  /** Ward code, when the listing lies in a ward that is bundled. */
  ward: string | null;
  /** Local authority code; `null` only if the point is outside every boundary (e.g. offshore). */
  lad: string | null;
}

/**
 * Spatial join of listings to areas, done once per dataset. The ward lookup
 * (finer, 20 m generalised boundaries) decides the local authority when it
 * matches, through the ward's official LAD code; otherwise the coarser LAD
 * boundaries are searched directly.
 */
export function assignToAreas(
  listings: readonly { id: string; lat: number; lng: number }[],
  lads: LadCollection,
  wards: WardCollection | null,
): Map<string, AreaAssignment> {
  const findWard = wards ? createLocator(wards.features) : () => null;
  const findLad = createLocator(lads.features);
  const out = new Map<string, AreaAssignment>();
  for (const p of listings) {
    const ward = findWard(p.lng, p.lat);
    out.set(p.id, { ward: ward?.properties.code ?? null, lad: ward?.properties.lad ?? findLad(p.lng, p.lat)?.properties.code ?? null });
  }
  return out;
}

export interface AreaCounts {
  lad: Map<string, number>;
  ward: Map<string, number>;
  /** Results that fall outside every bundled boundary. Shown, never silently dropped. */
  unassigned: number;
}

/** Count of current results per area. Areas with no matching homes are absent (read as 0). */
export function countByArea(results: readonly { id: string }[], assignment: ReadonlyMap<string, AreaAssignment>): AreaCounts {
  const lad = new Map<string, number>();
  const ward = new Map<string, number>();
  let unassigned = 0;
  for (const p of results) {
    const a = assignment.get(p.id);
    if (!a?.lad) {
      unassigned++;
      continue;
    }
    lad.set(a.lad, (lad.get(a.lad) ?? 0) + 1);
    if (a.ward) ward.set(a.ward, (ward.get(a.ward) ?? 0) + 1);
  }
  return { lad, ward, unassigned };
}

// ---------------------------------------------------------------------------
// Colour scales
// ---------------------------------------------------------------------------

/**
 * Population density ramp, pale yellow → amber → orange → deep red-brown. The
 * scale is logarithmic because UK densities span three orders of magnitude
 * (≈8 people/km² in the Highlands, ≈17,000 in Islington).
 */
export const POPULATION_STOPS: readonly [number, string][] = [
  [0, '#fff7c2'],
  [0.25, '#fee38b'],
  [0.45, '#fec44f'],
  [0.62, '#fb9a29'],
  [0.78, '#e8661a'],
  [0.9, '#c2410c'],
  [1, '#7c2d12'],
];
export const POPULATION_DOMAIN: readonly [number, number] = [10, 15_000];
/** Tick values for the population legend. */
export const POPULATION_TICKS = [10, 100, 1_000, 10_000] as const;
/** Shown for an area without a density value. Tinted, so land never reads as blank. */
export const NO_DATA_COLOR = '#d9d4ca';

/** Position (0–1) of a density value on the log scale. */
export function populationScale(density: number): number {
  const [lo, hi] = POPULATION_DOMAIN;
  const t = (Math.log10(Math.max(density, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo));
  return Math.min(1, Math.max(0, t));
}

export function populationColor(density: number | null): string {
  return density === null || !Number.isFinite(density) ? NO_DATA_COLOR : rampColor(POPULATION_STOPS, populationScale(density));
}

function rampColor(stops: readonly [number, string][], t: number): string {
  for (let i = 1; i < stops.length; i++) {
    const [o1, c1] = stops[i];
    const [o0, c0] = stops[i - 1];
    if (t <= o1) return mix(c0, c1, (t - o0) / (o1 - o0 || 1));
  }
  return stops[stops.length - 1][1];
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Zero-count areas keep a pale tint, so "no homes here" is visible and differs from "no data". */
export const ZERO_COUNT_COLOR = '#e3f1ef';
const COUNT_COLORS = ['#a8ddd4', '#5cc0b5', '#1f9ea6', '#1a7aa0', '#1d4f91', '#172a6b'] as const;

export interface CountBin {
  min: number;
  max: number;
  color: string;
}

/**
 * Count classes 1, 2–3, 4–7, 8–15, … (doubling), trimmed to the current
 * maximum, so the legend only lists classes that can occur and a given count
 * keeps its colour while filters change.
 */
export function countBins(maxCount: number): CountBin[] {
  const bins: CountBin[] = [];
  for (let i = 0, min = 1; min <= maxCount && i < COUNT_COLORS.length; i++, min *= 2) {
    const last = i === COUNT_COLORS.length - 1;
    bins.push({ min, max: last ? maxCount : Math.min(min * 2 - 1, maxCount), color: COUNT_COLORS[i] });
  }
  return bins;
}

export function countColor(count: number): string {
  if (count <= 0) return ZERO_COUNT_COLOR;
  return COUNT_COLORS[Math.min(COUNT_COLORS.length - 1, Math.floor(Math.log2(count)))];
}

export const formatBin = (b: CountBin) => (b.min === b.max ? `${b.min}` : `${b.min}–${b.max}`);
