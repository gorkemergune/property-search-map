import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_MAX_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '../config/map';
import { t } from '../i18n/en';
import { formatMarkerPrice, formatPrice } from '../lib/format';
import { clusterByDistance } from '../lib/cluster';
import { AreaLayer, type AreaFocus, type AreaLevel, type AreaMode } from './AreaLayer';
import type { AreaCounts, LadCollection, WardCollection } from '../lib/areas';
import type { Property } from '../types/property';

/** Below this zoom, price pills would pile up, so markers render as dots. */
const PRICE_LABEL_MIN_ZOOM = 10;
const FOCUS_ZOOM = 14;
/** Below this zoom (UK and region views), nearby markers merge into numbered clusters. */
const CLUSTER_MAX_ZOOM = 10;
const CLUSTER_RADIUS_PX = 44;

export interface FlyTarget {
  id: string;
  seq: number;
}

interface Props {
  properties: Property[];
  selectedId: string | null;
  hoveredId: string | null;
  flyTarget: FlyTarget | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Shaded areas drawn under the markers; markers shrink to quiet dots while they are on. */
  areas?: AreaOverlay | null;
}

export interface AreaOverlay {
  mode: AreaMode;
  lads: LadCollection;
  wards: WardCollection;
  counts: AreaCounts | null;
  focus: AreaFocus | null;
  onLevelChange: (level: AreaLevel) => void;
}

type MarkerState = 'default' | 'hovered' | 'selected';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function markerIcon(p: Property, state: MarkerState, showPrice: boolean, muted: boolean): L.DivIcon {
  const classes = ['price-marker', `is-${state}`, showPrice ? '' : 'is-dot', muted ? 'is-muted' : '', p.status === 'available' ? '' : 'is-inactive']
    .filter(Boolean)
    .join(' ');
  return L.divIcon({
    className: 'price-marker-icon',
    iconSize: [0, 0],
    html: `<span class="${classes}">${showPrice ? escapeHtml(formatMarkerPrice(p)) : ''}</span>`,
  });
}

export function PropertyMap({ properties, selectedId, hoveredId, flyTarget, onSelect, onHover, areas = null }: Props) {
  // Show a notice when tiles fail and none have loaded (offline, blocked or provider down).
  const [tiles, setTiles] = useState({ loaded: 0, failed: 0 });
  const tileHandlers = useMemo<L.LeafletEventHandlerFnMap>(
    () => ({
      tileload: () => setTiles((s) => (s.loaded > 0 ? s : { ...s, loaded: 1 })),
      tileerror: () => setTiles((s) => (s.failed > 0 ? s : { ...s, failed: 1 })),
    }),
    [],
  );
  const tilesUnavailable = tiles.failed > 0 && tiles.loaded === 0;

  return (
    <>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={2}
        maxZoom={MAP_MAX_ZOOM}
        zoomControl={false}
        worldCopyJump
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAP_MAX_ZOOM} eventHandlers={tileHandlers} />
        <ZoomControl position="bottomright" />
        {areas && <AreaLayer {...areas} />}
        <Markers
          properties={properties}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={onHover}
          muted={areas !== null}
        />
        <ViewController properties={properties} target={flyTarget} />
      </MapContainer>
      {tilesUnavailable && (
        <p role="status" className="absolute left-4 right-4 top-4 z-1000 rounded-xl bg-white/95 px-4 py-3 text-[13px] text-ink-soft shadow-[0_4px_16px_-4px_rgb(29_28_26/0.25)] sm:right-auto sm:max-w-sm">
          {t.map.tilesFailed}
        </p>
      )}
    </>
  );
}

/** Id of the screen-reader hint describing marker keyboard controls (rendered by the map section). */
export const MARKER_HELP_ID = 'map-marker-keyboard-help';

/**
 * Markers use a roving tabindex: only one marker is in the Tab order (the
 * selected listing, else the last one reached with the arrows, else the first
 * result). Arrow keys move between markers in result order, Home/End jump to
 * the ends, Enter/Space selects. The cards remain the full keyboard path.
 *
 * Zoomed out, nearby markers merge into numbered clusters (each a button that
 * zooms in); the arrow keys then move between the markers still shown on
 * their own. The selected listing is never folded into a cluster.
 */
