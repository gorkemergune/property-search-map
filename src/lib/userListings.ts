import { PHOTO_POOLS } from '../data/images';
import type {
  Bill,
  EpcRating,
  Furnishing,
  ListingStatus,
  Nation,
  OutdoorSpace,
  ParkingType,
  PricePeriod,
  Property,
  PropertyType,
  Tenure,
} from '../types/property';
import { readJson, writeJson } from './storage';

/**
 * Listings added through the "Add listing" form. They live only in this
 * browser (localStorage) and are merged with the demo data at runtime.
 */

export const USER_LISTINGS_KEY = 'iceberg.userListings.v1';
export const USER_ID_PREFIX = 'user-';

export const isUserListing = (id: string) => id.startsWith(USER_ID_PREFIX);

const parse = (raw: unknown): Property[] | null =>
  Array.isArray(raw)
    ? raw.filter(
        (x): x is Property =>
          !!x && typeof x === 'object' && typeof (x as Property).id === 'string' && isUserListing((x as Property).id) && typeof (x as Property).lat === 'number' && typeof (x as Property).lng === 'number',
      )
    : null;

export function readUserListings(): Property[] {
  return readJson(USER_LISTINGS_KEY, parse, []);
}

export function writeUserListings(list: readonly Property[]): boolean {
  return writeJson(USER_LISTINGS_KEY, list);
}

// ---------------------------------------------------------------------------
// Places: the cities and neighbourhoods the form offers, from the dataset.
// ---------------------------------------------------------------------------

export interface PlaceArea {
  name: string;
  lat: number;
  lng: number;
  count: number;
}
export interface PlaceCity {
  name: string;
  nation: Nation;
  lat: number;
  lng: number;
  areas: PlaceArea[];
}

