import type { PropertyType } from '../types/property';

/**
 * Remote photos come from Unsplash (https://unsplash.com/license: free to use,
 * no permission needed). No property-portal images are used.
 */
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&h=600&q=70`;

/** Pools of photos per property type. Listings pick from these deterministically. */
export const PHOTO_POOLS: Record<PropertyType, readonly string[]> = {
  apartment: [
    '1545324418-cc1a3fa10c00',
    '1460317442991-0ec209397118',
    '1574362848149-11496d93a7c7',
    '1502672260266-1c1ef2d93688',
    '1522708323590-d24dbb6b0267',
    '1560448204-e02f11c3d0e2',
    '1493809842364-78817add7ffb',
    '1512918728675-ed5a9ecdebfd',
    '1600607687939-ce8a6c25118c',
    '1484154218962-a197022b5858',
    '1586023492125-27b2c045efd7',
  ].map(unsplash),
  house: [
    '1568605114967-8130f3a36994',
    '1570129477492-45c003edd2be',
    '1580587771525-78b9dba3b914',
    '1564013799919-ab600027ffc6',
    '1576941089067-2de3c901e126',
    '1598228723793-52759bba239c',
  ].map(unsplash),
  townhouse: [
    '1600585154340-be6161a56a0c',
    '1600566753190-17f0baa2a6c3',
    '1600047509807-ba8f99d2cdde',
  ].map(unsplash),
  villa: [
    '1512917774080-9991f1c4c750',
    '1600596542815-ffad4c1539a9',
    '1613490493576-7fde63acd811',
    '1605276374104-dee2a0ed3cd6',
  ].map(unsplash),
};

const FALLBACK_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  villa: 'Villa',
};

/**
 * Inline SVG placeholder, so it works offline and never 404s.
 * Use as the `onError` replacement for a property photo.
 */
export function getFallbackImage(type: PropertyType): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<rect width="800" height="600" fill="#e2e8f0"/>
<path d="M300 330 L400 250 L500 330 V410 H300 Z" fill="none" stroke="#94a3b8" stroke-width="14" stroke-linejoin="round"/>
<rect x="378" y="350" width="44" height="60" fill="#94a3b8"/>
<text x="400" y="470" font-family="system-ui, sans-serif" font-size="32" fill="#64748b" text-anchor="middle">${FALLBACK_LABELS[type]}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
