import { MARKETS } from './markets';
import { PHOTO_POOLS } from './images';
import type {
  Bedrooms,
  CountryCode,
  EpcRating,
  Furnishing,
  ListingStatus,
  PricePeriod,
  Property,
  PropertyType,
  Tenure,
} from '../types/property';

/**
 * 200 fictional UK listings across London (120), Manchester (25),
 * Birmingham (20), Bristol (20) and Edinburgh (15). All prices are GBP.
 *
 * Cities and neighborhoods are real so markers cluster the way real listings
 * would, but every address is fictional on purpose: street names such as
 * "Sample Street", "Example Road" or "Placeholder Row" make that obvious and
 * avoid pointing at real homes. Coordinates are approximate points inside each
 * neighborhood, not buildings. Prices, dates, bathrooms, floor areas and
 * furnishing are invented. Titles and descriptions are generated from those
 * fields and say they are demo data. Sale prices are total asking prices;
 * rents are per calendar month. Every value is hard-coded, so the dataset is
 * the same on every build.
 *
 * London is deliberately the densest market, with heavier clusters in hot
 * neighborhoods (Shoreditch, Clapham, Hackney, Islington, Battersea, Canary
 * Wharf), mirroring the way Rightmove/Zoopla results concentrate in reality.
 */

interface Row {
  neighborhood: string;
  address: string;
  type: PropertyType;
  bedrooms: Bedrooms;
  pricePeriod: PricePeriod;
  price: number;
  bathrooms: number;
  areaSqm: number;
  furnishing?: Furnishing;
  status: ListingStatus;
  lat: number;
  lng: number;
  listedAt: string;
  updatedAt: string;
  epcRating: EpcRating;
  hasGarden: boolean;
  hasParking: boolean;
  tenure?: Tenure;
  newBuild?: boolean;
  petsAllowed?: boolean;
  billsIncluded?: boolean;
  availableFrom?: string;
}

const TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  villa: 'Villa',
};

const ADJECTIVES = ['Bright', 'Renovated', 'Spacious', 'Light-filled', 'Quiet', 'Corner', 'Modern', 'Classic'] as const;

const FURNISHING_TEXT: Record<Furnishing, string> = {
  furnished: 'furnished',
  part_furnished: 'part-furnished',
  unfurnished: 'unfurnished',
};

function titleFor(row: Row, index: number): string {
  const adjective = ADJECTIVES[index % ADJECTIVES.length];
  const type = TYPE_LABELS[row.type].toLowerCase();
  const size = row.bedrooms === 0 ? 'studio' : `${row.bedrooms}-bedroom ${type}`;
  return `${adjective} ${size} in ${row.neighborhood}`;
}

function descriptionFor(row: Row, cityName: string): string {
  const baths = row.bathrooms === 1 ? '1 bathroom' : `${row.bathrooms} bathrooms`;
  const furnishing = row.furnishing ? `, offered ${FURNISHING_TEXT[row.furnishing]}` : '';
  const use = row.pricePeriod === 'monthly' ? 'to rent' : 'for sale';
  const type = TYPE_LABELS[row.type].toLowerCase();
  const article = /^[aeiou]/.test(type) ? 'An' : 'A';
  return `Demo listing with fictional details. ${article} ${type} ${use} in ${row.neighborhood}, ${cityName}, with ${baths}${furnishing}.`;
}

let listingIndex = 0;

const photoCursor: Record<PropertyType, number> = { apartment: 0, house: 0, townhouse: 0, villa: 0 };

function nextPhoto(type: PropertyType): string {
  const pool = PHOTO_POOLS[type];
  const photo = pool[photoCursor[type] % pool.length];
  photoCursor[type] += 1;
  return photo;
}

function city(countryCode: CountryCode, cityName: string, idPrefix: string, rows: Row[]): Property[] {
  const { currency } = MARKETS[countryCode];
  return rows.map((row, i) => ({
    id: `${idPrefix}-${String(i + 1).padStart(3, '0')}`,
    title: titleFor(row, listingIndex++),
    description: descriptionFor(row, cityName),
    image: nextPhoto(row.type),
    imageAlt: `${TYPE_LABELS[row.type]} in ${row.neighborhood}, ${cityName}`,
    price: row.price,
    currency,
    pricePeriod: row.pricePeriod,
    address: row.address,
    neighborhood: row.neighborhood,
    city: cityName,
    countryCode,
    type: row.type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    areaSqm: row.areaSqm,
    ...(row.furnishing ? { furnishing: row.furnishing } : {}),
    status: row.status,
    lat: row.lat,
    lng: row.lng,
    listedAt: row.listedAt,
    updatedAt: row.updatedAt,
    epcRating: row.epcRating,
    hasGarden: row.hasGarden,
    hasParking: row.hasParking,
    ...(row.tenure ? { tenure: row.tenure } : {}),
    ...(row.newBuild ? { newBuild: row.newBuild } : {}),
    ...(row.petsAllowed ? { petsAllowed: row.petsAllowed } : {}),
    ...(row.billsIncluded ? { billsIncluded: row.billsIncluded } : {}),
    ...(row.availableFrom ? { availableFrom: row.availableFrom } : {}),
  }));
}

// ---------------------------------------------------------------------------
// London (GBP) — 120. Hot neighborhoods (Shoreditch, Clapham, Hackney,
// Islington, Battersea, Canary Wharf) carry more listings than quieter zones.
// ---------------------------------------------------------------------------

