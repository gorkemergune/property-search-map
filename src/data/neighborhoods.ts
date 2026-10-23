/**
 * Approximate footprint of every neighbourhood that has listings: a centre and
 * a radius covering the residential core, plus "avoid" circles for parks,
 * commons, docks and rivers that fall inside it. Listing coordinates are
 * generated from these (see `spreadInFootprint`), so a neighbourhood's homes
 * spread across the area instead of stacking on one point, and never land in
 * open water or a park.
 *
 * Centres and radii are hand-picked approximations, not official boundaries.
 * Coastal and riverside areas use a centre set back from the water so the
 * whole circle stays on land.
 *
 * The 100 m avoid circles with five-decimal centres come from a one-off QA
 * pass (October 2026): every generated point was checked against the
 * OpenStreetMap map (water, parks, pitches, school fields, cemeteries, golf
 * courses, tenement back greens) and against the ONS full-resolution
 * coastline-clipped local authority boundaries, and a circle was added
 * wherever a point landed on one. If you move a centre or add listings to a
 * neighbourhood, its points move too, so re-check them.
 */

export interface Circle {
  lat: number;
  lng: number;
  radiusM: number;
}

export interface Footprint extends Circle {
  avoid?: readonly Circle[];
}

const c = (lat: number, lng: number, radiusM: number, avoid?: Circle[]): Footprint => ({ lat, lng, radiusM, avoid });
const no = (lat: number, lng: number, radiusM: number): Circle => ({ lat, lng, radiusM });