/** Cities (A–Z) with their neighbourhoods and centre points, averaged from the listings. */
export function buildPlaces(list: readonly Property[]): PlaceCity[] {
  const cities = new Map<string, { nation: Nation; areas: Map<string, { lat: number; lng: number; n: number }> }>();
  for (const p of list) {
    if (isUserListing(p.id)) continue;
    const c = cities.get(p.city) ?? { nation: p.nation, areas: new Map() };
    const a = c.areas.get(p.neighborhood) ?? { lat: 0, lng: 0, n: 0 };
    a.lat += p.lat;
    a.lng += p.lng;
    a.n += 1;
    c.areas.set(p.neighborhood, a);
    cities.set(p.city, c);
  }
  return [...cities]
    .map(([name, c]) => {
      const areas = [...c.areas].map(([area, a]) => ({ name: area, lat: a.lat / a.n, lng: a.lng / a.n, count: a.n })).sort((x, y) => x.name.localeCompare(y.name));
      const total = areas.reduce((s, a) => s + a.count, 0);
      return {
        name,
        nation: c.nation,
        lat: areas.reduce((s, a) => s + a.lat * a.count, 0) / total,
        lng: areas.reduce((s, a) => s + a.lng * a.count, 0) / total,
        areas,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const sq = (x: number) => x * x;
/** Rough distance in km (equirectangular; fine at city scale). */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const k = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(sq(a.lat - b.lat) + sq((a.lng - b.lng) * k)) * 111.32;
}

/** Nearest city to a point, and the nearest neighbourhood inside it. */
export function nearestPlace(places: readonly PlaceCity[], pt: { lat: number; lng: number }): { city: PlaceCity; area: PlaceArea; km: number } | null {
  let best: { city: PlaceCity; area: PlaceArea; km: number } | null = null;
  for (const city of places)
    for (const area of city.areas) {
      const km = kmBetween(area, pt);
      if (!best || km < best.km) best = { city, area, km };
    }
  return best;
}

// ---------------------------------------------------------------------------
// Draft → Property
// ---------------------------------------------------------------------------

export interface ListingDraft {
  pricePeriod: PricePeriod;
  type: PropertyType;
  status: ListingStatus;
  // Location
  city: string;
  neighborhood: string;
  address: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  // Details
  price: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: string;
  epcRating: EpcRating;
  hasGarden: boolean;
  hasParking: boolean;
  outdoorSpace: OutdoorSpace[];
  parking: ParkingType[];
  // Sale
  tenure: Tenure;
  newBuild: boolean;
  chainFree: boolean;
  leaseYearsRemaining: string;
  serviceChargePerYear: string;
  // Rent
  furnishing: Furnishing;
  availableFrom: string;
  petsAllowed: 'yes' | 'no' | 'unknown';
  includedBills: Bill[];
  depositWeeks: string;
  couplesWelcome: boolean;
  studentFriendly: boolean;
  sharersAccepted: boolean;
  shortLetsAccepted: boolean;
  // Both
  homeOffice: boolean;
  stepFreeAccess: boolean;
  hasLift: boolean;
  accessibleBathroom: boolean;
  // Presentation
  title: string;
  description: string;
  image: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function emptyDraft(): ListingDraft {
  return {
    pricePeriod: 'total',
    type: 'apartment',
    status: 'available',
    city: '',
    neighborhood: '',
    address: '',
    postcode: '',
    lat: null,
    lng: null,
    price: '',
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: '',
    epcRating: 'C',
    hasGarden: false,
    hasParking: false,
    outdoorSpace: [],
    parking: [],
    tenure: 'leasehold',
    newBuild: false,
    chainFree: false,
    leaseYearsRemaining: '',
    serviceChargePerYear: '',
    furnishing: 'unfurnished',
    availableFrom: today(),
    petsAllowed: 'unknown',
    includedBills: [],
    depositWeeks: '5',
    couplesWelcome: true,
    studentFriendly: false,
    sharersAccepted: false,
    shortLetsAccepted: false,
    homeOffice: false,
    stepFreeAccess: false,
    hasLift: false,
    accessibleBathroom: false,
    title: '',
    description: '',
    image: '',
  };
}

const TYPE_NOUN: Record<PropertyType, string> = { apartment: 'flat', house: 'house', townhouse: 'townhouse', villa: 'villa' };

export function suggestTitle(d: Pick<ListingDraft, 'bedrooms' | 'type' | 'neighborhood' | 'city' | 'pricePeriod'>): string {
  const beds = d.bedrooms === 0 ? 'Studio' : `${d.bedrooms}-bedroom`;
  const noun = d.bedrooms === 0 && d.type === 'apartment' ? 'flat' : TYPE_NOUN[d.type];
  const where = d.neighborhood || d.city;
  return `${beds} ${noun}${where ? ` in ${where}` : ''}${d.pricePeriod === 'monthly' ? ' to rent' : ' for sale'}`;
}

const num = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export type DraftErrors = Partial<Record<'city' | 'neighborhood' | 'address' | 'pin' | 'price' | 'areaSqm', string>>;

export function validateDraft(d: ListingDraft): DraftErrors {
  const e: DraftErrors = {};
  if (!d.city) e.city = 'Choose a city.';
  if (!d.neighborhood.trim()) e.neighborhood = 'Choose or type a neighbourhood.';
  if (!d.address.trim()) e.address = 'Add a street address.';
  if (d.lat === null || d.lng === null) e.pin = 'Place the pin on the map.';
  if (num(d.price) === null) e.price = 'Enter a price.';
  if (num(d.areaSqm) === null) e.areaSqm = 'Enter the floor area.';
  return e;
}

export function draftToProperty(d: ListingDraft, nation: Nation, id = `${USER_ID_PREFIX}${Date.now().toString(36)}`): Property {
  const rent = d.pricePeriod === 'monthly';
  const date = today();
  const title = d.title.trim() || suggestTitle(d);
  const image = d.image || PHOTO_POOLS[d.type][0];
  const leased = !rent && (d.tenure === 'leasehold' || d.tenure === 'share_of_freehold');
  const address = [d.address.trim(), d.postcode.trim().toUpperCase()].filter(Boolean).join(', ');
  const hasGarden = d.hasGarden || d.outdoorSpace.some((o) => o === 'private_garden' || o === 'shared_garden');
  const hasParking = d.hasParking || d.parking.some((p) => p !== 'permit');

  const p: Property = {
    id,
    title,
    description:
      d.description.trim() ||
      `${title}. ${d.bathrooms} bathroom${d.bathrooms === 1 ? '' : 's'}, about ${num(d.areaSqm)} m², EPC ${d.epcRating}. Added through the listing form for this demo.`,
    image,
    imageAlt: title,
    price: num(d.price)!,
    currency: 'GBP',
    pricePeriod: d.pricePeriod,
    address,
    neighborhood: d.neighborhood.trim(),
    city: d.city,
    countryCode: 'GB',
    nation,
    type: d.type,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    areaSqm: num(d.areaSqm)!,
    status: d.status,
    lat: d.lat!,
    lng: d.lng!,
    listedAt: date,
    updatedAt: date,
    epcRating: d.epcRating,
    hasGarden,
    hasParking,
    homeOffice: d.homeOffice || undefined,
    stepFreeAccess: d.stepFreeAccess || undefined,
    hasLift: d.hasLift || undefined,
    accessibleBathroom: d.accessibleBathroom || undefined,
  };
  if (rent) {
    Object.assign(p, {
      furnishing: d.furnishing,
      availableFrom: d.availableFrom || undefined,
      petsAllowed: d.petsAllowed === 'unknown' ? undefined : d.petsAllowed === 'yes',
      includedBills: d.includedBills,
      depositWeeks: d.depositWeeks === '' ? undefined : Number(d.depositWeeks),
      couplesWelcome: d.couplesWelcome,
      studentFriendly: d.studentFriendly,
      sharersAccepted: d.sharersAccepted,
      shortLetsAccepted: d.shortLetsAccepted,
    } satisfies Partial<Property>);
  } else {
    const tenure: Tenure = nation === 'scotland' ? 'outright' : d.tenure;
    Object.assign(p, {
      tenure,
      newBuild: d.newBuild,
      chainFree: d.chainFree,
      outdoorSpace: d.outdoorSpace,
      parking: d.parking,
      leaseYearsRemaining: leased && nation !== 'scotland' ? (num(d.leaseYearsRemaining) ?? undefined) : undefined,
      serviceChargePerYear: leased && nation !== 'scotland' ? (num(d.serviceChargePerYear) ?? undefined) : undefined,
    } satisfies Partial<Property>);
  }
  return p;
}

/** Downscales an uploaded photo to a JPEG data URL small enough for localStorage. */
export function photoToDataUrl(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the photo.'));
    };
    img.src = url;
  });
}
