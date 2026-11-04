/**
 * Live, free data sources used by the listing detail view.
 *
 * - postcodes.io (free, no key, CORS): real postcode, ward and district for a point.
 * - OpenStreetMap Overpass API (free, no key, CORS): real named schools, hospitals,
 *   GP surgeries, stations and parks around a point.
 * - HomeData (homedata.co.uk, free developer key): schools with Ofsted ratings by postcode.
 *   The key must never ship in the browser bundle, so requests go through the
 *   dev-server proxy `/api/homedata` (see `vite.config.ts`), which adds the
 *   `Authorization: Api-Key …` header from the `HOMEDATA_API_KEY` env variable.
 *   In production the same path should point at a tiny serverless proxy.
 *
 * Every call is optional: on any failure the UI keeps the built-in estimates.
 */

export interface PostcodeInfo {
  postcode: string;
  ward: string | null;
  district: string | null;
}

export interface LivePlace {
  kind: 'transit' | 'school' | 'hospital' | 'gp' | 'park';
  name: string;
  meters: number;
  walkMin: number;
  /** Ofsted rating, when the source has one. */
  rating?: string;
}

export interface LiveNearby {
  postcode: PostcodeInfo | null;
  places: LivePlace[];
  sources: string[];
}

const TIMEOUT_MS = 9_000;

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const metersBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.round(Math.sqrt(x * x + y * y) * 6_371_000);
};

export async function fetchPostcode(lat: number, lng: number): Promise<PostcodeInfo | null> {
  type R = { result: { postcode: string; admin_ward: string | null; admin_district: string | null }[] | null };
  const data = await getJson<R>(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1&radius=500`);
  const hit = data.result?.[0];
  return hit ? { postcode: hit.postcode, ward: hit.admin_ward, district: hit.admin_district } : null;
}

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

export async function fetchOsmPlaces(lat: number, lng: number): Promise<LivePlace[]> {
  const q = `[out:json][timeout:20];(
    nwr["railway"="station"](around:1500,${lat},${lng});
    nwr["station"="subway"](around:1500,${lat},${lng});
    nwr["amenity"="school"](around:1500,${lat},${lng});
    nwr["amenity"="hospital"](around:3000,${lat},${lng});
    nwr["amenity"="doctors"](around:1200,${lat},${lng});
    nwr["leisure"="park"]["name"](around:1000,${lat},${lng});
  );out center tags 80;`;
  type El = { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
  let lastError: unknown = null;
  for (const url of OVERPASS) {
    try {
      const data = await getJson<{ elements: El[] }>(url, { method: 'POST', body: new URLSearchParams({ data: q }) });
      const here = { lat, lng };
      const places: LivePlace[] = [];
      for (const el of data.elements) {
        const pos = el.center ? { lat: el.center.lat, lng: el.center.lon } : el.lat !== undefined ? { lat: el.lat, lng: el.lon! } : null;
        const tags = el.tags ?? {};
        if (!pos || !tags.name) continue;
        const kind: LivePlace['kind'] | null =
          tags.railway === 'station' || tags.station === 'subway' ? 'transit'
          : tags.amenity === 'school' ? 'school'
          : tags.amenity === 'hospital' ? 'hospital'
          : tags.amenity === 'doctors' ? 'gp'
          : tags.leisure === 'park' ? 'park'
          : null;
        if (!kind) continue;
        const meters = metersBetween(here, pos);
        places.push({ kind, name: tags.name, meters, walkMin: Math.max(1, Math.round(meters / 80)) });
      }
      // Nearest three per kind, no duplicate names.
      const out: LivePlace[] = [];
      for (const kind of ['transit', 'school', 'hospital', 'gp', 'park'] as const) {
        const seen = new Set<string>();
        out.push(
          ...places
            .filter((p) => p.kind === kind)
            .sort((a, b) => a.meters - b.meters)
            .filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)))
            .slice(0, 3),
        );
      }
      return out;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('overpass unavailable');
}

/** True when the HomeData proxy is configured (`VITE_HOMEDATA_ENABLED=true` + `HOMEDATA_API_KEY`). */
export const homedataEnabled = import.meta.env.VITE_HOMEDATA_ENABLED === 'true';

export async function fetchHomedataSchools(postcode: string): Promise<LivePlace[]> {
  type R = { schools?: { name: string; distance_miles?: number; ofsted?: { rating?: string } }[] };
  const data = await getJson<R>(`/api/homedata/schools/nearby?postcode=${encodeURIComponent(postcode)}&radius_km=1.5`);
  return (data.schools ?? []).slice(0, 5).map((s) => {
    const meters = Math.round((s.distance_miles ?? 0) * 1609);
    return { kind: 'school', name: s.name, meters, walkMin: Math.max(1, Math.round(meters / 80)), rating: s.ofsted?.rating };
  });
}

const memo = new Map<string, Promise<LiveNearby>>();

/** Everything live for one point, fetched once per session. Never rejects. */
export function fetchLiveNearby(id: string, lat: number, lng: number): Promise<LiveNearby> {
  const hit = memo.get(id);
  if (hit) return hit;
  const run = (async (): Promise<LiveNearby> => {
    const sources: string[] = [];
    const [postcode, osm] = await Promise.all([
      fetchPostcode(lat, lng).then((r) => (sources.push('postcodes.io'), r)).catch(() => null),
      fetchOsmPlaces(lat, lng).then((r) => (sources.push('OpenStreetMap'), r)).catch(() => [] as LivePlace[]),
    ]);
    let places = osm;
    if (homedataEnabled && postcode) {
      const schools = await fetchHomedataSchools(postcode.postcode).catch(() => null);
      if (schools?.length) {
        sources.push('HomeData (Ofsted)');
        places = [...places.filter((p) => p.kind !== 'school'), ...schools];
      }
    }
    return { postcode, places, sources };
  })();
  memo.set(id, run);
  return run;
}