function Markers({
  properties,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  muted,
}: Pick<Props, 'properties' | 'selectedId' | 'hoveredId' | 'onSelect' | 'onHover'> & { muted: boolean }) {
  const map = useMap();
  const [view, setView] = useState(() => ({ zoom: map.getZoom(), width: map.getSize().x }));
  useMapEvents({
    zoomend: () => setView({ zoom: map.getZoom(), width: map.getSize().x }),
    resize: () => setView({ zoom: map.getZoom(), width: map.getSize().x }),
  });
  const { zoom } = view;
  const showPrice = zoom >= PRICE_LABEL_MIN_ZOOM && !muted;

  // A map with no size (hidden mobile map, tests) has no screen space to declutter.
  const clustering = zoom < CLUSTER_MAX_ZOOM && view.width > 0;
  const { singles, clusters } = useMemo(() => {
    if (!clustering) return { singles: properties, clusters: [] };
    const free = properties.filter((p) => p.id !== selectedId);
    const groups = clusterByDistance(free, (p) => map.project([p.lat, p.lng], zoom), CLUSTER_RADIUS_PX);
    const selected = properties.filter((p) => p.id === selectedId);
    return {
      singles: [...groups.filter((g) => g.items.length === 1).map((g) => g.items[0]), ...selected],
      clusters: groups.filter((g) => g.items.length > 1),
    };
  }, [clustering, properties, selectedId, map, zoom]);
  const singleIds = useMemo(() => new Set(singles.map((p) => p.id)), [singles]);
  // Keyboard order follows the result order, limited to the markers on screen.
  const navigable = useMemo(() => properties.filter((p) => singleIds.has(p.id)), [properties, singleIds]);

  const [focusId, setFocusId] = useState<string | null>(null);
  const inView = (id: string | null) => id !== null && singleIds.has(id);
  const tabbableId = inView(selectedId) ? selectedId : inView(focusId) ? focusId : (navigable[0]?.id ?? null);

  const latest = useRef({ navigable, onSelect, onHover });
  latest.current = { navigable, onSelect, onHover };

  useEffect(() => {
    const pane = map.getPane('markerPane');
    if (!pane) return;
    const markerOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest<HTMLElement>('[data-listing-id]') ?? null;

    const onKeyDown = (e: KeyboardEvent) => {
      const cluster = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cluster]');
      if (cluster && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        cluster.click();
        return;
      }
      const el = markerOf(e.target);
      if (!el) return;
      const { navigable: list, onSelect: select } = latest.current;
      const index = list.findIndex((p) => p.id === el.dataset.listingId);
      if (index < 0) return;
      let next: number;
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          e.stopPropagation();
          select(list[index].id);
          return;
        case 'ArrowRight':
        case 'ArrowDown':
          next = (index + 1) % list.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = (index - 1 + list.length) % list.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = list.length - 1;
          break;
        default:
          return;
      }
      // Keep the arrows from also panning the map.
      e.preventDefault();
      e.stopPropagation();
      const target = list[next];
      setFocusId(target.id);
      pane.querySelector<HTMLElement>(`[data-listing-id="${target.id}"]`)?.focus({ preventScroll: true });
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) map.panInside([target.lat, target.lng], { padding: [60, 60] });
    };
    // Track whether focus comes from the keyboard: WebKit does not match
    // :focus-visible after the programmatic focus() used by the arrow keys,
    // so the focus ring is driven by a data attribute instead.
    let keyboardModality = false;
    const onAnyKey = () => (keyboardModality = true);
    const onAnyPointer = () => (keyboardModality = false);
    document.addEventListener('keydown', onAnyKey, true);
    document.addEventListener('pointerdown', onAnyPointer, true);

    // Keyboard focus on a marker highlights its card, like mouse hover does.
    const onFocusIn = (e: FocusEvent) => {
      const el = markerOf(e.target);
      if (!el?.dataset.listingId) return;
      if (keyboardModality) el.dataset.keyboardFocus = '';
      latest.current.onHover(el.dataset.listingId);
    };
    const onFocusOut = (e: FocusEvent) => {
      const el = markerOf(e.target);
      if (!el) return;
      delete el.dataset.keyboardFocus;
      latest.current.onHover(null);
    };

    pane.addEventListener('keydown', onKeyDown);
    pane.addEventListener('focusin', onFocusIn);
    pane.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('keydown', onAnyKey, true);
      document.removeEventListener('pointerdown', onAnyPointer, true);
      pane.removeEventListener('keydown', onKeyDown);
      pane.removeEventListener('focusin', onFocusIn);
      pane.removeEventListener('focusout', onFocusOut);
    };
  }, [map]);

  return (
    <>
      {clusters.map((c) => (
        <ClusterMarker
          key={c.items.map((p) => p.id).join(',')}
          listings={c.items}
          position={map.unproject([c.x, c.y], zoom)}
          hovered={hoveredId !== null && c.items.some((p) => p.id === hoveredId)}
          muted={muted}
        />
      ))}
      {singles.map((p) => {
        const state: MarkerState = p.id === selectedId ? 'selected' : p.id === hoveredId ? 'hovered' : 'default';
        return (
          <PriceMarker
            key={p.id}
            property={p}
            state={state}
            tabbable={p.id === tabbableId}
            // Selected and hovered markers draw above neighbours.
            zIndexOffset={state === 'selected' ? 1000 : state === 'hovered' ? 500 : 0}
            showPrice={showPrice}
            muted={muted && state === 'default'}
            onSelect={onSelect}
            onHover={onHover}
          />
        );
      })}
    </>
  );
}

