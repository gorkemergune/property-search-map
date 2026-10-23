import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap, useMapEvents } from 'react-leaflet';
import { t } from '../i18n/en';
import {
  bboxOf,
  countColor,
  populationColor,
  type AreaCounts,
  type Feature,
  type LadCollection,
  type LadProps,
  type Position,
  type WardCollection,
  type WardProps,
} from '../lib/areas';

/** From this zoom on, listing density switches from local authorities to wards (where wards are bundled). */
export const WARD_MIN_ZOOM = 11;
/** Count labels appear once areas are large enough on screen to hold them. */
const LABEL_MIN_ZOOM = { lad: 8, ward: 12 } as const;

export type AreaLevel = 'lad' | 'ward';
export type AreaMode = 'popular' | 'density';

/** A request to fit the map to one area (from the legend's area list). `seq` makes repeats count. */
export interface AreaFocus {
  code: string;
  seq: number;
}

type AnyFeature = Feature<LadProps> | Feature<WardProps>;
const isWard = (f: AnyFeature): f is Feature<WardProps> => 'lad' in f.properties;

interface Props {
  mode: AreaMode;
  lads: LadCollection;
  wards: WardCollection;
  /** Listing counts per area; used in density mode. */
  counts: AreaCounts | null;
  focus: AreaFocus | null;
  onLevelChange: (level: AreaLevel) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Choropleth of administrative areas drawn under the listing markers.
 * Popular areas: local authorities coloured by census population density.
 * Listing density: local authorities (zoomed out) or wards (zoomed in)
 * coloured by the number of current results inside them.
 */
export function AreaLayer({ mode, lads, wards, counts, focus, onLevelChange }: Props) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const level: AreaLevel = mode === 'density' && zoom >= WARD_MIN_ZOOM ? 'ward' : 'lad';
  useEffect(() => onLevelChange(level), [level, onLevelChange]);

  const features = useMemo<AnyFeature[]>(() => {
    if (level === 'lad') return lads.features;
    // Wards where they are bundled; whole local authorities elsewhere, so no land is left uncoloured.
    const covered = new Set(wards.features.map((w) => w.properties.lad));
    return [...lads.features.filter((f) => !covered.has(f.properties.code)), ...wards.features];
  }, [level, lads, wards]);