export const NEIGHBORHOOD_FOOTPRINTS: Readonly<Record<string, Readonly<Record<string, Footprint>>>> = {
  London: {
    Shoreditch: c(51.5265, -0.0795, 550),
    Hackney: c(51.547, -0.054, 650, [no(51.542, -0.0615, 230), no(51.5535, -0.0605, 230)]),
    Islington: c(51.544, -0.103, 550, [no(51.5505, -0.0985, 220), no(51.54791, -0.1026, 100)]),
    Angel: c(51.533, -0.106, 420),
    Clapham: c(51.465, -0.133, 550, [no(51.46, -0.147, 650)]),
    Camden: c(51.541, -0.14, 520, [no(51.5395, -0.1605, 320), no(51.5437, -0.14523, 100)]),
    Chelsea: c(51.489, -0.169, 480),
    Kensington: c(51.497, -0.193, 480, [no(51.5065, -0.185, 600), no(51.503, -0.204, 300)]),
    Mayfair: c(51.51, -0.148, 380, [no(51.504, -0.1425, 330)]),
    'Notting Hill': c(51.513, -0.202, 450, [no(51.51184, -0.20284, 100), no(51.51408, -0.20694, 100)]),
    Marylebone: c(51.5185, -0.152, 360),
    Westminster: c(51.496, -0.133, 320, [no(51.5025, -0.134, 300)]),
    Pimlico: c(51.491, -0.14, 360),
    Fulham: c(51.479, -0.2, 550),
    Battersea: c(51.47, -0.164, 550, [no(51.479, -0.157, 620), no(51.4667, -0.16437, 100)]),
    'Canary Wharf': c(51.5005, -0.019, 420),
    Brixton: c(51.462, -0.115, 520, [no(51.452, -0.108, 420)]),
    Peckham: c(51.471, -0.069, 520),
    Dulwich: c(51.45, -0.085, 580, [no(51.444, -0.078, 380), no(51.45121, -0.09, 100), no(51.44669, -0.08238, 100), no(51.44762, -0.09127, 100)]),
    Greenwich: c(51.479, -0.013, 400, [no(51.477, 0.0005, 480)]),
    Hampstead: c(51.555, -0.18, 450, [no(51.561, -0.163, 900)]),
    Walthamstow: c(51.583, -0.02, 650, [no(51.58014, -0.02527, 100)]),
    Wandsworth: c(51.456, -0.192, 500, [no(51.452, -0.195, 200), no(51.45609, -0.19548, 100)]),
    Wimbledon: c(51.422, -0.206, 600, [no(51.434, -0.214, 220)]),
    Richmond: c(51.462, -0.296, 450),
    Putney: c(51.46, -0.217, 500),
    Stratford: c(51.541, 0.002, 500, [no(51.543, -0.016, 600), no(51.53906, -0.00392, 100)]),
  },
  Manchester: {
    'Northern Quarter': c(53.484, -2.2355, 280),
    Ancoats: c(53.4845, -2.2265, 300),
    Didsbury: c(53.417, -2.231, 700, [no(53.412, -2.227, 250)]),
    Castlefield: c(53.4755, -2.2545, 250, [no(53.4746, -2.256, 90)]),
    Deansgate: c(53.4772, -2.2478, 210),
    Spinningfields: c(53.4805, -2.2515, 150),
    Chorlton: c(53.442, -2.277, 650),
    Fallowfield: c(53.443, -2.219, 550, [no(53.4475, -2.224, 250), no(53.44621, -2.2186, 100), no(53.44306, -2.21128, 100), no(53.44068, -2.22314, 100)]),
    'Salford Quays': c(53.471, -2.29, 180),
    // The built-up block around the piazza, clear of the Ship Canal and dock basins.
    MediaCityUK: c(53.4736, -2.2982, 120),
  },
  Birmingham: {
    'Jewellery Quarter': c(52.488, -1.911, 450, [no(52.492, -1.9145, 130), no(52.487, -1.915, 120), no(52.48795, -1.91374, 100)]),
    Edgbaston: c(52.465, -1.925, 800, [no(52.466, -1.929, 150), no(52.458, -1.919, 300), no(52.45915, -1.92635, 100)]),
    Harborne: c(52.46, -1.952, 600, [no(52.46172, -1.94961, 100)]),
    Digbeth: c(52.476, -1.883, 400, [no(52.47465, -1.8873, 100)]),
    Moseley: c(52.446, -1.887, 550),
    'Kings Heath': c(52.432, -1.893, 550, [no(52.433, -1.905, 250)]),
    Bournville: c(52.429, -1.932, 500, [no(52.43, -1.929, 180), no(52.42576, -1.93187, 100), no(52.4318, -1.928, 100)]),
    'Selly Oak': c(52.441, -1.937, 450, [no(52.43997, -1.93463, 100)]),
  },
  Bristol: {
    Clifton: c(51.46, -2.613, 550, [no(51.47, -2.62, 500)]),
    Redland: c(51.47, -2.6, 450),
    Bedminster: c(51.439, -2.601, 400),
    Southville: c(51.441, -2.611, 350),
    Easton: c(51.463, -2.565, 450),
    Montpelier: c(51.466, -2.586, 260, [no(51.47, -2.588, 150)]),
    Totterdown: c(51.439, -2.577, 320, [no(51.44048, -2.57313, 100), no(51.43725, -2.5778, 100)]),
    'Stokes Croft': c(51.4625, -2.59, 200),
  },
  Edinburgh: {
    'New Town': c(55.9575, -3.198, 380, [no(55.9548, -3.2, 100)]),
    Leith: c(55.9715, -3.174, 450, [no(55.97, -3.163, 250)]),
    Stockbridge: c(55.959, -3.2085, 300, [no(55.96011, -3.21191, 100)]),
    Marchmont: c(55.9358, -3.1925, 280, [no(55.9395, -3.19, 160), no(55.93655, -3.19535, 100), no(55.93365, -3.19091, 100), no(55.93473, -3.19617, 100)]),
    Morningside: c(55.928, -3.21, 500, [no(55.92439, -3.20688, 100)]),
    Bruntsfield: c(55.9372, -3.2105, 260, [no(55.94, -3.2, 300), no(55.93706, -3.20876, 100), no(55.93491, -3.21071, 100), no(55.93816, -3.21192, 100), no(55.93865, -3.20788, 100), no(55.93711, -3.2146, 100), no(55.93593, -3.20784, 100)]),
  },
  Leeds: {
    Headingley: c(53.82, -1.578, 550, [no(53.817, -1.582, 150)]),
    'City Centre': c(53.7985, -1.545, 400),
    'Hyde Park': c(53.811, -1.57, 350, [no(53.813, -1.563, 300), no(53.80988, -1.56909, 100), no(53.81039, -1.56513, 100)]),
    'Chapel Allerton': c(53.829, -1.537, 500),
    Roundhay: c(53.827, -1.504, 450, [no(53.841, -1.496, 650)]),
    Horsforth: c(53.84, -1.64, 700, [no(53.84241, -1.64229, 100)]),
  },
  Liverpool: {
    'Baltic Triangle': c(53.396, -2.981, 220),
    Ropewalks: c(53.402, -2.981, 220),
    'Georgian Quarter': c(53.401, -2.97, 300, [no(53.3975, -2.9725, 160)]),
    Toxteth: c(53.388, -2.964, 500, [no(53.386, -2.958, 250)]),
    Allerton: c(53.37, -2.905, 650),
  },
  Newcastle: {
    Jesmond: c(54.985, -1.605, 450, [no(54.988, -1.592, 250), no(54.988, -1.625, 450), no(54.98732, -1.60062, 100), no(54.98498, -1.61188, 100), no(54.98265, -1.6005, 100)]),
    Heaton: c(54.978, -1.577, 450, [no(54.983, -1.588, 250), no(54.97716, -1.57925, 100), no(54.98028, -1.58013, 100)]),
    Gosforth: c(55.008, -1.615, 550),
    // East of the valley floor; the Ouseburn itself runs along about -1.590.
    Ouseburn: c(54.9745, -1.5875, 170),
    'City Centre': c(54.9745, -1.614, 330, [no(54.979, -1.623, 200)]),
  },
  Nottingham: {
    'Lace Market': c(52.9515, -1.144, 170),
    Hockley: c(52.9545, -1.142, 160),
    'The Park': c(52.9485, -1.163, 300),
    'West Bridgford': c(52.929, -1.127, 600, [no(52.937, -1.1325, 150)]),
    Beeston: c(52.926, -1.215, 550),
    Mapperley: c(52.98, -1.125, 550),
  },
  Sheffield: {
    'Kelham Island': c(53.389, -1.472, 250),
    'Nether Edge': c(53.361, -1.488, 450, [no(53.36332, -1.49223, 100)]),
    Walkley: c(53.392, -1.495, 400),
    Hillsborough: c(53.403, -1.505, 550, [no(53.406, -1.499, 250), no(53.4114, -1.501, 200), no(53.40014, -1.50453, 100)]),
    Ecclesall: c(53.36, -1.51, 550, [no(53.367, -1.502, 250)]),
    Crookes: c(53.383, -1.505, 400),
  },
  Brighton: {
    'North Laine': c(50.8265, -0.1395, 220),
    Kemptown: c(50.8215, -0.122, 300),
    Hove: c(50.832, -0.172, 550),
    'Seven Dials': c(50.829, -0.147, 200),
    'Preston Park': c(50.841, -0.143, 450, [no(50.8445, -0.149, 320), no(50.84171, -0.1454, 100)]),
  },
  Oxford: {
    Jericho: c(51.76, -1.2665, 230),
    Summertown: c(51.778, -1.264, 500, [no(51.77739, -1.26154, 100), no(51.78002, -1.25845, 100)]),
    Headington: c(51.76, -1.215, 600, [no(51.76, -1.207, 120), no(51.75512, -1.21616, 100), no(51.76328, -1.20848, 100)]),
    // Cowley Road side of East Oxford; Oxford Golf Club (Southfield) lies further east.
    Cowley: c(51.7425, -1.2245, 380, [no(51.74347, -1.22275, 100), no(51.74536, -1.22485, 100)]),
    Iffley: c(51.73, -1.231, 300),
  },
  Cambridge: {
    'Mill Road': c(52.198, 0.142, 400, [no(52.2005, 0.134, 100)]),
    Chesterton: c(52.2185, 0.135, 450),
    Trumpington: c(52.176, 0.115, 600),
    Newnham: c(52.1985, 0.103, 300, [no(52.19944, 0.10692, 100)]),
    'Cherry Hinton': c(52.188, 0.172, 550, [no(52.192, 0.164, 150), no(52.19167, 0.17654, 100), no(52.1872, 0.16479, 100)]),
  },
};

