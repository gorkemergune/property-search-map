/**
 * What the map shows: price markers only, or markers over one of two shaded
 * area views (census population density, or listing counts per area). The
 * area logic lives in `./areas`.
 */
export const MAP_MODES = ['homes', 'popular', 'density'] as const;
export type MapMode = (typeof MAP_MODES)[number];