  // Latest values for Leaflet callbacks, which outlive renders.
  const latest = useRef({ mode, counts });
  latest.current = { mode, counts };
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    for (const [name, z] of [['areas', 350], ['areaLabels', 450]] as const) {
      if (!map.getPane(name)) map.createPane(name).style.zIndex = String(z);
    }
    map.getPane('areaLabels')!.style.pointerEvents = 'none';
  }, [map]);

  useEffect(() => {
    const countOf = (f: AnyFeature) => {
      const c = latest.current.counts;
      return (isWard(f) ? c?.ward : c?.lad)?.get(f.properties.code) ?? 0;
    };
    const style = (f?: GeoJSON.Feature): L.PathOptions => {
      const area = f as unknown as AnyFeature;
      if (latest.current.mode === 'popular') {
        return { fillColor: populationColor((area.properties as LadProps).density), fillOpacity: 0.62, color: '#7a4a12', opacity: 0.35, weight: 0.8 };
      }
      const n = countOf(area);
      return { fillColor: countColor(n), fillOpacity: n > 0 ? 0.62 : 0.5, color: '#134e5e', opacity: isWard(area) ? 0.4 : 0.5, weight: isWard(area) ? 0.7 : 1 };
    };
    const describe = (f: AnyFeature) => {
      const name = `<strong>${escapeHtml(f.properties.name)}</strong>`;
      if (latest.current.mode === 'popular') {
        const p = f.properties as LadProps;
        return `${name}<br>${escapeHtml(t.mapLayers.popular.areaDensity(p.density, p.population))}`;
      }
      const kind = isWard(f) ? t.mapLayers.density.ward : t.mapLayers.density.localAuthority;
      return `${name} <span class="area-kind">${kind}</span><br>${escapeHtml(t.mapLayers.density.areaCount(countOf(f)))}`;
    };

    // GeoJSON passes these options on to every polygon, so `renderer` applies to each path. An
    // explicit SVG renderer keeps hover and click working wherever Leaflet's auto-detection fails.
    const options: L.GeoJSONOptions & Pick<L.PathOptions, 'renderer'> = {
      pane: 'areas',
      renderer: L.svg({ pane: 'areas', padding: 0.5 }),
      style,
      onEachFeature: (f, path) => {
        const area = f as unknown as AnyFeature;
        path.bindTooltip(() => describe(area), { sticky: true, className: 'area-tooltip', direction: 'top', offset: [0, -8] });
        path.on({
          mouseover: () => (path as L.Path).setStyle({ weight: 2.4, opacity: 0.95 }),
          mouseout: () => layer.resetStyle(path),
          click: (e: L.LeafletMouseEvent) => {
            const content = L.DomUtil.create('div', 'area-popup');
            content.innerHTML = describe(area);
            const zoomIn = L.DomUtil.create('button', 'area-popup-zoom', content);
            zoomIn.type = 'button';
            zoomIn.textContent = t.mapLayers.zoomToArea;
            L.DomEvent.on(zoomIn, 'click', () => {
              map.closePopup();
              map.fitBounds((path as L.Polygon).getBounds(), { padding: [32, 32] });
            });
            L.popup({ className: 'area-popup-wrap', closeButton: true }).setLatLng(e.latlng).setContent(content).openOn(map);
          },
        });
      },
    };
    const layer = L.geoJSON(undefined, options);
    layer.addData({ type: 'FeatureCollection', features: features } as unknown as GeoJSON.FeatureCollection);
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      layer.remove();
      map.closePopup();
      layerRef.current = null;
    };
  }, [map, features]);

  // Restyle in place when counts or mode change; rebuilding ~1,500 paths per keystroke would be wasteful.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.eachLayer((l) => layer.resetStyle(l as L.Path));
  }, [mode, counts, features]);

  // Count labels (density mode only), as non-interactive permanent tooltips.
  useEffect(() => {
    if (mode !== 'density' || !counts || zoom < LABEL_MIN_ZOOM[level]) return;
    const group = L.layerGroup().addTo(map);
    for (const f of features) {
      const n = (isWard(f) ? counts.ward : counts.lad).get(f.properties.code) ?? 0;
      if (n === 0) continue;
      L.tooltip({ permanent: true, direction: 'center', className: 'area-count-label', pane: 'areaLabels', interactive: false })
        .setLatLng(labelPoint(f))
        .setContent(String(n))
        .addTo(group);
    }
    return () => {
      group.remove();
    };
  }, [map, mode, counts, features, level, zoom]);

  useEffect(() => {
    if (!focus) return;
    const f = [...wards.features, ...lads.features].find((x) => x.properties.code === focus.code);
    if (!f) return;
    const [w, s, e, n] = bboxOf(f.geometry);
    const size = map.getSize();
    if (size.x > 0 && size.y > 0) map.fitBounds([[s, w], [n, e]], { padding: [40, 40], maxZoom: 14 });
  }, [map, focus, lads, wards]);

  return null;
}

/** Centroid of the area's largest polygon (its outer ring), as a Leaflet [lat, lng]. */
function labelPoint(f: AnyFeature): L.LatLngExpression {
  const polys: Position[][][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let best = { area: -1, lat: 0, lng: 0 };
  for (const [ring] of polys) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += cross;
      cx += (ring[j][0] + ring[i][0]) * cross;
      cy += (ring[j][1] + ring[i][1]) * cross;
    }
    if (Math.abs(a) > best.area && a !== 0) best = { area: Math.abs(a), lng: cx / (3 * a), lat: cy / (3 * a) };
  }
  return [best.lat, best.lng];
}