const london = city('GB', 'London', 'gb-lon', [
  // Shoreditch (6) — hip inner-east, mixed sale/rent
  { neighborhood: 'Shoreditch', address: 'Flat 5, 48 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 850, bathrooms: 1, areaSqm: 72, furnishing: 'furnished', status: 'available', lat: 51.5260, lng: -0.0790, listedAt: '2026-10-02', updatedAt: '2026-10-09' , epcRating: 'C', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-11-29' },
  { neighborhood: 'Shoreditch', address: 'Flat 12, 73 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 925, bathrooms: 1, areaSqm: 54, furnishing: 'part_furnished', status: 'available', lat: 51.5265, lng: -0.0780, listedAt: '2026-10-05', updatedAt: '2026-10-08' , epcRating: 'D', hasGarden: false, hasParking: true, billsIncluded: true, availableFrom: '2026-11-09' },
  { neighborhood: 'Shoreditch', address: 'Flat 8, 24 Placeholder Row', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 1_000, bathrooms: 1, areaSqm: 36, furnishing: 'furnished', status: 'available', lat: 51.5255, lng: -0.0795, listedAt: '2026-09-28', updatedAt: '2026-10-04' , epcRating: 'C', hasGarden: false, hasParking: true, availableFrom: '2026-10-10' },
  { neighborhood: 'Shoreditch', address: '31 Example Road', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 185_000, bathrooms: 2, areaSqm: 142, status: 'available', lat: 51.5268, lng: -0.0785, listedAt: '2026-09-10', updatedAt: '2026-09-18' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'freehold', newBuild: true },
  { neighborhood: 'Shoreditch', address: 'Flat 6, 59 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 199_000, bathrooms: 2, areaSqm: 78, status: 'available', lat: 51.5252, lng: -0.0800, listedAt: '2026-08-22', updatedAt: '2026-09-14' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Shoreditch', address: 'Flat 2, 17 Mockup Place', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 1_075, bathrooms: 1, areaSqm: 58, furnishing: 'furnished', status: 'let', lat: 51.5258, lng: -0.0775, listedAt: '2026-08-14', updatedAt: '2026-09-02' , epcRating: 'D', hasGarden: false, hasParking: false, availableFrom: '2026-08-17' },

  // Hackney (6) — residential inner-east
  { neighborhood: 'Hackney', address: '46 Example Road', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 212_000, bathrooms: 3, areaSqm: 196, status: 'under_offer', lat: 51.5470, lng: -0.0630, listedAt: '2026-08-26', updatedAt: '2026-09-29' , epcRating: 'B', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Hackney', address: 'Flat 9, 82 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 226_000, bathrooms: 2, areaSqm: 76, status: 'available', lat: 51.5475, lng: -0.0625, listedAt: '2026-09-15', updatedAt: '2026-09-25' , epcRating: 'D', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Hackney', address: 'Flat 3, 29 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 1_150, bathrooms: 1, areaSqm: 52, furnishing: 'unfurnished', status: 'available', lat: 51.5466, lng: -0.0640, listedAt: '2026-10-03', updatedAt: '2026-10-07' , epcRating: 'B', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-11-26' },
  { neighborhood: 'Hackney', address: '71 Demo Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 240_000, bathrooms: 2, areaSqm: 148, status: 'available', lat: 51.5478, lng: -0.0620, listedAt: '2026-09-04', updatedAt: '2026-09-12' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'freehold' },
  { neighborhood: 'Hackney', address: 'Flat 11, 54 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 1_225, bathrooms: 1, areaSqm: 68, furnishing: 'furnished', status: 'available', lat: 51.5472, lng: -0.0635, listedAt: '2026-09-30', updatedAt: '2026-10-06' , epcRating: 'B', hasGarden: false, hasParking: false, availableFrom: '2026-10-08' },
  { neighborhood: 'Hackney', address: 'Flat 4, 38 Demo Boulevard', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 1_300, bathrooms: 1, areaSqm: 32, furnishing: 'part_furnished', status: 'available', lat: 51.5468, lng: -0.0645, listedAt: '2026-10-01', updatedAt: '2026-10-01' , epcRating: 'D', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-11-01' },

  // Islington (6) — leafy residential
  { neighborhood: 'Islington', address: 'Flat 3, 76 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 254_000, bathrooms: 1, areaSqm: 77, status: 'available', lat: 51.5410, lng: -0.1020, listedAt: '2026-09-22', updatedAt: '2026-10-04' , epcRating: 'A', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Islington', address: '18 Example Avenue', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 267_000, bathrooms: 3, areaSqm: 215, status: 'available', lat: 51.5415, lng: -0.1015, listedAt: '2026-08-19', updatedAt: '2026-09-11' , epcRating: 'D', hasGarden: false, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Islington', address: 'Flat 7, 92 Example Road', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 1_375, bathrooms: 1, areaSqm: 55, furnishing: 'furnished', status: 'available', lat: 51.5405, lng: -0.1025, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'G', hasGarden: true, hasParking: true, availableFrom: '2026-11-13' },
  { neighborhood: 'Islington', address: 'Flat 8, 41 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 1_450, bathrooms: 2, areaSqm: 74, furnishing: 'part_furnished', status: 'available', lat: 51.5412, lng: -0.1030, listedAt: '2026-09-18', updatedAt: '2026-09-27' , epcRating: 'D', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-09-21' },
  { neighborhood: 'Islington', address: '63 Sample Mews', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 281_000, bathrooms: 2, areaSqm: 168, status: 'under_offer', lat: 51.5418, lng: -0.1010, listedAt: '2026-08-11', updatedAt: '2026-09-02' , epcRating: 'F', hasGarden: true, hasParking: false, tenure: 'freehold', newBuild: true },
  { neighborhood: 'Islington', address: 'Flat 2, 25 Placeholder Lane', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 295_000, bathrooms: 1, areaSqm: 52, status: 'available', lat: 51.5408, lng: -0.1017, listedAt: '2026-09-26', updatedAt: '2026-09-26' , epcRating: 'C', hasGarden: true, hasParking: false, tenure: 'leasehold' },

  // Clapham (6) — south-west residential
  { neighborhood: 'Clapham', address: 'Flat 9, 24 Demo Lane', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 1_525, bathrooms: 1, areaSqm: 56, furnishing: 'unfurnished', status: 'available', lat: 51.4555, lng: -0.1430, listedAt: '2026-10-05', updatedAt: '2026-10-08' , epcRating: 'E', hasGarden: false, hasParking: false, availableFrom: '2026-10-17' },
  { neighborhood: 'Clapham', address: '58 Example Road', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 308_000, bathrooms: 3, areaSqm: 185, status: 'available', lat: 51.4560, lng: -0.1425, listedAt: '2026-08-28', updatedAt: '2026-09-22' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Clapham', address: 'Flat 5, 17 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 322_000, bathrooms: 1, areaSqm: 71, status: 'available', lat: 51.4552, lng: -0.1435, listedAt: '2026-09-07', updatedAt: '2026-09-19' , epcRating: 'E', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Clapham', address: '83 Placeholder Row', type: 'townhouse', bedrooms: 3, pricePeriod: 'monthly', price: 1_600, bathrooms: 2, areaSqm: 132, furnishing: 'furnished', status: 'available', lat: 51.4558, lng: -0.1428, listedAt: '2026-10-01', updatedAt: '2026-10-06' , epcRating: 'C', hasGarden: true, hasParking: false, billsIncluded: true, availableFrom: '2026-11-09' },
  { neighborhood: 'Clapham', address: 'Flat 11, 46 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 1_675, bathrooms: 1, areaSqm: 68, furnishing: 'part_furnished', status: 'available', lat: 51.4550, lng: -0.1440, listedAt: '2026-09-24', updatedAt: '2026-09-24' , epcRating: 'E', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-10' },
  { neighborhood: 'Clapham', address: '29 Demo Boulevard', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 336_000, bathrooms: 2, areaSqm: 158, status: 'sold', lat: 51.4563, lng: -0.1418, listedAt: '2026-07-14', updatedAt: '2026-09-20' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold' },

  // Camden (6) — buzzy north
  { neighborhood: 'Camden', address: 'Flat 7, 61 Example Avenue', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 1_750, bathrooms: 1, areaSqm: 50, furnishing: 'furnished', status: 'available', lat: 51.5390, lng: -0.1430, listedAt: '2026-10-02', updatedAt: '2026-10-07' , epcRating: 'E', hasGarden: false, hasParking: false, billsIncluded: true, availableFrom: '2026-11-01' },
  { neighborhood: 'Camden', address: 'Flat 2, 34 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 1_825, bathrooms: 1, areaSqm: 72, furnishing: 'part_furnished', status: 'available', lat: 51.5395, lng: -0.1425, listedAt: '2026-09-20', updatedAt: '2026-10-01' , epcRating: 'C', hasGarden: false, hasParking: true, availableFrom: '2026-09-27' },
  { neighborhood: 'Camden', address: '19 Demo Lane', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 349_000, bathrooms: 2, areaSqm: 162, status: 'available', lat: 51.5388, lng: -0.1437, listedAt: '2026-08-15', updatedAt: '2026-09-05' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'freehold', newBuild: true },
  { neighborhood: 'Camden', address: 'Flat 4, 77 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 363_000, bathrooms: 2, areaSqm: 82, status: 'under_offer', lat: 51.5392, lng: -0.1420, listedAt: '2026-09-01', updatedAt: '2026-09-28' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Camden', address: 'Flat 8, 53 Example Road', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 1_900, bathrooms: 1, areaSqm: 38, furnishing: 'unfurnished', status: 'available', lat: 51.5397, lng: -0.1432, listedAt: '2026-09-27', updatedAt: '2026-10-05' , epcRating: 'D', hasGarden: false, hasParking: false, billsIncluded: true, availableFrom: '2026-11-24' },
  { neighborhood: 'Camden', address: '48 Mockup Place', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 377_000, bathrooms: 3, areaSqm: 212, status: 'available', lat: 51.5385, lng: -0.1442, listedAt: '2026-08-07', updatedAt: '2026-08-07' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold' },

  // Chelsea (5) — luxury sale-heavy
  { neighborhood: 'Chelsea', address: 'Flat 3, 22 Sample Street', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 391_000, bathrooms: 3, areaSqm: 185, status: 'available', lat: 51.4875, lng: -0.1687, listedAt: '2026-08-30', updatedAt: '2026-09-18' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Chelsea', address: '45 Example Avenue', type: 'townhouse', bedrooms: 5, pricePeriod: 'total', price: 404_000, bathrooms: 4, areaSqm: 310, status: 'under_offer', lat: 51.4880, lng: -0.1680, listedAt: '2026-08-04', updatedAt: '2026-09-10' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Chelsea', address: 'Flat 11, 68 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 1_975, bathrooms: 2, areaSqm: 95, furnishing: 'furnished', status: 'available', lat: 51.4870, lng: -0.1695, listedAt: '2026-09-25', updatedAt: '2026-10-03' , epcRating: 'D', hasGarden: false, hasParking: false, availableFrom: '2026-11-14' },
  { neighborhood: 'Chelsea', address: 'Flat 6, 31 Demo Lane', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 418_000, bathrooms: 1, areaSqm: 62, status: 'available', lat: 51.4872, lng: -0.1690, listedAt: '2026-09-11', updatedAt: '2026-09-11' , epcRating: 'B', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Chelsea', address: 'Flat 2, 85 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 432_000, bathrooms: 2, areaSqm: 108, status: 'available', lat: 51.4878, lng: -0.1683, listedAt: '2026-08-22', updatedAt: '2026-09-04' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Kensington (5) — luxury
  { neighborhood: 'Kensington', address: 'Flat 7, 39 Example Avenue', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 445_000, bathrooms: 3, areaSqm: 195, status: 'available', lat: 51.5000, lng: -0.1900, listedAt: '2026-09-02', updatedAt: '2026-09-15' , epcRating: 'B', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Kensington', address: '72 Demo Boulevard', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 459_000, bathrooms: 4, areaSqm: 268, status: 'available', lat: 51.5005, lng: -0.1895, listedAt: '2026-08-16', updatedAt: '2026-09-08' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Kensington', address: 'Flat 4, 56 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 2_050, bathrooms: 2, areaSqm: 88, furnishing: 'furnished', status: 'available', lat: 51.4995, lng: -0.1905, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'B', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-11-18' },
  { neighborhood: 'Kensington', address: 'Flat 9, 15 Sample Street', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_125, bathrooms: 1, areaSqm: 58, furnishing: 'part_furnished', status: 'available', lat: 51.5002, lng: -0.1898, listedAt: '2026-09-29', updatedAt: '2026-10-05' , epcRating: 'D', hasGarden: true, hasParking: false, petsAllowed: true, availableFrom: '2026-10-07' },
  { neighborhood: 'Kensington', address: 'Flat 5, 49 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 473_000, bathrooms: 2, areaSqm: 102, status: 'under_offer', lat: 51.4998, lng: -0.1908, listedAt: '2026-08-09', updatedAt: '2026-09-20' , epcRating: 'A', hasGarden: true, hasParking: false, tenure: 'leasehold', newBuild: true },

  // Mayfair (3) — ultra luxury
  { neighborhood: 'Mayfair', address: 'Flat 1, 8 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 486_000, bathrooms: 2, areaSqm: 128, status: 'available', lat: 51.5100, lng: -0.1470, listedAt: '2026-09-14', updatedAt: '2026-09-14' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Mayfair', address: 'Flat 3, 14 Sample Street', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 500_000, bathrooms: 3, areaSqm: 215, status: 'available', lat: 51.5105, lng: -0.1465, listedAt: '2026-08-13', updatedAt: '2026-08-13' , epcRating: 'G', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Mayfair', address: 'Flat 2, 27 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 2_200, bathrooms: 2, areaSqm: 108, furnishing: 'furnished', status: 'available', lat: 51.5095, lng: -0.1475, listedAt: '2026-09-30', updatedAt: '2026-10-06' , epcRating: 'D', hasGarden: false, hasParking: true, availableFrom: '2026-10-20' },

  // Notting Hill (4)
  { neighborhood: 'Notting Hill', address: 'Flat 6, 42 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 514_000, bathrooms: 2, areaSqm: 94, status: 'available', lat: 51.5155, lng: -0.2050, listedAt: '2026-09-05', updatedAt: '2026-09-23' , epcRating: 'F', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Notting Hill', address: '93 Example Road', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 528_000, bathrooms: 3, areaSqm: 232, status: 'under_offer', lat: 51.5160, lng: -0.2045, listedAt: '2026-08-20', updatedAt: '2026-09-29' , epcRating: 'C', hasGarden: true, hasParking: false, tenure: 'freehold', newBuild: true },
  { neighborhood: 'Notting Hill', address: 'Flat 10, 66 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_275, bathrooms: 1, areaSqm: 60, furnishing: 'furnished', status: 'available', lat: 51.5150, lng: -0.2055, listedAt: '2026-10-02', updatedAt: '2026-10-07' , epcRating: 'E', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-13' },
  { neighborhood: 'Notting Hill', address: 'Flat 4, 21 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 2_350, bathrooms: 2, areaSqm: 78, furnishing: 'part_furnished', status: 'available', lat: 51.5158, lng: -0.2048, listedAt: '2026-09-18', updatedAt: '2026-09-28' , epcRating: 'C', hasGarden: false, hasParking: false, availableFrom: '2026-11-05' },

  // Marylebone (4)
  { neighborhood: 'Marylebone', address: 'Flat 3, 55 Demo Boulevard', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 541_000, bathrooms: 2, areaSqm: 95, status: 'available', lat: 51.5225, lng: -0.1510, listedAt: '2026-08-28', updatedAt: '2026-09-16' , epcRating: 'E', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Marylebone', address: 'Flat 9, 18 Sample Street', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 555_000, bathrooms: 1, areaSqm: 55, status: 'available', lat: 51.5230, lng: -0.1505, listedAt: '2026-09-21', updatedAt: '2026-09-21' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Marylebone', address: 'Flat 7, 83 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 2_425, bathrooms: 2, areaSqm: 80, furnishing: 'furnished', status: 'available', lat: 51.5220, lng: -0.1515, listedAt: '2026-10-03', updatedAt: '2026-10-08' , epcRating: 'E', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-11-11' },
  { neighborhood: 'Marylebone', address: 'Flat 2, 36 Placeholder Lane', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_500, bathrooms: 1, areaSqm: 54, furnishing: 'furnished', status: 'let', lat: 51.5227, lng: -0.1508, listedAt: '2026-08-18', updatedAt: '2026-09-04' , epcRating: 'C', hasGarden: false, hasParking: false, availableFrom: '2026-09-03' },

  // Westminster (3) — luxury
  { neighborhood: 'Westminster', address: 'Flat 4, 29 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 569_000, bathrooms: 2, areaSqm: 108, status: 'available', lat: 51.5010, lng: -0.1247, listedAt: '2026-09-09', updatedAt: '2026-09-19' , epcRating: 'E', hasGarden: true, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Westminster', address: 'Flat 1, 62 Example Road', type: 'apartment', bedrooms: 3, pricePeriod: 'monthly', price: 2_575, bathrooms: 2, areaSqm: 118, furnishing: 'furnished', status: 'available', lat: 51.5014, lng: -0.1242, listedAt: '2026-09-27', updatedAt: '2026-10-04' , epcRating: 'C', hasGarden: true, hasParking: false, petsAllowed: true, availableFrom: '2026-11-12' },
  { neighborhood: 'Westminster', address: 'Flat 8, 44 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 582_000, bathrooms: 1, areaSqm: 58, status: 'available', lat: 51.5006, lng: -0.1250, listedAt: '2026-08-25', updatedAt: '2026-08-25' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Pimlico (3) — luxury
  { neighborhood: 'Pimlico', address: 'Flat 5, 11 Demo Boulevard', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 596_000, bathrooms: 2, areaSqm: 86, status: 'available', lat: 51.4895, lng: -0.1340, listedAt: '2026-09-12', updatedAt: '2026-09-22' , epcRating: 'C', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Pimlico', address: 'Flat 2, 73 Mockup Place', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_650, bathrooms: 1, areaSqm: 52, furnishing: 'part_furnished', status: 'available', lat: 51.4900, lng: -0.1335, listedAt: '2026-10-05', updatedAt: '2026-10-09' , epcRating: 'D', hasGarden: false, hasParking: true, availableFrom: '2026-11-29' },
  { neighborhood: 'Pimlico', address: 'Flat 6, 24 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 2_725, bathrooms: 2, areaSqm: 78, furnishing: 'furnished', status: 'available', lat: 51.4891, lng: -0.1345, listedAt: '2026-09-23', updatedAt: '2026-09-23' , epcRating: 'C', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-11' },

  // Fulham (5)
  { neighborhood: 'Fulham', address: '18 Demo Lane', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 610_000, bathrooms: 2, areaSqm: 158, status: 'available', lat: 51.4813, lng: -0.1958, listedAt: '2026-09-01', updatedAt: '2026-09-15' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'leasehold', newBuild: true },
  { neighborhood: 'Fulham', address: 'Flat 9, 54 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 623_000, bathrooms: 2, areaSqm: 84, status: 'under_offer', lat: 51.4818, lng: -0.1952, listedAt: '2026-08-26', updatedAt: '2026-09-27' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Fulham', address: 'Flat 4, 31 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_800, bathrooms: 1, areaSqm: 56, furnishing: 'furnished', status: 'available', lat: 51.4810, lng: -0.1962, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'D', hasGarden: true, hasParking: false, petsAllowed: true, availableFrom: '2026-10-31' },
  { neighborhood: 'Fulham', address: '67 Placeholder Row', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 637_000, bathrooms: 3, areaSqm: 218, status: 'available', lat: 51.4820, lng: -0.1948, listedAt: '2026-08-11', updatedAt: '2026-08-11' , epcRating: 'B', hasGarden: false, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Fulham', address: 'Flat 11, 25 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 2_875, bathrooms: 1, areaSqm: 72, furnishing: 'part_furnished', status: 'available', lat: 51.4815, lng: -0.1965, listedAt: '2026-09-22', updatedAt: '2026-10-02' , epcRating: 'D', hasGarden: false, hasParking: true, availableFrom: '2026-10-05' },

  // Battersea (6)
  { neighborhood: 'Battersea', address: '72 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 651_000, bathrooms: 2, areaSqm: 82, status: 'available', lat: 51.4790, lng: -0.1600, listedAt: '2026-09-15', updatedAt: '2026-09-28' , epcRating: 'B', hasGarden: true, hasParking: false, tenure: 'leasehold', newBuild: true },
  { neighborhood: 'Battersea', address: 'Flat 8, 45 Example Road', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_950, bathrooms: 1, areaSqm: 52, furnishing: 'unfurnished', status: 'available', lat: 51.4785, lng: -0.1605, listedAt: '2026-10-03', updatedAt: '2026-10-07' , epcRating: 'D', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-04' },
  { neighborhood: 'Battersea', address: 'Flat 3, 28 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_025, bathrooms: 2, areaSqm: 68, furnishing: 'furnished', status: 'available', lat: 51.4795, lng: -0.1595, listedAt: '2026-09-29', updatedAt: '2026-10-05' , epcRating: 'B', hasGarden: false, hasParking: false, availableFrom: '2026-11-06' },
  { neighborhood: 'Battersea', address: '14 Sample Mews', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 665_000, bathrooms: 2, areaSqm: 172, status: 'available', lat: 51.4798, lng: -0.1590, listedAt: '2026-08-24', updatedAt: '2026-09-12' , epcRating: 'D', hasGarden: false, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Battersea', address: 'Flat 12, 61 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 678_000, bathrooms: 1, areaSqm: 76, status: 'under_offer', lat: 51.4788, lng: -0.1608, listedAt: '2026-08-30', updatedAt: '2026-09-25' , epcRating: 'A', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Battersea', address: 'Flat 6, 37 Demo Boulevard', type: 'apartment', bedrooms: 3, pricePeriod: 'monthly', price: 3_100, bathrooms: 2, areaSqm: 108, furnishing: 'part_furnished', status: 'available', lat: 51.4792, lng: -0.1602, listedAt: '2026-10-01', updatedAt: '2026-10-01' , epcRating: 'D', hasGarden: false, hasParking: false, petsAllowed: true, billsIncluded: true, availableFrom: '2026-10-30' },

  // Canary Wharf (6) — modern towers
  { neighborhood: 'Canary Wharf', address: 'Flat 4, 98 Sample Mews', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 3_175, bathrooms: 1, areaSqm: 36, furnishing: 'part_furnished', status: 'available', lat: 51.5005, lng: -0.0180, listedAt: '2026-09-30', updatedAt: '2026-10-05' , epcRating: 'G', hasGarden: false, hasParking: false, billsIncluded: true, availableFrom: '2026-10-06' },
  { neighborhood: 'Canary Wharf', address: 'Flat 15, 47 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_250, bathrooms: 2, areaSqm: 82, furnishing: 'furnished', status: 'available', lat: 51.5010, lng: -0.0175, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'D', hasGarden: false, hasParking: false, availableFrom: '2026-11-16' },
  { neighborhood: 'Canary Wharf', address: 'Flat 22, 23 Example Avenue', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 3_325, bathrooms: 1, areaSqm: 54, furnishing: 'furnished', status: 'available', lat: 51.5000, lng: -0.0185, listedAt: '2026-09-26', updatedAt: '2026-10-02' , epcRating: 'F', hasGarden: false, hasParking: false, billsIncluded: true, availableFrom: '2026-10-16' },
  { neighborhood: 'Canary Wharf', address: 'Flat 7, 65 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 692_000, bathrooms: 2, areaSqm: 86, status: 'available', lat: 51.5008, lng: -0.0178, listedAt: '2026-09-08', updatedAt: '2026-09-18' , epcRating: 'C', hasGarden: true, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Canary Wharf', address: 'Flat 18, 12 Demo Lane', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 706_000, bathrooms: 3, areaSqm: 132, status: 'available', lat: 51.4998, lng: -0.0188, listedAt: '2026-08-17', updatedAt: '2026-09-05' , epcRating: 'E', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Canary Wharf', address: 'Flat 25, 39 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 719_000, bathrooms: 2, areaSqm: 95, status: 'under_offer', lat: 51.5012, lng: -0.0172, listedAt: '2026-08-04', updatedAt: '2026-09-22' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Brixton (4)
  { neighborhood: 'Brixton', address: 'Flat 5, 22 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_400, bathrooms: 1, areaSqm: 66, furnishing: 'furnished', status: 'available', lat: 51.4621, lng: -0.1151, listedAt: '2026-10-02', updatedAt: '2026-10-06' , epcRating: 'E', hasGarden: true, hasParking: false, petsAllowed: true, availableFrom: '2026-10-30' },
  { neighborhood: 'Brixton', address: '77 Placeholder Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 733_000, bathrooms: 2, areaSqm: 132, status: 'available', lat: 51.4625, lng: -0.1148, listedAt: '2026-09-11', updatedAt: '2026-09-22' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Brixton', address: 'Flat 8, 41 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 747_000, bathrooms: 1, areaSqm: 48, status: 'available', lat: 51.4618, lng: -0.1155, listedAt: '2026-09-19', updatedAt: '2026-09-19' , epcRating: 'E', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Brixton', address: 'Flat 2, 59 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_475, bathrooms: 1, areaSqm: 58, furnishing: 'part_furnished', status: 'let', lat: 51.4624, lng: -0.1145, listedAt: '2026-08-14', updatedAt: '2026-09-03' , epcRating: 'C', hasGarden: false, hasParking: false, billsIncluded: true, availableFrom: '2026-09-20' },

  // Peckham (4)
  { neighborhood: 'Peckham', address: 'Flat 4, 76 Mockup Place', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 3_550, bathrooms: 1, areaSqm: 46, furnishing: 'unfurnished', status: 'available', lat: 51.4740, lng: -0.0691, listedAt: '2026-10-05', updatedAt: '2026-10-08' , epcRating: 'E', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-10-05' },
  { neighborhood: 'Peckham', address: '21 Example Avenue', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 760_000, bathrooms: 2, areaSqm: 128, status: 'available', lat: 51.4745, lng: -0.0685, listedAt: '2026-09-08', updatedAt: '2026-09-20' , epcRating: 'C', hasGarden: true, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Peckham', address: 'Flat 7, 48 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 774_000, bathrooms: 1, areaSqm: 68, status: 'under_offer', lat: 51.4738, lng: -0.0695, listedAt: '2026-08-23', updatedAt: '2026-09-15' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold', newBuild: true },
  { neighborhood: 'Peckham', address: 'Flat 6, 35 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_625, bathrooms: 1, areaSqm: 62, furnishing: 'furnished', status: 'available', lat: 51.4742, lng: -0.0688, listedAt: '2026-09-30', updatedAt: '2026-10-04' , epcRating: 'C', hasGarden: true, hasParking: false, availableFrom: '2026-10-09' },

  // Dulwich (3) — residential
  { neighborhood: 'Dulwich', address: '35 Demo Boulevard', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 788_000, bathrooms: 3, areaSqm: 184, status: 'available', lat: 51.4455, lng: -0.0858, listedAt: '2026-08-29', updatedAt: '2026-09-19' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Dulwich', address: 'Flat 5, 62 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 802_000, bathrooms: 2, areaSqm: 72, status: 'available', lat: 51.4460, lng: -0.0852, listedAt: '2026-09-14', updatedAt: '2026-09-14' , epcRating: 'C', hasGarden: true, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Dulwich', address: '18 Example Road', type: 'townhouse', bedrooms: 3, pricePeriod: 'monthly', price: 3_700, bathrooms: 2, areaSqm: 142, furnishing: 'part_furnished', status: 'available', lat: 51.4452, lng: -0.0862, listedAt: '2026-10-01', updatedAt: '2026-10-07' , epcRating: 'D', hasGarden: true, hasParking: true, availableFrom: '2026-11-12' },

  // Greenwich (4)
  { neighborhood: 'Greenwich', address: 'Flat 9, 54 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_775, bathrooms: 1, areaSqm: 66, furnishing: 'furnished', status: 'available', lat: 51.4826, lng: -0.0077, listedAt: '2026-10-03', updatedAt: '2026-10-07' , epcRating: 'C', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-22' },
  { neighborhood: 'Greenwich', address: '43 Demo Lane', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 815_000, bathrooms: 3, areaSqm: 198, status: 'available', lat: 51.4830, lng: -0.0072, listedAt: '2026-08-21', updatedAt: '2026-09-10' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'freehold' },
  { neighborhood: 'Greenwich', address: 'Flat 3, 86 Mockup Place', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 829_000, bathrooms: 1, areaSqm: 54, status: 'available', lat: 51.4822, lng: -0.0082, listedAt: '2026-09-05', updatedAt: '2026-09-22' , epcRating: 'B', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Greenwich', address: 'Flat 6, 27 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_850, bathrooms: 1, areaSqm: 70, furnishing: 'part_furnished', status: 'available', lat: 51.4828, lng: -0.0075, listedAt: '2026-09-25', updatedAt: '2026-09-25' , epcRating: 'D', hasGarden: false, hasParking: false, availableFrom: '2026-10-05' },

  // Hampstead (5) — luxury north
  { neighborhood: 'Hampstead', address: '56 Example Road', type: 'house', bedrooms: 5, pricePeriod: 'total', price: 843_000, bathrooms: 4, areaSqm: 275, status: 'available', lat: 51.5555, lng: -0.1778, listedAt: '2026-08-27', updatedAt: '2026-09-18' , epcRating: 'B', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Hampstead', address: 'Flat 4, 23 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 856_000, bathrooms: 2, areaSqm: 108, status: 'available', lat: 51.5560, lng: -0.1775, listedAt: '2026-09-10', updatedAt: '2026-09-10' , epcRating: 'D', hasGarden: false, hasParking: true, tenure: 'leasehold', newBuild: true },
  { neighborhood: 'Hampstead', address: '81 Placeholder Row', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 870_000, bathrooms: 3, areaSqm: 232, status: 'under_offer', lat: 51.5550, lng: -0.1785, listedAt: '2026-08-05', updatedAt: '2026-09-23' , epcRating: 'B', hasGarden: false, hasParking: false, tenure: 'freehold' },
  { neighborhood: 'Hampstead', address: 'Flat 7, 19 Demo Boulevard', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_925, bathrooms: 2, areaSqm: 92, furnishing: 'furnished', status: 'available', lat: 51.5558, lng: -0.1772, listedAt: '2026-10-02', updatedAt: '2026-10-06' , epcRating: 'D', hasGarden: false, hasParking: false, availableFrom: '2026-11-09' },
  { neighborhood: 'Hampstead', address: 'Flat 2, 41 Mockup Place', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_000, bathrooms: 1, areaSqm: 56, furnishing: 'part_furnished', status: 'available', lat: 51.5552, lng: -0.1782, listedAt: '2026-09-28', updatedAt: '2026-10-05' , epcRating: 'A', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-13' },

  // Angel (4) — residential-mixed
  { neighborhood: 'Angel', address: 'Flat 11, 32 Demo Lane', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_075, bathrooms: 1, areaSqm: 52, furnishing: 'furnished', status: 'available', lat: 51.5324, lng: -0.1058, listedAt: '2026-10-01', updatedAt: '2026-10-06' , epcRating: 'D', hasGarden: true, hasParking: false, availableFrom: '2026-11-22' },
  { neighborhood: 'Angel', address: '58 Sample Mews', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 884_000, bathrooms: 2, areaSqm: 165, status: 'available', lat: 51.5328, lng: -0.1053, listedAt: '2026-08-25', updatedAt: '2026-09-14' , epcRating: 'G', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Angel', address: 'Flat 5, 44 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 897_000, bathrooms: 1, areaSqm: 74, status: 'available', lat: 51.5320, lng: -0.1062, listedAt: '2026-09-13', updatedAt: '2026-09-26' , epcRating: 'D', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Angel', address: 'Flat 3, 71 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_150, bathrooms: 1, areaSqm: 70, furnishing: 'part_furnished', status: 'available', lat: 51.5326, lng: -0.1055, listedAt: '2026-09-24', updatedAt: '2026-09-24' , epcRating: 'F', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-27' },

  // Walthamstow (3)
  { neighborhood: 'Walthamstow', address: '26 Mockup Place', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 911_000, bathrooms: 2, areaSqm: 128, status: 'available', lat: 51.5833, lng: -0.0167, listedAt: '2026-09-07', updatedAt: '2026-09-19' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold', newBuild: true },
  { neighborhood: 'Walthamstow', address: 'Flat 4, 48 Example Avenue', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_225, bathrooms: 1, areaSqm: 48, furnishing: 'unfurnished', status: 'available', lat: 51.5838, lng: -0.0162, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'E', hasGarden: false, hasParking: false, availableFrom: '2026-10-23' },
  { neighborhood: 'Walthamstow', address: 'Flat 2, 13 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 925_000, bathrooms: 1, areaSqm: 62, status: 'available', lat: 51.5830, lng: -0.0172, listedAt: '2026-08-30', updatedAt: '2026-08-30' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Wandsworth (5)
  { neighborhood: 'Wandsworth', address: '34 Demo Lane', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 939_000, bathrooms: 3, areaSqm: 196, status: 'available', lat: 51.4571, lng: -0.1818, listedAt: '2026-08-22', updatedAt: '2026-09-11' , epcRating: 'E', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Wandsworth', address: 'Flat 6, 51 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 952_000, bathrooms: 1, areaSqm: 72, status: 'available', lat: 51.4575, lng: -0.1812, listedAt: '2026-09-16', updatedAt: '2026-09-30' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Wandsworth', address: 'Flat 3, 28 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_300, bathrooms: 1, areaSqm: 50, furnishing: 'part_furnished', status: 'available', lat: 51.4568, lng: -0.1822, listedAt: '2026-10-02', updatedAt: '2026-10-07' , epcRating: 'E', hasGarden: false, hasParking: true, availableFrom: '2026-11-22' },
  { neighborhood: 'Wandsworth', address: '82 Example Road', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 966_000, bathrooms: 2, areaSqm: 162, status: 'under_offer', lat: 51.4578, lng: -0.1808, listedAt: '2026-08-07', updatedAt: '2026-09-20' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Wandsworth', address: 'Flat 9, 45 Demo Boulevard', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_375, bathrooms: 2, areaSqm: 68, furnishing: 'furnished', status: 'available', lat: 51.4573, lng: -0.1815, listedAt: '2026-09-28', updatedAt: '2026-10-05' , epcRating: 'E', hasGarden: false, hasParking: false, availableFrom: '2026-10-21' },

  // Wimbledon (3)
  { neighborhood: 'Wimbledon', address: '47 Example Avenue', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 980_000, bathrooms: 3, areaSqm: 212, status: 'available', lat: 51.4214, lng: -0.2064, listedAt: '2026-09-02', updatedAt: '2026-09-17' , epcRating: 'C', hasGarden: false, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Wimbledon', address: 'Flat 5, 19 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_450, bathrooms: 1, areaSqm: 64, furnishing: 'furnished', status: 'available', lat: 51.4218, lng: -0.2058, listedAt: '2026-10-03', updatedAt: '2026-10-08' , epcRating: 'D', hasGarden: true, hasParking: false, availableFrom: '2026-11-09' },
  { neighborhood: 'Wimbledon', address: '72 Placeholder Row', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 993_000, bathrooms: 2, areaSqm: 148, status: 'available', lat: 51.4210, lng: -0.2070, listedAt: '2026-08-18', updatedAt: '2026-09-04' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold', newBuild: true },

  // Richmond (4) — luxury suburb
  { neighborhood: 'Richmond', address: '38 Mockup Place', type: 'house', bedrooms: 5, pricePeriod: 'total', price: 1_025_000, bathrooms: 4, areaSqm: 285, status: 'available', lat: 51.4613, lng: -0.3037, listedAt: '2026-08-15', updatedAt: '2026-09-08' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Richmond', address: 'Flat 2, 65 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_075_000, bathrooms: 1, areaSqm: 76, status: 'under_offer', lat: 51.4618, lng: -0.3032, listedAt: '2026-08-28', updatedAt: '2026-09-27' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Richmond', address: '24 Demo Boulevard', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 1_125_000, bathrooms: 3, areaSqm: 218, status: 'available', lat: 51.4610, lng: -0.3042, listedAt: '2026-09-20', updatedAt: '2026-09-20' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Richmond', address: 'Flat 7, 51 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_525, bathrooms: 2, areaSqm: 78, furnishing: 'furnished', status: 'available', lat: 51.4615, lng: -0.3028, listedAt: '2026-10-04', updatedAt: '2026-10-09' , epcRating: 'C', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-11-15' },

  // Putney (4)
  { neighborhood: 'Putney', address: 'Flat 4, 36 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_175_000, bathrooms: 1, areaSqm: 76, status: 'available', lat: 51.4620, lng: -0.2175, listedAt: '2026-09-12', updatedAt: '2026-09-23' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Putney', address: '18 Sample Street', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 1_225_000, bathrooms: 2, areaSqm: 158, status: 'available', lat: 51.4625, lng: -0.2170, listedAt: '2026-08-20', updatedAt: '2026-09-05' , epcRating: 'B', hasGarden: true, hasParking: false, tenure: 'freehold' },
  { neighborhood: 'Putney', address: 'Flat 8, 72 Example Avenue', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_600, bathrooms: 1, areaSqm: 52, furnishing: 'part_furnished', status: 'available', lat: 51.4617, lng: -0.2180, listedAt: '2026-10-01', updatedAt: '2026-10-06' , epcRating: 'D', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-11-03' },
  { neighborhood: 'Putney', address: 'Flat 3, 29 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_675, bathrooms: 1, areaSqm: 64, furnishing: 'furnished', status: 'available', lat: 51.4622, lng: -0.2172, listedAt: '2026-09-26', updatedAt: '2026-10-03' , epcRating: 'B', hasGarden: true, hasParking: false, availableFrom: '2026-10-02' },

  // Stratford (3) — east residential
  { neighborhood: 'Stratford', address: 'Flat 10, 55 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_275_000, bathrooms: 1, areaSqm: 64, status: 'available', lat: 51.5440, lng: -0.0160, listedAt: '2026-09-08', updatedAt: '2026-09-21' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Stratford', address: 'Flat 6, 27 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_750, bathrooms: 1, areaSqm: 44, furnishing: 'unfurnished', status: 'available', lat: 51.5445, lng: -0.0155, listedAt: '2026-10-05', updatedAt: '2026-10-08' , epcRating: 'B', hasGarden: false, hasParking: false, availableFrom: '2026-11-26' },
  { neighborhood: 'Stratford', address: 'Flat 3, 84 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_825, bathrooms: 1, areaSqm: 60, furnishing: 'furnished', status: 'available', lat: 51.5437, lng: -0.0165, listedAt: '2026-09-29', updatedAt: '2026-10-04' , epcRating: 'D', hasGarden: false, hasParking: false, petsAllowed: true, billsIncluded: true, availableFrom: '2026-10-14' },
]);

// ---------------------------------------------------------------------------
// Manchester (GBP) — 25
// ---------------------------------------------------------------------------

const manchester = city('GB', 'Manchester', 'gb-man', [
  // Northern Quarter (3) — hip city centre
  { neighborhood: 'Northern Quarter', address: 'Flat 4, 56 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_900, bathrooms: 1, areaSqm: 58, furnishing: 'furnished', status: 'available', lat: 53.4845, lng: -2.2340, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'A', hasGarden: false, hasParking: false, availableFrom: '2026-11-11' },
  { neighborhood: 'Northern Quarter', address: 'Flat 9, 23 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_975, bathrooms: 1, areaSqm: 68, furnishing: 'part_furnished', status: 'available', lat: 53.4847, lng: -2.2335, listedAt: '2026-09-28', updatedAt: '2026-10-05' , epcRating: 'D', hasGarden: false, hasParking: true, availableFrom: '2026-09-29' },
  { neighborhood: 'Northern Quarter', address: 'Flat 7, 41 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_325_000, bathrooms: 1, areaSqm: 72, status: 'available', lat: 53.4842, lng: -2.2345, listedAt: '2026-09-12', updatedAt: '2026-09-22' , epcRating: 'G', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Ancoats (4) — regenerated inner-city
  { neighborhood: 'Ancoats', address: 'Flat 2, 31 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 5_050, bathrooms: 1, areaSqm: 60, furnishing: 'part_furnished', status: 'available', lat: 53.4840, lng: -2.2280, listedAt: '2026-10-02', updatedAt: '2026-10-02' , epcRating: 'D', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-11-18' },
  { neighborhood: 'Ancoats', address: 'Flat 11, 58 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_125, bathrooms: 2, areaSqm: 74, furnishing: 'furnished', status: 'available', lat: 53.4842, lng: -2.2275, listedAt: '2026-09-25', updatedAt: '2026-10-01' , epcRating: 'F', hasGarden: false, hasParking: false, availableFrom: '2026-10-05' },
  { neighborhood: 'Ancoats', address: 'Flat 5, 19 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_375_000, bathrooms: 2, areaSqm: 70, status: 'available', lat: 53.4838, lng: -2.2285, listedAt: '2026-09-05', updatedAt: '2026-09-15' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Ancoats', address: 'Flat 8, 44 Example Avenue', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 1_425_000, bathrooms: 1, areaSqm: 54, status: 'under_offer', lat: 53.4844, lng: -2.2278, listedAt: '2026-08-18', updatedAt: '2026-09-20' , epcRating: 'E', hasGarden: true, hasParking: true, tenure: 'leasehold', newBuild: true },

  // Didsbury (3) — leafy south suburb
  { neighborhood: 'Didsbury', address: '68 Demo Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 1_475_000, bathrooms: 2, areaSqm: 115, status: 'available', lat: 53.4170, lng: -2.2320, listedAt: '2026-09-09', updatedAt: '2026-09-16' , epcRating: 'C', hasGarden: false, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Didsbury', address: 'Flat 3, 25 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_200, bathrooms: 1, areaSqm: 68, furnishing: 'furnished', status: 'available', lat: 53.4175, lng: -2.2315, listedAt: '2026-10-01', updatedAt: '2026-10-06' , epcRating: 'E', hasGarden: false, hasParking: false, availableFrom: '2026-10-19' },
  { neighborhood: 'Didsbury', address: '42 Sample Mews', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 1_525_000, bathrooms: 3, areaSqm: 168, status: 'available', lat: 53.4165, lng: -2.2325, listedAt: '2026-08-28', updatedAt: '2026-09-14' , epcRating: 'C', hasGarden: true, hasParking: false, tenure: 'leasehold' },

  // Castlefield (3) — canalside
  { neighborhood: 'Castlefield', address: 'Flat 7, 36 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_275, bathrooms: 2, areaSqm: 76, furnishing: 'furnished', status: 'available', lat: 53.4760, lng: -2.2560, listedAt: '2026-10-03', updatedAt: '2026-10-07' , epcRating: 'E', hasGarden: true, hasParking: false, petsAllowed: true, availableFrom: '2026-11-04' },
  { neighborhood: 'Castlefield', address: 'Flat 2, 14 Demo Boulevard', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 5_350, bathrooms: 1, areaSqm: 52, furnishing: 'unfurnished', status: 'available', lat: 53.4763, lng: -2.2555, listedAt: '2026-09-26', updatedAt: '2026-10-02' , epcRating: 'C', hasGarden: false, hasParking: false, availableFrom: '2026-10-05' },
  { neighborhood: 'Castlefield', address: 'Flat 5, 48 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_575_000, bathrooms: 1, areaSqm: 72, status: 'available', lat: 53.4758, lng: -2.2565, listedAt: '2026-09-11', updatedAt: '2026-09-11' , epcRating: 'E', hasGarden: false, hasParking: true, tenure: 'leasehold' },

  // Deansgate (3) — central
  { neighborhood: 'Deansgate', address: 'Flat 12, 61 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_425, bathrooms: 2, areaSqm: 82, furnishing: 'furnished', status: 'available', lat: 53.4760, lng: -2.2510, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'C', hasGarden: false, hasParking: true, availableFrom: '2026-10-27' },
  { neighborhood: 'Deansgate', address: 'Flat 4, 27 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 1_625_000, bathrooms: 1, areaSqm: 56, status: 'available', lat: 53.4763, lng: -2.2505, listedAt: '2026-09-15', updatedAt: '2026-09-23' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Deansgate', address: 'Flat 9, 45 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_675_000, bathrooms: 2, areaSqm: 86, status: 'under_offer', lat: 53.4758, lng: -2.2515, listedAt: '2026-08-24', updatedAt: '2026-09-25' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Chorlton (2) — suburban
  { neighborhood: 'Chorlton', address: '19 Demo Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 1_725_000, bathrooms: 2, areaSqm: 125, status: 'available', lat: 53.4420, lng: -2.2755, listedAt: '2026-09-06', updatedAt: '2026-09-18' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Chorlton', address: 'Flat 5, 72 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_500, bathrooms: 1, areaSqm: 65, furnishing: 'part_furnished', status: 'available', lat: 53.4425, lng: -2.2750, listedAt: '2026-10-02', updatedAt: '2026-10-05' , epcRating: 'C', hasGarden: true, hasParking: false, petsAllowed: true, availableFrom: '2026-10-27' },

  // Fallowfield (2) — student heavy
  { neighborhood: 'Fallowfield', address: '34 Example Road', type: 'house', bedrooms: 4, pricePeriod: 'monthly', price: 5_575, bathrooms: 2, areaSqm: 148, furnishing: 'furnished', status: 'available', lat: 53.4420, lng: -2.2170, listedAt: '2026-09-18', updatedAt: '2026-09-28' , epcRating: 'D', hasGarden: true, hasParking: true, petsAllowed: true, availableFrom: '2026-11-05' },
  { neighborhood: 'Fallowfield', address: 'Flat 3, 51 Placeholder Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_650, bathrooms: 1, areaSqm: 56, furnishing: 'furnished', status: 'let', lat: 53.4418, lng: -2.2175, listedAt: '2026-08-10', updatedAt: '2026-09-01' , epcRating: 'C', hasGarden: true, hasParking: true, billsIncluded: true, availableFrom: '2026-08-21' },

  // Salford Quays (2) — waterfront
  { neighborhood: 'Salford Quays', address: 'Flat 15, 28 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_725, bathrooms: 1, areaSqm: 72, furnishing: 'furnished', status: 'available', lat: 53.4720, lng: -2.2910, listedAt: '2026-10-05', updatedAt: '2026-10-09' , epcRating: 'D', hasGarden: true, hasParking: false, availableFrom: '2026-11-08' },
  { neighborhood: 'Salford Quays', address: 'Flat 8, 65 Demo Boulevard', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 1_775_000, bathrooms: 1, areaSqm: 50, status: 'available', lat: 53.4718, lng: -2.2915, listedAt: '2026-09-20', updatedAt: '2026-10-01' , epcRating: 'B', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Spinningfields (2) — business district
  { neighborhood: 'Spinningfields', address: 'Flat 11, 42 Sample Street', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 5_800, bathrooms: 1, areaSqm: 54, furnishing: 'furnished', status: 'available', lat: 53.4800, lng: -2.2520, listedAt: '2026-10-03', updatedAt: '2026-10-07' , epcRating: 'D', hasGarden: false, hasParking: false, billsIncluded: true, availableFrom: '2026-10-23' },
  { neighborhood: 'Spinningfields', address: 'Flat 7, 19 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_875, bathrooms: 2, areaSqm: 78, furnishing: 'part_furnished', status: 'available', lat: 53.4802, lng: -2.2518, listedAt: '2026-09-24', updatedAt: '2026-10-02' , epcRating: 'B', hasGarden: false, hasParking: false, availableFrom: '2026-11-06' },

  // MediaCityUK (1) — media/tech hub
  { neighborhood: 'MediaCityUK', address: 'Flat 6, 23 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_950, bathrooms: 2, areaSqm: 76, furnishing: 'furnished', status: 'available', lat: 53.4720, lng: -2.2970, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'D', hasGarden: false, hasParking: true, availableFrom: '2026-10-10' },
]);

// ---------------------------------------------------------------------------
// Birmingham (GBP) — 20
// ---------------------------------------------------------------------------

const birmingham = city('GB', 'Birmingham', 'gb-bhm', [
  // Jewellery Quarter (3)
  { neighborhood: 'Jewellery Quarter', address: 'Flat 3, 31 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 6_025, bathrooms: 2, areaSqm: 86, furnishing: 'unfurnished', status: 'let', lat: 52.4870, lng: -1.9085, listedAt: '2026-08-12', updatedAt: '2026-08-12' , epcRating: 'B', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-09-10' },
  { neighborhood: 'Jewellery Quarter', address: 'Flat 8, 56 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 6_100, bathrooms: 1, areaSqm: 48, furnishing: 'furnished', status: 'available', lat: 52.4875, lng: -1.9080, listedAt: '2026-10-02', updatedAt: '2026-10-07' , epcRating: 'D', hasGarden: false, hasParking: false, availableFrom: '2026-11-23' },
  { neighborhood: 'Jewellery Quarter', address: 'Flat 5, 24 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_825_000, bathrooms: 1, areaSqm: 68, status: 'available', lat: 52.4868, lng: -1.9088, listedAt: '2026-09-14', updatedAt: '2026-09-24' , epcRating: 'A', hasGarden: false, hasParking: false, tenure: 'leasehold' },

  // Edgbaston (3) — leafy
  { neighborhood: 'Edgbaston', address: '19 Example Road', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 1_875_000, bathrooms: 2, areaSqm: 142, status: 'available', lat: 52.4610, lng: -1.9330, listedAt: '2026-08-30', updatedAt: '2026-09-21' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Edgbaston', address: '47 Demo Lane', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 1_925_000, bathrooms: 3, areaSqm: 185, status: 'available', lat: 52.4615, lng: -1.9325, listedAt: '2026-09-05', updatedAt: '2026-09-18' , epcRating: 'G', hasGarden: true, hasParking: false, tenure: 'freehold', newBuild: true },
  { neighborhood: 'Edgbaston', address: 'Flat 2, 72 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 6_175, bathrooms: 1, areaSqm: 72, furnishing: 'part_furnished', status: 'available', lat: 52.4608, lng: -1.9335, listedAt: '2026-10-03', updatedAt: '2026-10-08' , epcRating: 'D', hasGarden: false, hasParking: true, availableFrom: '2026-11-08' },

  // Harborne (3)
  { neighborhood: 'Harborne', address: '68 Demo Lane', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 1_975_000, bathrooms: 3, areaSqm: 186, status: 'available', lat: 52.4590, lng: -1.9600, listedAt: '2026-09-17', updatedAt: '2026-09-17' , epcRating: 'F', hasGarden: false, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Harborne', address: '28 Placeholder Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 2_025_000, bathrooms: 2, areaSqm: 128, status: 'under_offer', lat: 52.4595, lng: -1.9595, listedAt: '2026-08-26', updatedAt: '2026-09-29' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Harborne', address: 'Flat 4, 51 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 6_250, bathrooms: 1, areaSqm: 68, furnishing: 'furnished', status: 'available', lat: 52.4588, lng: -1.9605, listedAt: '2026-10-04', updatedAt: '2026-10-09' , epcRating: 'E', hasGarden: false, hasParking: false, availableFrom: '2026-10-31' },

  // Digbeth (3) — creative quarter
  { neighborhood: 'Digbeth', address: 'Flat 12, 38 Example Avenue', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 6_325, bathrooms: 1, areaSqm: 46, furnishing: 'furnished', status: 'available', lat: 52.4740, lng: -1.8870, listedAt: '2026-10-01', updatedAt: '2026-10-06' , epcRating: 'C', hasGarden: false, hasParking: false, availableFrom: '2026-10-05' },
  { neighborhood: 'Digbeth', address: 'Flat 7, 25 Sample Mews', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 6_400, bathrooms: 1, areaSqm: 72, furnishing: 'part_furnished', status: 'available', lat: 52.4745, lng: -1.8865, listedAt: '2026-09-22', updatedAt: '2026-10-02' , epcRating: 'E', hasGarden: false, hasParking: false, availableFrom: '2026-11-02' },
  { neighborhood: 'Digbeth', address: 'Flat 9, 61 Demo Boulevard', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 2_075_000, bathrooms: 2, areaSqm: 76, status: 'available', lat: 52.4738, lng: -1.8875, listedAt: '2026-09-08', updatedAt: '2026-09-19' , epcRating: 'C', hasGarden: false, hasParking: true, tenure: 'leasehold' },

  // Moseley (2) — bohemian
  { neighborhood: 'Moseley', address: '42 Example Road', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 2_125_000, bathrooms: 2, areaSqm: 132, status: 'available', lat: 52.4480, lng: -1.8930, listedAt: '2026-09-10', updatedAt: '2026-09-22' , epcRating: 'E', hasGarden: true, hasParking: true, tenure: 'freehold', newBuild: true },
  { neighborhood: 'Moseley', address: 'Flat 3, 55 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 6_475, bathrooms: 1, areaSqm: 50, furnishing: 'unfurnished', status: 'available', lat: 52.4485, lng: -1.8925, listedAt: '2026-10-03', updatedAt: '2026-10-07' , epcRating: 'C', hasGarden: false, hasParking: false, availableFrom: '2026-11-04' },

  // Kings Heath (2)
  { neighborhood: 'Kings Heath', address: '34 Demo Boulevard', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 2_175_000, bathrooms: 2, areaSqm: 124, status: 'available', lat: 52.4350, lng: -1.8930, listedAt: '2026-09-02', updatedAt: '2026-09-15' , epcRating: 'E', hasGarden: true, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Kings Heath', address: '18 Sample Street', type: 'townhouse', bedrooms: 3, pricePeriod: 'monthly', price: 6_550, bathrooms: 2, areaSqm: 138, furnishing: 'furnished', status: 'available', lat: 52.4355, lng: -1.8925, listedAt: '2026-10-05', updatedAt: '2026-10-09' , epcRating: 'C', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-11-04' },

  // Bournville (2) — garden village
  { neighborhood: 'Bournville', address: '27 Mockup Place', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 2_225_000, bathrooms: 2, areaSqm: 142, status: 'available', lat: 52.4290, lng: -1.9440, listedAt: '2026-09-14', updatedAt: '2026-09-14' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'freehold' },
  { neighborhood: 'Bournville', address: '53 Example Avenue', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 2_275_000, bathrooms: 3, areaSqm: 178, status: 'under_offer', lat: 52.4295, lng: -1.9435, listedAt: '2026-08-17', updatedAt: '2026-09-26' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold', newBuild: true },

  // Selly Oak (2)
  { neighborhood: 'Selly Oak', address: '41 Demo Lane', type: 'house', bedrooms: 4, pricePeriod: 'monthly', price: 6_625, bathrooms: 2, areaSqm: 148, furnishing: 'furnished', status: 'available', lat: 52.4460, lng: -1.9400, listedAt: '2026-09-25', updatedAt: '2026-10-04' , epcRating: 'D', hasGarden: true, hasParking: true, petsAllowed: true, availableFrom: '2026-11-03' },
  { neighborhood: 'Selly Oak', address: '63 Placeholder Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 2_325_000, bathrooms: 2, areaSqm: 118, status: 'available', lat: 52.4465, lng: -1.9395, listedAt: '2026-09-03', updatedAt: '2026-09-16' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'freehold' },
]);

// ---------------------------------------------------------------------------
// Bristol (GBP) — 20
// ---------------------------------------------------------------------------

const bristol = city('GB', 'Bristol', 'gb-bri', [
  // Clifton (3) — upmarket Georgian
  { neighborhood: 'Clifton', address: 'Flat 4, 26 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 2_375_000, bathrooms: 2, areaSqm: 92, status: 'available', lat: 51.4617, lng: -2.6150, listedAt: '2026-09-04', updatedAt: '2026-09-18' , epcRating: 'D', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Clifton', address: '48 Demo Boulevard', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 2_425_000, bathrooms: 3, areaSqm: 215, status: 'available', lat: 51.4620, lng: -2.6145, listedAt: '2026-08-22', updatedAt: '2026-09-12' , epcRating: 'C', hasGarden: true, hasParking: false, tenure: 'freehold' },
  { neighborhood: 'Clifton', address: 'Flat 2, 73 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 6_700, bathrooms: 1, areaSqm: 54, furnishing: 'furnished', status: 'available', lat: 51.4614, lng: -2.6155, listedAt: '2026-10-04', updatedAt: '2026-10-08' , epcRating: 'D', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-10-15' },

  // Redland (3) — leafy
  { neighborhood: 'Redland', address: '34 Example Road', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 2_475_000, bathrooms: 3, areaSqm: 198, status: 'under_offer', lat: 51.4717, lng: -2.6050, listedAt: '2026-08-19', updatedAt: '2026-09-27' , epcRating: 'B', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Redland', address: '19 Placeholder Lane', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 2_600_000, bathrooms: 2, areaSqm: 162, status: 'available', lat: 51.4720, lng: -2.6045, listedAt: '2026-09-10', updatedAt: '2026-09-23' , epcRating: 'D', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Redland', address: 'Flat 5, 52 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 6_775, bathrooms: 1, areaSqm: 72, furnishing: 'part_furnished', status: 'available', lat: 51.4714, lng: -2.6055, listedAt: '2026-10-02', updatedAt: '2026-10-07' , epcRating: 'B', hasGarden: false, hasParking: false, availableFrom: '2026-11-11' },

  // Bedminster (3) — up-and-coming south
  { neighborhood: 'Bedminster', address: '47 Sample Street', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 2_740_000, bathrooms: 2, areaSqm: 118, status: 'available', lat: 51.4421, lng: -2.5986, listedAt: '2026-09-12', updatedAt: '2026-09-21' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Bedminster', address: 'Flat 3, 24 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 6_850, bathrooms: 1, areaSqm: 62, furnishing: 'furnished', status: 'available', lat: 51.4425, lng: -2.5980, listedAt: '2026-10-01', updatedAt: '2026-10-06' , epcRating: 'B', hasGarden: true, hasParking: false, billsIncluded: true, availableFrom: '2026-11-24' },
  { neighborhood: 'Bedminster', address: 'Flat 7, 61 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 2_880_000, bathrooms: 1, areaSqm: 50, status: 'available', lat: 51.4418, lng: -2.5992, listedAt: '2026-09-07', updatedAt: '2026-09-07' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'leasehold' },

  // Southville (3) — hipster
  { neighborhood: 'Southville', address: 'Flat 8, 35 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 6_925, bathrooms: 1, areaSqm: 66, furnishing: 'furnished', status: 'available', lat: 51.4458, lng: -2.6013, listedAt: '2026-10-03', updatedAt: '2026-10-08' , epcRating: 'A', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-10-11' },
  { neighborhood: 'Southville', address: '28 Mockup Place', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 3_020_000, bathrooms: 2, areaSqm: 125, status: 'available', lat: 51.4462, lng: -2.6008, listedAt: '2026-08-28', updatedAt: '2026-09-15' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Southville', address: '72 Sample Mews', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 3_160_000, bathrooms: 2, areaSqm: 148, status: 'available', lat: 51.4455, lng: -2.6018, listedAt: '2026-09-19', updatedAt: '2026-09-19' , epcRating: 'G', hasGarden: false, hasParking: false, tenure: 'freehold' },

  // Easton (2) — diverse
  { neighborhood: 'Easton', address: '41 Example Road', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 3_300_000, bathrooms: 1, areaSqm: 112, status: 'available', lat: 51.4625, lng: -2.5635, listedAt: '2026-09-08', updatedAt: '2026-09-22' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Easton', address: 'Flat 2, 56 Demo Boulevard', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 7_000, bathrooms: 1, areaSqm: 50, furnishing: 'unfurnished', status: 'available', lat: 51.4628, lng: -2.5630, listedAt: '2026-10-05', updatedAt: '2026-10-09' , epcRating: 'F', hasGarden: false, hasParking: false, availableFrom: '2026-11-10' },

  // Montpelier (2) — bohemian
  { neighborhood: 'Montpelier', address: '18 Placeholder Lane', type: 'house', bedrooms: 2, pricePeriod: 'total', price: 3_440_000, bathrooms: 1, areaSqm: 98, status: 'available', lat: 51.4720, lng: -2.5840, listedAt: '2026-09-16', updatedAt: '2026-09-16' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Montpelier', address: 'Flat 5, 29 Sample Street', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 7_075, bathrooms: 1, areaSqm: 52, furnishing: 'furnished', status: 'let', lat: 51.4718, lng: -2.5845, listedAt: '2026-08-23', updatedAt: '2026-09-10' , epcRating: 'E', hasGarden: false, hasParking: true, petsAllowed: true, availableFrom: '2026-09-18' },

  // Totterdown (2) — hillside colourful
  { neighborhood: 'Totterdown', address: '53 Demo Lane', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 3_580_000, bathrooms: 2, areaSqm: 128, status: 'available', lat: 51.4404, lng: -2.5825, listedAt: '2026-09-02', updatedAt: '2026-09-14' , epcRating: 'C', hasGarden: false, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Totterdown', address: 'Flat 3, 46 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 7_150, bathrooms: 1, areaSqm: 60, furnishing: 'part_furnished', status: 'available', lat: 51.4408, lng: -2.5820, listedAt: '2026-10-04', updatedAt: '2026-10-09' , epcRating: 'E', hasGarden: true, hasParking: false, availableFrom: '2026-10-16' },

  // Stokes Croft (2) — street art hub
  { neighborhood: 'Stokes Croft', address: 'Flat 6, 24 Example Road', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 7_225, bathrooms: 1, areaSqm: 46, furnishing: 'furnished', status: 'available', lat: 51.4631, lng: -2.5868, listedAt: '2026-10-02', updatedAt: '2026-10-06' , epcRating: 'C', hasGarden: false, hasParking: false, petsAllowed: true, availableFrom: '2026-11-06' },
  { neighborhood: 'Stokes Croft', address: 'Flat 9, 71 Mockup Place', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 3_720_000, bathrooms: 1, areaSqm: 68, status: 'under_offer', lat: 51.4634, lng: -2.5864, listedAt: '2026-08-15', updatedAt: '2026-09-25' , epcRating: 'E', hasGarden: false, hasParking: false, tenure: 'leasehold' },
]);

// ---------------------------------------------------------------------------
// Edinburgh (GBP) — 15
// ---------------------------------------------------------------------------

const edinburgh = city('GB', 'Edinburgh', 'gb-edi', [
  // New Town (3) — Georgian centre
  { neighborhood: 'New Town', address: 'Flat 3, 42 Example Avenue', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 3_860_000, bathrooms: 1, areaSqm: 88, status: 'available', lat: 55.9565, lng: -3.1990, listedAt: '2026-09-05', updatedAt: '2026-09-18' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'leasehold', newBuild: true },
  { neighborhood: 'New Town', address: 'Flat 7, 19 Sample Street', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 7_300, bathrooms: 1, areaSqm: 58, furnishing: 'furnished', status: 'available', lat: 55.9568, lng: -3.1985, listedAt: '2026-10-03', updatedAt: '2026-10-08' , epcRating: 'E', hasGarden: false, hasParking: true, availableFrom: '2026-11-16' },
  { neighborhood: 'New Town', address: '58 Demo Boulevard', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 4_000_000, bathrooms: 3, areaSqm: 212, status: 'under_offer', lat: 55.9562, lng: -3.1995, listedAt: '2026-08-18', updatedAt: '2026-09-24' , epcRating: 'C', hasGarden: true, hasParking: true, tenure: 'leasehold' },

  // Leith (3) — waterfront
  { neighborhood: 'Leith', address: 'Flat 5, 36 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 7_375, bathrooms: 1, areaSqm: 72, furnishing: 'part_furnished', status: 'available', lat: 55.9754, lng: -3.1700, listedAt: '2026-10-04', updatedAt: '2026-10-09' , epcRating: 'D', hasGarden: false, hasParking: false, availableFrom: '2026-11-03' },
  { neighborhood: 'Leith', address: 'Flat 9, 47 Sample Mews', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 4_140_000, bathrooms: 1, areaSqm: 52, status: 'available', lat: 55.9758, lng: -3.1695, listedAt: '2026-09-14', updatedAt: '2026-09-14' , epcRating: 'C', hasGarden: false, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Leith', address: '28 Example Road', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 4_280_000, bathrooms: 2, areaSqm: 148, status: 'available', lat: 55.9750, lng: -3.1705, listedAt: '2026-08-27', updatedAt: '2026-09-12' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'freehold', newBuild: true },

  // Stockbridge (3)
  { neighborhood: 'Stockbridge', address: 'Flat 4, 24 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 4_420_000, bathrooms: 2, areaSqm: 82, status: 'available', lat: 55.9589, lng: -3.2080, listedAt: '2026-09-09', updatedAt: '2026-09-23' , epcRating: 'C', hasGarden: false, hasParking: true, tenure: 'leasehold' },
  { neighborhood: 'Stockbridge', address: '53 Mockup Place', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 4_560_000, bathrooms: 2, areaSqm: 158, status: 'available', lat: 55.9593, lng: -3.2075, listedAt: '2026-08-14', updatedAt: '2026-09-08' , epcRating: 'D', hasGarden: true, hasParking: true, tenure: 'freehold' },
  { neighborhood: 'Stockbridge', address: 'Flat 6, 41 Placeholder Lane', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 7_450, bathrooms: 1, areaSqm: 54, furnishing: 'furnished', status: 'available', lat: 55.9585, lng: -3.2084, listedAt: '2026-10-02', updatedAt: '2026-10-07' , epcRating: 'C', hasGarden: false, hasParking: false, availableFrom: '2026-11-06' },

  // Marchmont (2) — tenement area
  { neighborhood: 'Marchmont', address: 'Flat 3, 19 Example Avenue', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 4_700_000, bathrooms: 2, areaSqm: 108, status: 'available', lat: 55.9400, lng: -3.1900, listedAt: '2026-09-18', updatedAt: '2026-09-18' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'leasehold' },
  { neighborhood: 'Marchmont', address: 'Flat 7, 56 Sample Street', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 7_525, bathrooms: 1, areaSqm: 76, furnishing: 'furnished', status: 'available', lat: 55.9404, lng: -3.1895, listedAt: '2026-10-05', updatedAt: '2026-10-09' , epcRating: 'B', hasGarden: true, hasParking: false, billsIncluded: true, availableFrom: '2026-11-23' },

  // Morningside (2) — upmarket
  { neighborhood: 'Morningside', address: '42 Demo Boulevard', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 4_840_000, bathrooms: 3, areaSqm: 192, status: 'available', lat: 55.9290, lng: -3.2130, listedAt: '2026-08-22', updatedAt: '2026-09-16' , epcRating: 'D', hasGarden: true, hasParking: false, tenure: 'freehold' },
  { neighborhood: 'Morningside', address: 'Flat 2, 65 Example Road', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 7_600, bathrooms: 1, areaSqm: 68, furnishing: 'part_furnished', status: 'available', lat: 55.9294, lng: -3.2125, listedAt: '2026-10-01', updatedAt: '2026-10-06' , epcRating: 'B', hasGarden: true, hasParking: true, availableFrom: '2026-10-04' },

  // Bruntsfield (2) — residential
  { neighborhood: 'Bruntsfield', address: 'Flat 4, 29 Demo Lane', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 4_980_000, bathrooms: 1, areaSqm: 84, status: 'available', lat: 55.9400, lng: -3.2030, listedAt: '2026-09-11', updatedAt: '2026-09-21' , epcRating: 'D', hasGarden: false, hasParking: true, tenure: 'leasehold', newBuild: true },
  { neighborhood: 'Bruntsfield', address: 'Flat 8, 38 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 7_675, bathrooms: 1, areaSqm: 50, furnishing: 'unfurnished', status: 'let', lat: 55.9403, lng: -3.2025, listedAt: '2026-08-10', updatedAt: '2026-09-02' , epcRating: 'B', hasGarden: false, hasParking: false, availableFrom: '2026-08-27' },
]);

export const properties: readonly Property[] = [
  ...london,
  ...manchester,
  ...birmingham,
  ...bristol,
  ...edinburgh,
];