const METRES_PER_DEGREE_LAT = 111_320;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(h));
}

/** Small stable string hash, so each neighbourhood gets its own spiral rotation. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic 0–1 value per (seed, index). */
function unit(seed: number, i: number): number {
  const x = Math.sin(seed * 0.0001 + i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * `count` points spread evenly across a footprint (a sunflower spiral with a
 * little bounded jitter, rotated per neighbourhood), skipping avoid circles.
 * The same inputs always give the same points.
 */
export function spreadInFootprint(fp: Footprint, count: number, seedKey: string): { lat: number; lng: number }[] {
  const seed = hash(seedKey);
  const rotation = (seed % 3600) / 10 / 180 * Math.PI;
  const metresPerDegreeLng = METRES_PER_DEGREE_LAT * Math.cos((fp.lat * Math.PI) / 180);
  // Grow the spiral one candidate at a time until enough fall outside the avoid
  // circles, then keep an evenly spaced subset so the points span the footprint.
  for (let n = count; n <= count * 4 + 8; n++) {
    const points: { lat: number; lng: number }[] = [];
    for (let k = 0; k < n; k++) {
      const r = Math.min(fp.radiusM, fp.radiusM * Math.sqrt((k + 0.5) / n) * (0.88 + 0.2 * unit(seed, k)));
      const theta = k * GOLDEN_ANGLE + rotation;
      const point = {
        lat: round5(fp.lat + (r * Math.sin(theta)) / METRES_PER_DEGREE_LAT),
        lng: round5(fp.lng + (r * Math.cos(theta)) / metresPerDegreeLng),
      };
      if (!fp.avoid?.some((a) => distanceM(point, a) < a.radiusM)) points.push(point);
    }
    if (points.length >= count) return Array.from({ length: count }, (_, i) => points[Math.floor((i * points.length) / count)]);
  }
  throw new Error(`Footprint for ${seedKey} is too crowded by avoid areas to fit ${count} listings`);
}

const round5 = (x: number) => Math.round(x * 1e5) / 1e5;