/** A numbered bubble for several nearby listings; activating it zooms in until they separate. */
function ClusterMarker({ listings, position, hovered, muted }: { listings: Property[]; position: L.LatLng; hovered: boolean; muted: boolean }) {
  const map = useMap();
  const marker = useRef<L.Marker>(null);
  const n = listings.length;
  const icon = useMemo(() => {
    const size = muted ? 24 : Math.round(Math.min(40, 24 + Math.log2(n) * 2));
    const classes = ['map-cluster', hovered ? 'is-hovered' : '', muted ? 'is-muted' : ''].filter(Boolean).join(' ');
    return L.divIcon({
      className: 'map-cluster-icon',
      iconSize: [size, size],
      html: `<span class="${classes}">${n}</span>`,
    });
  }, [n, hovered, muted]);
  const handlers = useMemo<L.LeafletEventHandlerFnMap>(
    () => ({
      click: () => {
        const bounds = L.latLngBounds(listings.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: Math.max(map.getZoom() + 2, PRICE_LABEL_MIN_ZOOM) });
      },
    }),
    [listings, map],
  );
  const label = t.map.clusterLabel(n);

  useEffect(() => {
    const el = marker.current?.getElement();
    if (!el) return;
    el.dataset.cluster = String(n);
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', label);
    el.tabIndex = 0;
  }, [icon, label, n]);

  return <Marker ref={marker} position={position} icon={icon} keyboard={false} title={label} eventHandlers={handlers} />;
}

function PriceMarker({
  property: p,
  state,
  tabbable,
  zIndexOffset,
  showPrice,
  muted,
  onSelect,
  onHover,
}: {
  property: Property;
  state: MarkerState;
  tabbable: boolean;
  zIndexOffset: number;
  showPrice: boolean;
  muted: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const marker = useRef<L.Marker>(null);
  const icon = useMemo(() => markerIcon(p, state, showPrice, muted), [p, state, showPrice, muted]);
  const handlers = useMemo<L.LeafletEventHandlerFnMap>(
    () => ({
      click: () => onSelect(p.id),
      mouseover: () => onHover(p.id),
      mouseout: () => onHover(null),
    }),
    [p.id, onSelect, onHover],
  );
  const label = t.map.markerLabel(formatPrice(p), t.propertyTypes[p.type], `${p.neighborhood}, ${p.city}`);

  // Leaflet's own marker keyboard support (keyboard: true) puts every marker in
  // the Tab order; it is turned off and these attributes are managed here instead.
  // The icon element is replaced whenever the icon changes, so this re-runs then.
  useEffect(() => {
    const el = marker.current?.getElement();
    if (!el) return;
    el.dataset.listingId = p.id;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', label);
    el.setAttribute('aria-pressed', String(state === 'selected'));
    el.setAttribute('aria-describedby', MARKER_HELP_ID);
    el.tabIndex = tabbable ? 0 : -1;
  }, [icon, label, state, tabbable, p.id]);

  return (
    <Marker
      ref={marker}
      position={[p.lat, p.lng]}
      icon={icon}
      keyboard={false}
      zIndexOffset={zIndexOffset}
      title={`${formatPrice(p)} · ${p.neighborhood}, ${p.city}`}
      eventHandlers={handlers}
    />
  );
}

/**
 * Keeps the viewport in sync with the results: fits to the result set when it
 * changes and flies to listings chosen from the list. While the map is hidden
 * (mobile list view) it has no size, so the latest action waits until it is shown.
 */
function ViewController({ properties, target }: { properties: Property[]; target: FlyTarget | null }) {
  const map = useMap();
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const pending = useRef<(() => void) | null>(null);

  const run = useCallback(
    (action: () => void) => {
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) {
        pending.current = action;
      } else {
        pending.current = null;
        action();
      }
    },
    [map],
  );

  const key = properties.map((p) => p.id).join(',');
  useEffect(() => {
    run(() => {
      const list = propertiesRef.current;
      if (list.length === 0) return;
      if (list.length === 1) {
        map.setView([list[0].lat, list[0].lng], FOCUS_ZOOM);
        return;
      }
      const bounds = L.latLngBounds(list.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: FOCUS_ZOOM });
    });
    // `key` captures the result set; re-fitting on every render would fight the user.
  }, [map, run, key]);

  useEffect(() => {
    if (!target) return;
    run(() => {
      const p = propertiesRef.current.find((x) => x.id === target.id);
      if (!p) return;
      const latLng = L.latLng(p.lat, p.lng);
      const inView = map.getBounds().pad(-0.1).contains(latLng);
      if (inView && map.getZoom() >= PRICE_LABEL_MIN_ZOOM) return;
      map.flyTo(latLng, Math.max(map.getZoom(), FOCUS_ZOOM - 1), { duration: 0.8 });
    });
  }, [map, run, target]);

  // Leaflet needs a size recalculation when its container is shown or resized.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      const size = map.getSize();
      if (pending.current && size.x > 0 && size.y > 0) {
        const action = pending.current;
        pending.current = null;
        action();
      }
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}
