import { MARKETS } from './markets';
import { PHOTO_POOLS } from './images';
import type {
  Bedrooms,
  CountryCode,
  Furnishing,
  ListingStatus,
  PricePeriod,
  Property,
  PropertyType,
} from '../types/property';

/**
 * 80 fictional listings: 52 US, 20 TR, 8 GB.
 *
 * Cities and neighborhoods are real so markers cluster the way real listings
 * would, but every address is fictional on purpose: street names such as
 * "Sample Street", "Örnek Sokak" or "Example Road" make that obvious and avoid
 * pointing at real homes. Coordinates are approximate points inside each
 * neighborhood, not buildings. Prices, dates, bathrooms, floor areas and
 * furnishing are invented. Titles and descriptions are generated from those
 * fields and say they are demo data. Sale prices
 * are total asking prices; rents are per month. Every value is hard-coded, so
 * the dataset is the same on every build.
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
  // No floor area here: the detail view states it in the viewer's chosen unit.
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
    id: `${idPrefix}-${String(i + 1).padStart(2, '0')}`,
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
  }));
}

// ---------------------------------------------------------------------------
// United States (USD) — 52
// ---------------------------------------------------------------------------

const newYork = city('US', 'New York', 'us-nyc', [
  { neighborhood: 'Upper West Side', address: '98 Demo Boulevard, Unit 3A', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 1_650_000, bathrooms: 1, areaSqm: 94, status: 'available', lat: 40.7869, lng: -73.9772, listedAt: '2026-09-21', updatedAt: '2026-10-05' },
  { neighborhood: 'Upper East Side', address: '46 Mockup Place, Unit 9B', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_350, bathrooms: 1, areaSqm: 45, furnishing: 'furnished', status: 'available', lat: 40.7689, lng: -73.9561, listedAt: '2026-10-02', updatedAt: '2026-10-08' },
  { neighborhood: 'Chelsea', address: '83 Sample Street, Unit 15C', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 3_450, bathrooms: 1, areaSqm: 43, furnishing: 'unfurnished', status: 'available', lat: 40.7467, lng: -74.0031, listedAt: '2026-09-30', updatedAt: '2026-10-07' },
  { neighborhood: 'Harlem', address: '31 Example Avenue', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 2_450_000, bathrooms: 2, areaSqm: 215, status: 'under_offer', lat: 40.8113, lng: -73.9431, listedAt: '2026-08-04', updatedAt: '2026-09-23' },
  { neighborhood: 'Williamsburg', address: '68 Placeholder Lane, Unit 12A', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 4_100, bathrooms: 1, areaSqm: 51, furnishing: 'part_furnished', status: 'available', lat: 40.7178, lng: -73.9583, listedAt: '2026-10-05', updatedAt: '2026-10-09' },
  { neighborhood: 'Park Slope', address: '16 Demo Boulevard', type: 'townhouse', bedrooms: 5, pricePeriod: 'total', price: 3_850_000, bathrooms: 3, areaSqm: 307, status: 'available', lat: 40.6728, lng: -73.9790, listedAt: '2026-09-12', updatedAt: '2026-09-21' },
  { neighborhood: 'Astoria', address: '53 Mockup Place, Unit 9C', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 3_300, bathrooms: 1, areaSqm: 92, furnishing: 'furnished', status: 'let', lat: 40.7624, lng: -73.9218, listedAt: '2026-08-19', updatedAt: '2026-09-03' },
  { neighborhood: 'Long Island City', address: '90 Sample Street, Unit 14D', type: 'apartment', bedrooms: 0, pricePeriod: 'total', price: 615_000, bathrooms: 1, areaSqm: 39, status: 'available', lat: 40.7470, lng: -73.9420, listedAt: '2026-09-27', updatedAt: '2026-09-29' },
  { neighborhood: 'Tribeca', address: '38 Example Avenue, Unit 6A', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 4_950_000, bathrooms: 3, areaSqm: 130, status: 'available', lat: 40.7182, lng: -74.0063, listedAt: '2026-09-03', updatedAt: '2026-09-03' },
  { neighborhood: 'East Village', address: '75 Placeholder Lane, Unit 11B', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 3_950, bathrooms: 1, areaSqm: 69, furnishing: 'part_furnished', status: 'available', lat: 40.7247, lng: -73.9806, listedAt: '2026-10-06', updatedAt: '2026-10-08' },
  { neighborhood: 'Bushwick', address: '23 Demo Boulevard, Unit 2C', type: 'apartment', bedrooms: 3, pricePeriod: 'monthly', price: 4_200, bathrooms: 3, areaSqm: 122, furnishing: 'furnished', status: 'available', lat: 40.7008, lng: -73.9230, listedAt: '2026-09-25', updatedAt: '2026-10-02' },
  { neighborhood: 'Forest Hills', address: '60 Mockup Place', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 1_875_000, bathrooms: 3, areaSqm: 192, status: 'sold', lat: 40.7188, lng: -73.8468, listedAt: '2026-07-14', updatedAt: '2026-10-04' },
]);

const losAngeles = city('US', 'Los Angeles', 'us-la', [
  { neighborhood: 'Silver Lake', address: '42 Example Avenue', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 1_595_000, bathrooms: 2, areaSqm: 118, status: 'available', lat: 34.0905, lng: -118.2697, listedAt: '2026-09-18', updatedAt: '2026-09-28' },
  { neighborhood: 'Santa Monica', address: '79 Placeholder Lane, Unit 10B', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 5_250, bathrooms: 2, areaSqm: 76, furnishing: 'furnished', status: 'available', lat: 34.0121, lng: -118.4810, listedAt: '2026-10-01', updatedAt: '2026-10-09' },
  { neighborhood: 'Venice', address: '27 Demo Boulevard', type: 'house', bedrooms: 2, pricePeriod: 'monthly', price: 6_400, bathrooms: 1, areaSqm: 81, furnishing: 'part_furnished', status: 'available', lat: 33.9935, lng: -118.4660, listedAt: '2026-09-22', updatedAt: '2026-09-28' },
  { neighborhood: 'Hollywood', address: '64 Mockup Place, Unit 5D', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_750, bathrooms: 1, areaSqm: 63, furnishing: 'unfurnished', status: 'available', lat: 34.1021, lng: -118.3307, listedAt: '2026-10-04', updatedAt: '2026-10-04' },
  { neighborhood: 'Beverly Hills', address: '12 Sample Street', type: 'villa', bedrooms: 6, pricePeriod: 'total', price: 8_950_000, bathrooms: 6, areaSqm: 597, status: 'available', lat: 34.0812, lng: -118.4078, listedAt: '2026-08-28', updatedAt: '2026-09-24' },
  { neighborhood: 'Echo Park', address: '49 Example Avenue, Unit 18B', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 1_950, bathrooms: 1, areaSqm: 34, furnishing: 'furnished', status: 'let', lat: 34.0811, lng: -118.2582, listedAt: '2026-08-11', updatedAt: '2026-08-22' },
  { neighborhood: 'Pasadena', address: '86 Placeholder Lane', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 1_725_000, bathrooms: 2, areaSqm: 199, status: 'under_offer', lat: 34.1350, lng: -118.1376, listedAt: '2026-08-30', updatedAt: '2026-09-07' },
  { neighborhood: 'Koreatown', address: '34 Demo Boulevard, Unit 16D', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 815_000, bathrooms: 2, areaSqm: 76, status: 'available', lat: 34.0617, lng: -118.3010, listedAt: '2026-09-15', updatedAt: '2026-09-21' },
  { neighborhood: 'Studio City', address: '71 Mockup Place', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 1_195_000, bathrooms: 2, areaSqm: 95, status: 'available', lat: 34.1440, lng: -118.3888, listedAt: '2026-09-09', updatedAt: '2026-09-23' },
  { neighborhood: 'Downtown', address: '19 Sample Street, Unit 11B', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 645_000, bathrooms: 1, areaSqm: 69, status: 'available', lat: 34.0445, lng: -118.2546, listedAt: '2026-09-29', updatedAt: '2026-09-30' },
]);

const miami = city('US', 'Miami', 'us-mia', [
  { neighborhood: 'Brickell', address: '65 Sample Street, Unit 2A', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 3_350, bathrooms: 1, areaSqm: 68, furnishing: 'unfurnished', status: 'available', lat: 25.7597, lng: -80.1893, listedAt: '2026-10-03', updatedAt: '2026-10-03' },
  { neighborhood: 'Brickell', address: '13 Example Avenue, Unit 10B', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 785_000, bathrooms: 2, areaSqm: 76, status: 'available', lat: 25.7662, lng: -80.1935, listedAt: '2026-09-17', updatedAt: '2026-10-05' },
  { neighborhood: 'South Beach', address: '50 Placeholder Lane, Unit 15C', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 2_450, bathrooms: 1, areaSqm: 38, furnishing: 'unfurnished', status: 'available', lat: 25.7869, lng: -80.1335, listedAt: '2026-09-26', updatedAt: '2026-10-06' },
  { neighborhood: 'Coconut Grove', address: '87 Demo Boulevard', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 2_350_000, bathrooms: 3, areaSqm: 261, status: 'available', lat: 25.7310, lng: -80.2407, listedAt: '2026-08-22', updatedAt: '2026-08-22' },
  { neighborhood: 'Coral Gables', address: '35 Mockup Place', type: 'villa', bedrooms: 5, pricePeriod: 'total', price: 3_200_000, bathrooms: 4, areaSqm: 369, status: 'under_offer', lat: 25.7387, lng: -80.2731, listedAt: '2026-08-07', updatedAt: '2026-09-18' },
  { neighborhood: 'Wynwood', address: '72 Sample Street, Unit 1B', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_900, bathrooms: 1, areaSqm: 64, furnishing: 'furnished', status: 'available', lat: 25.8016, lng: -80.2000, listedAt: '2026-10-07', updatedAt: '2026-10-08' },
  { neighborhood: 'Edgewater', address: '20 Example Avenue, Unit 10C', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 1_150_000, bathrooms: 3, areaSqm: 134, status: 'available', lat: 25.8065, lng: -80.1876, listedAt: '2026-09-11', updatedAt: '2026-09-11' },
  { neighborhood: 'Little Havana', address: '57 Placeholder Lane', type: 'townhouse', bedrooms: 2, pricePeriod: 'monthly', price: 3_100, bathrooms: 2, areaSqm: 85, furnishing: 'part_furnished', status: 'let', lat: 25.7647, lng: -80.2229, listedAt: '2026-08-15', updatedAt: '2026-08-26' },
]);

const sanFrancisco = city('US', 'San Francisco', 'us-sf', [
  { neighborhood: 'Mission District', address: '64 Demo Boulevard, Unit 3A', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 4_650, bathrooms: 1, areaSqm: 101, furnishing: 'part_furnished', status: 'available', lat: 37.7570, lng: -122.4192, listedAt: '2026-09-28', updatedAt: '2026-09-28' },
  { neighborhood: 'Noe Valley', address: '12 Mockup Place', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 2_295_000, bathrooms: 2, areaSqm: 128, status: 'available', lat: 37.7518, lng: -122.4322, listedAt: '2026-09-06', updatedAt: '2026-09-14' },
  { neighborhood: 'SoMa', address: '49 Sample Street, Unit 15C', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 2_850, bathrooms: 1, areaSqm: 28, furnishing: 'part_furnished', status: 'available', lat: 37.7759, lng: -122.3925, listedAt: '2026-10-02', updatedAt: '2026-10-03' },
  { neighborhood: 'Pacific Heights', address: '86 Example Avenue', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 4_150_000, bathrooms: 3, areaSqm: 178, status: 'available', lat: 37.7920, lng: -122.4405, listedAt: '2026-08-25', updatedAt: '2026-08-25' },
  { neighborhood: 'Sunset District', address: '34 Placeholder Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 1_485_000, bathrooms: 3, areaSqm: 139, status: 'under_offer', lat: 37.7531, lng: -122.4895, listedAt: '2026-08-18', updatedAt: '2026-08-18' },
  { neighborhood: 'Nob Hill', address: '71 Demo Boulevard, Unit 1B', type: 'apartment', bedrooms: 1, pricePeriod: 'total', price: 925_000, bathrooms: 1, areaSqm: 72, status: 'available', lat: 37.7929, lng: -122.4132, listedAt: '2026-09-20', updatedAt: '2026-09-20' },
  { neighborhood: 'Hayes Valley', address: '19 Mockup Place, Unit 8C', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 3_550, bathrooms: 1, areaSqm: 67, furnishing: 'unfurnished', status: 'available', lat: 37.7768, lng: -122.4250, listedAt: '2026-10-05', updatedAt: '2026-10-08' },
  { neighborhood: 'Bernal Heights', address: '56 Sample Street', type: 'house', bedrooms: 2, pricePeriod: 'monthly', price: 5_200, bathrooms: 2, areaSqm: 76, furnishing: 'furnished', status: 'let', lat: 37.7422, lng: -122.4170, listedAt: '2026-08-02', updatedAt: '2026-09-07' },
]);

const chicago = city('US', 'Chicago', 'us-chi', [
  { neighborhood: 'Lincoln Park', address: '87 Placeholder Lane', type: 'townhouse', bedrooms: 3, pricePeriod: 'total', price: 1_050_000, bathrooms: 2, areaSqm: 146, status: 'available', lat: 41.9200, lng: -87.6510, listedAt: '2026-09-14', updatedAt: '2026-09-27' },
  { neighborhood: 'Wicker Park', address: '35 Demo Boulevard, Unit 10B', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 2_650, bathrooms: 1, areaSqm: 78, furnishing: 'part_furnished', status: 'available', lat: 41.9097, lng: -87.6772, listedAt: '2026-10-01', updatedAt: '2026-10-07' },
  { neighborhood: 'West Loop', address: '72 Mockup Place, Unit 16C', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_395, bathrooms: 1, areaSqm: 64, furnishing: 'unfurnished', status: 'available', lat: 41.8830, lng: -87.6531, listedAt: '2026-09-24', updatedAt: '2026-10-03' },
  { neighborhood: 'Gold Coast', address: '20 Sample Street, Unit 7D', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 875_000, bathrooms: 3, areaSqm: 149, status: 'available', lat: 41.9052, lng: -87.6300, listedAt: '2026-09-02', updatedAt: '2026-09-21' },
  { neighborhood: 'Logan Square', address: '57 Example Avenue', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 695_000, bathrooms: 2, areaSqm: 191, status: 'under_offer', lat: 41.9285, lng: -87.6992, listedAt: '2026-08-20', updatedAt: '2026-08-20' },
  { neighborhood: 'Hyde Park', address: '94 Placeholder Lane, Unit 2B', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 345_000, bathrooms: 2, areaSqm: 100, status: 'available', lat: 41.7965, lng: -87.5878, listedAt: '2026-09-08', updatedAt: '2026-09-15' },
  { neighborhood: 'Lakeview', address: '42 Demo Boulevard, Unit 7C', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 1_550, bathrooms: 1, areaSqm: 45, furnishing: 'part_furnished', status: 'available', lat: 41.9393, lng: -87.6386, listedAt: '2026-10-06', updatedAt: '2026-10-09' },
]);

const austin = city('US', 'Austin', 'us-aus', [
  { neighborhood: 'Bouldin Creek', address: '76 Example Avenue', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 975_000, bathrooms: 2, areaSqm: 136, status: 'available', lat: 30.2510, lng: -97.7560, listedAt: '2026-09-19', updatedAt: '2026-09-23' },
  { neighborhood: 'East Austin', address: '24 Placeholder Lane', type: 'townhouse', bedrooms: 2, pricePeriod: 'monthly', price: 2_700, bathrooms: 2, areaSqm: 68, furnishing: 'part_furnished', status: 'available', lat: 30.2729, lng: -97.7193, listedAt: '2026-09-30', updatedAt: '2026-10-08' },
  { neighborhood: 'Downtown', address: '61 Demo Boulevard, Unit 16C', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_250, bathrooms: 1, areaSqm: 45, furnishing: 'part_furnished', status: 'available', lat: 30.2672, lng: -97.7514, listedAt: '2026-10-04', updatedAt: '2026-10-08' },
  { neighborhood: 'Mueller', address: '98 Mockup Place', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 715_000, bathrooms: 3, areaSqm: 109, status: 'available', lat: 30.2985, lng: -97.7048, listedAt: '2026-09-10', updatedAt: '2026-09-10' },
  { neighborhood: 'Zilker', address: '46 Sample Street', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 1_395_000, bathrooms: 2, areaSqm: 219, status: 'sold', lat: 30.2560, lng: -97.7700, listedAt: '2026-07-21', updatedAt: '2026-07-21' },
  { neighborhood: 'Hyde Park', address: '83 Example Avenue, Unit 18B', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 1_350, bathrooms: 1, areaSqm: 29, furnishing: 'part_furnished', status: 'available', lat: 30.3049, lng: -97.7303, listedAt: '2026-09-23', updatedAt: '2026-09-23' },
  { neighborhood: 'Circle C Ranch', address: '31 Placeholder Lane', type: 'house', bedrooms: 5, pricePeriod: 'total', price: 1_089_000, bathrooms: 4, areaSqm: 281, status: 'available', lat: 30.1905, lng: -97.8790, listedAt: '2026-08-27', updatedAt: '2026-10-08' },
]);

// ---------------------------------------------------------------------------
// Turkey (TRY) — 20. Bedroom counts follow the "N+1" convention (3+1 → 3).
// ---------------------------------------------------------------------------

const istanbul = city('TR', 'Istanbul', 'tr-ist', [
  { neighborhood: 'Kadıköy', address: 'Örnek Sokak No: 98 D: 3', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 11_750_000, bathrooms: 2, areaSqm: 72, status: 'available', lat: 40.9840, lng: 29.0270, listedAt: '2026-09-16', updatedAt: '2026-09-18' },
  { neighborhood: 'Beşiktaş', address: 'Deneme Caddesi No: 46 D: 9', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 42_000, bathrooms: 1, areaSqm: 69, furnishing: 'furnished', status: 'available', lat: 41.0455, lng: 29.0040, listedAt: '2026-10-03', updatedAt: '2026-10-07' },
  { neighborhood: 'Nişantaşı', address: 'Demo Sokak No: 83 D: 18', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 24_500_000, bathrooms: 3, areaSqm: 115, status: 'available', lat: 41.0520, lng: 28.9925, listedAt: '2026-08-29', updatedAt: '2026-09-13' },
  { neighborhood: 'Üsküdar', address: 'Taslak Sokak No: 31 D: 6', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 35_000, bathrooms: 2, areaSqm: 105, furnishing: 'unfurnished', status: 'let', lat: 41.0245, lng: 29.0180, listedAt: '2026-08-13', updatedAt: '2026-08-13' },
  { neighborhood: 'Tarabya', address: 'Örnek Sokak No: 68', type: 'villa', bedrooms: 5, pricePeriod: 'total', price: 78_000_000, bathrooms: 5, areaSqm: 292, status: 'available', lat: 41.1365, lng: 29.0540, listedAt: '2026-09-05', updatedAt: '2026-09-24' },
  { neighborhood: 'Ataşehir', address: 'Deneme Caddesi No: 16 D: 3', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 13_900_000, bathrooms: 2, areaSqm: 120, status: 'under_offer', lat: 40.9925, lng: 29.1240, listedAt: '2026-08-24', updatedAt: '2026-08-24' },
  { neighborhood: 'Cihangir', address: 'Demo Sokak No: 53 D: 7', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 28_000, bathrooms: 1, areaSqm: 33, furnishing: 'unfurnished', status: 'available', lat: 41.0318, lng: 28.9825, listedAt: '2026-10-06', updatedAt: '2026-10-07' },
  { neighborhood: 'Bakırköy', address: 'Taslak Sokak No: 90 D: 16', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 9_850_000, bathrooms: 1, areaSqm: 79, status: 'available', lat: 40.9795, lng: 28.8730, listedAt: '2026-09-13', updatedAt: '2026-09-18' },
  { neighborhood: 'Beylikdüzü', address: 'Örnek Sokak No: 38 D: 6', type: 'apartment', bedrooms: 3, pricePeriod: 'monthly', price: 26_500, bathrooms: 3, areaSqm: 117, furnishing: 'furnished', status: 'available', lat: 41.0015, lng: 28.6425, listedAt: '2026-09-27', updatedAt: '2026-09-27' },
]);

const ankara = city('TR', 'Ankara', 'tr-ank', [
  { neighborhood: 'Çankaya', address: 'Demo Sokak No: 76 D: 4', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 7_450_000, bathrooms: 3, areaSqm: 121, status: 'available', lat: 39.9045, lng: 32.8610, listedAt: '2026-09-07', updatedAt: '2026-09-15' },
  { neighborhood: 'Kızılay', address: 'Taslak Sokak No: 24 D: 9', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 19_500, bathrooms: 1, areaSqm: 51, furnishing: 'unfurnished', status: 'available', lat: 39.9200, lng: 32.8545, listedAt: '2026-10-02', updatedAt: '2026-10-02' },
  { neighborhood: 'Ümitköy', address: 'Örnek Sokak No: 61', type: 'villa', bedrooms: 4, pricePeriod: 'total', price: 16_500_000, bathrooms: 3, areaSqm: 210, status: 'available', lat: 39.8935, lng: 32.7050, listedAt: '2026-08-21', updatedAt: '2026-08-24' },
  { neighborhood: 'Bahçelievler', address: 'Deneme Caddesi No: 98 D: 6', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 22_000, bathrooms: 1, areaSqm: 83, furnishing: 'furnished', status: 'under_offer', lat: 39.9225, lng: 32.8235, listedAt: '2026-09-18', updatedAt: '2026-09-18' },
]);

const izmir = city('TR', 'Izmir', 'tr-izm', [
  { neighborhood: 'Alsancak', address: 'Deneme Caddesi No: 65 D: 3', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 27_500, bathrooms: 1, areaSqm: 81, furnishing: 'unfurnished', status: 'available', lat: 38.4375, lng: 27.1440, listedAt: '2026-09-29', updatedAt: '2026-10-09' },
  { neighborhood: 'Karşıyaka', address: 'Demo Sokak No: 13 D: 11', type: 'apartment', bedrooms: 3, pricePeriod: 'total', price: 8_250_000, bathrooms: 2, areaSqm: 115, status: 'available', lat: 38.4590, lng: 27.1050, listedAt: '2026-09-04', updatedAt: '2026-09-04' },
  { neighborhood: 'Bornova', address: 'Taslak Sokak No: 50 D: 16', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 17_500, bathrooms: 1, areaSqm: 62, furnishing: 'unfurnished', status: 'let', lat: 38.4625, lng: 27.2160, listedAt: '2026-08-16', updatedAt: '2026-08-16' },
  { neighborhood: 'Urla', address: 'Örnek Sokak No: 87', type: 'villa', bedrooms: 4, pricePeriod: 'total', price: 21_750_000, bathrooms: 4, areaSqm: 259, status: 'available', lat: 38.3590, lng: 26.7670, listedAt: '2026-08-31', updatedAt: '2026-09-16' },
]);

const antalya = city('TR', 'Antalya', 'tr-ayt', [
  { neighborhood: 'Konyaaltı', address: 'Taslak Sokak No: 87 D: 3', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 6_900_000, bathrooms: 1, areaSqm: 95, status: 'available', lat: 36.8690, lng: 30.6350, listedAt: '2026-09-15', updatedAt: '2026-09-17' },
  { neighborhood: 'Lara', address: 'Örnek Sokak No: 35 D: 9', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 24_000, bathrooms: 1, areaSqm: 64, furnishing: 'unfurnished', status: 'available', lat: 36.8580, lng: 30.7880, listedAt: '2026-10-01', updatedAt: '2026-10-09' },
  { neighborhood: 'Döşemealtı', address: 'Deneme Caddesi No: 72', type: 'villa', bedrooms: 5, pricePeriod: 'total', price: 32_000_000, bathrooms: 5, areaSqm: 452, status: 'under_offer', lat: 37.0255, lng: 30.6000, listedAt: '2026-08-09', updatedAt: '2026-09-13' },
]);

// ---------------------------------------------------------------------------
// United Kingdom (GBP) — 8. Rents are per calendar month (pcm).
// ---------------------------------------------------------------------------

const london = city('GB', 'London', 'gb-lon', [
  { neighborhood: 'Islington', address: 'Flat 3, 76 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'total', price: 895_000, bathrooms: 1, areaSqm: 77, status: 'available', lat: 51.5410, lng: -0.1020, listedAt: '2026-09-22', updatedAt: '2026-10-04' },
  { neighborhood: 'Clapham', address: 'Flat 9, 24 Demo Lane', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 2_375, bathrooms: 1, areaSqm: 56, furnishing: 'unfurnished', status: 'available', lat: 51.4555, lng: -0.1430, listedAt: '2026-10-05', updatedAt: '2026-10-08' },
  { neighborhood: 'Hackney', address: '61 Example Road', type: 'townhouse', bedrooms: 4, pricePeriod: 'total', price: 1_450_000, bathrooms: 3, areaSqm: 194, status: 'under_offer', lat: 51.5470, lng: -0.0630, listedAt: '2026-08-26', updatedAt: '2026-09-29' },
  { neighborhood: 'Canary Wharf', address: 'Flat 4, 98 Sample Mews', type: 'apartment', bedrooms: 0, pricePeriod: 'monthly', price: 2_100, bathrooms: 1, areaSqm: 33, furnishing: 'part_furnished', status: 'available', lat: 51.5005, lng: -0.0180, listedAt: '2026-09-30', updatedAt: '2026-10-05' },
]);

const manchester = city('GB', 'Manchester', 'gb-man', [
  { neighborhood: 'Ancoats', address: 'Flat 2, 31 Placeholder Row', type: 'apartment', bedrooms: 1, pricePeriod: 'monthly', price: 1_325, bathrooms: 1, areaSqm: 60, furnishing: 'part_furnished', status: 'available', lat: 53.4840, lng: -2.2280, listedAt: '2026-10-02', updatedAt: '2026-10-02' },
  { neighborhood: 'Didsbury', address: '68 Demo Lane', type: 'house', bedrooms: 3, pricePeriod: 'total', price: 465_000, bathrooms: 2, areaSqm: 115, status: 'available', lat: 53.4170, lng: -2.2320, listedAt: '2026-09-09', updatedAt: '2026-09-16' },
]);

const birmingham = city('GB', 'Birmingham', 'gb-bhm', [
  { neighborhood: 'Jewellery Quarter', address: 'Flat 3, 31 Placeholder Row', type: 'apartment', bedrooms: 2, pricePeriod: 'monthly', price: 1_250, bathrooms: 2, areaSqm: 86, furnishing: 'unfurnished', status: 'let', lat: 52.4870, lng: -1.9085, listedAt: '2026-08-12', updatedAt: '2026-08-12' },
  { neighborhood: 'Harborne', address: '68 Demo Lane', type: 'house', bedrooms: 4, pricePeriod: 'total', price: 525_000, bathrooms: 3, areaSqm: 186, status: 'available', lat: 52.4590, lng: -1.9600, listedAt: '2026-09-17', updatedAt: '2026-09-17' },
]);

export const properties: readonly Property[] = [
  ...newYork,
  ...losAngeles,
  ...miami,
  ...sanFrancisco,
  ...chicago,
  ...austin,
  ...istanbul,
  ...ankara,
  ...izmir,
  ...antalya,
  ...london,
  ...manchester,
  ...birmingham,
];
