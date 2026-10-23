import type { Nation, Property } from '../types/property';
import { PHOTO_POOLS } from './images';

/** Additional fictional homes between the original markets. Coordinates are
 * approximate residential-area points, never claims about actual buildings.
 * Three explicit demo profiles per location; optional unrecorded facts stay unknown. */
export const COVERAGE_LOCATIONS: readonly { city: string; nation: Nation; neighborhood: string; lat: number; lng: number }[] = [
  {
    "city": "Glasgow",
    "nation": "scotland",
    "neighborhood": "West End",
    "lat": 55.875,
    "lng": -4.292
  },
  {
    "city": "Aberdeen",
    "nation": "scotland",
    "neighborhood": "Rosemount",
    "lat": 57.151,
    "lng": -2.119
  },
  {
    "city": "Dundee",
    "nation": "scotland",
    "neighborhood": "West End",
    "lat": 56.465,
    "lng": -2.99
  },
  {
    "city": "Inverness",
    "nation": "scotland",
    "neighborhood": "Crown",
    "lat": 57.474,
    "lng": -4.215
  },
  {
    "city": "Cardiff",
    "nation": "wales",
    "neighborhood": "Roath",
    "lat": 51.494,
    "lng": -3.165
  },
  {
    "city": "Swansea",
    "nation": "wales",
    "neighborhood": "Uplands",
    "lat": 51.621,
    "lng": -3.965
  },
  {
    "city": "Belfast",
    "nation": "northern_ireland",
    "neighborhood": "Stranmillis",
    "lat": 54.58,
    "lng": -5.937
  },
  {
    "city": "York",
    "nation": "england",
    "neighborhood": "Heworth",
    "lat": 53.966,
    "lng": -1.066
  },
  {
    "city": "Carlisle",
    "nation": "england",
    "neighborhood": "Denton Holme",
    "lat": 54.884,
    "lng": -2.94
  },
  {
    "city": "Hull",
    "nation": "england",
    "neighborhood": "Avenues",
    "lat": 53.763,
    "lng": -0.368
  },
  {
    "city": "Norwich",
    "nation": "england",
    "neighborhood": "Golden Triangle",
    "lat": 52.625,
    "lng": 1.272
  },
  {
    "city": "Lincoln",
    "nation": "england",
    "neighborhood": "West End",
    "lat": 53.232,
    "lng": -0.55
  },
  {
    "city": "Leicester",
    "nation": "england",
    "neighborhood": "Clarendon Park",
    "lat": 52.615,
    "lng": -1.119
  },
  {
    "city": "Coventry",
    "nation": "england",
    "neighborhood": "Earlsdon",
    "lat": 52.398,
    "lng": -1.53
  },
  {
    "city": "Stoke-on-Trent",
    "nation": "england",
    "neighborhood": "Hartshill",
    "lat": 53.007,
    "lng": -2.209
  },
  {
    "city": "Southampton",
    "nation": "england",
    "neighborhood": "Shirley",
    "lat": 50.922,
    "lng": -1.429
  },
  {
    "city": "Exeter",
    "nation": "england",
    "neighborhood": "Heavitree",
    "lat": 50.721,
    "lng": -3.505
  },
  {
    "city": "Plymouth",
    "nation": "england",
    "neighborhood": "Mutley",
    "lat": 50.384,
    "lng": -4.132
  }
];

export const coverageHomes: readonly Property[] = COVERAGE_LOCATIONS.flatMap((area, locationIndex) => {
  const base = {
    city: area.city, neighborhood: area.neighborhood, nation: area.nation,
    countryCode: 'GB' as const, currency: 'GBP' as const,
    status: 'available' as const, listedAt: '2026-09-28', updatedAt: '2026-10-01',
    bathrooms: 1, epcRating: 'C' as const,
    description: `Demo listing with fictional details in ${area.neighborhood}, ${area.city}. All property facts and addresses are illustrative.`,
    imageAlt: `Illustrative home in ${area.neighborhood}, ${area.city}`,
  };
  return [
    {
      ...base, id: `gb-coverage-${locationIndex}-1`,
      title: `Bright 1-bedroom apartment in ${area.neighborhood}`,
      address: 'Flat 2, 12 Example Road', type: 'apartment' as const,
      image: PHOTO_POOLS.apartment[locationIndex % PHOTO_POOLS.apartment.length],
      lat: area.lat, lng: area.lng, pricePeriod: 'monthly' as const, price: 950,
      bedrooms: 1, areaSqm: 48, hasGarden: false, hasParking: false,
      furnishing: 'furnished' as const, studentFriendly: true, petsAllowed: false,
      includedBills: ['internet' as const], availableFrom: '2026-11-01', depositWeeks: 4,
    },
    {
      ...base, id: `gb-coverage-${locationIndex}-2`,
      title: `Spacious 3-bedroom house in ${area.neighborhood}`,
      address: '28 Sample Street', type: 'house' as const,
      image: PHOTO_POOLS.house[locationIndex % PHOTO_POOLS.house.length],
      lat: area.lat + 0.0013, lng: area.lng - 0.0015, pricePeriod: 'total' as const, price: 295_000,
      bedrooms: 3, areaSqm: 110, hasGarden: true, hasParking: true,
      tenure: area.nation === 'scotland' ? 'outright' as const : 'freehold' as const,
      outdoorSpace: ['private_garden' as const], parking: ['driveway' as const], chainFree: true,
    },
    {
      ...base, id: `gb-coverage-${locationIndex}-3`,
      title: `Classic 2-bedroom house in ${area.neighborhood}`,
      address: '41 Placeholder Lane', type: 'house' as const,
      image: PHOTO_POOLS.house[(locationIndex + 1) % PHOTO_POOLS.house.length],
      lat: area.lat - 0.0012, lng: area.lng + 0.0014, pricePeriod: 'monthly' as const, price: 1_250,
      bedrooms: 2, areaSqm: 82, hasGarden: true, hasParking: false,
      furnishing: 'unfurnished' as const, petsAllowed: true, couplesWelcome: true,
      includedBills: [], availableFrom: '2026-11-15', depositWeeks: 4,
    },
  ];
});
