/**
 * Tile provider config. Swap the URL and attribution here to change providers
 * (for example CARTO, which needs an API key). Attribution must stay visible.
 */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Listing coordinates are approximate points inside a neighborhood, so the map
 * stops at street level instead of the tile maximum (19), where a marker would
 * look like it pins a specific building.
 */
export const MAP_MAX_ZOOM = 16;

/** Initial view before the first fit-to-results. */
export const DEFAULT_CENTER: [number, number] = [35, -30];
export const DEFAULT_ZOOM = 2;
