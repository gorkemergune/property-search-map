import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_MAX_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '../config/map';
import { t } from '../i18n/en';
import { formatMarkerPrice, formatPrice } from '../lib/format';
import type { Property } from '../types/property';

/** Below this zoom, price pills would pile up, so markers render as dots. */
const PRICE_LABEL_MIN_ZOOM = 10;
const FOCUS_ZOOM = 14;

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
}

type MarkerState = 'default' | 'hovered' | 'selected';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function markerIcon(p: Property, state: MarkerState, showPrice: boolean): L.DivIcon {
  const classes = ['price-marker', `is-${state}`, showPrice ? '' : 'is-dot', p.status === 'available' ? '' : 'is-inactive']
    .filter(Boolean)
    .join(' ');
  return L.divIcon({
    className: 'price-marker-icon',
    iconSize: [0, 0],
    html: `<span class="${classes}">${showPrice ? escapeHtml(formatMarkerPrice(p)) : ''}</span>`,
  });
}

export function PropertyMap({ properties, selectedId, hoveredId, flyTarget, onSelect, onHover }: Props) {
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
        <Markers properties={properties} selectedId={selectedId} hoveredId={hoveredId} onSelect={onSelect} onHover={onHover} />
        <ViewController properties={properties} target={flyTarget} />
      </MapContainer>
      {tilesUnavailable && (
        <p role="status" className="absolute left-4 right-4 top-4 z-[1000] rounded-xl bg-white/95 px-4 py-3 text-[13px] text-ink-soft shadow-[0_4px_16px_-4px_rgb(29_28_26/0.25)] sm:right-auto sm:max-w-sm">
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
 */
function Markers({
  properties,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: Pick<Props, 'properties' | 'selectedId' | 'hoveredId' | 'onSelect' | 'onHover'>) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const showPrice = zoom >= PRICE_LABEL_MIN_ZOOM;

  const [focusId, setFocusId] = useState<string | null>(null);
  const inResults = (id: string | null) => id !== null && properties.some((p) => p.id === id);
  const tabbableId = inResults(selectedId) ? selectedId : inResults(focusId) ? focusId : (properties[0]?.id ?? null);

  const latest = useRef({ properties, onSelect, onHover });
  latest.current = { properties, onSelect, onHover };

  useEffect(() => {
    const pane = map.getPane('markerPane');
    if (!pane) return;
    const markerOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest<HTMLElement>('[data-listing-id]') ?? null;

    const onKeyDown = (e: KeyboardEvent) => {
      const el = markerOf(e.target);
      if (!el) return;
      const { properties: list, onSelect: select } = latest.current;
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

  return properties.map((p) => {
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
        onSelect={onSelect}
        onHover={onHover}
      />
    );
  });
}

function PriceMarker({
  property: p,
  state,
  tabbable,
  zIndexOffset,
  showPrice,
  onSelect,
  onHover,
}: {
  property: Property;
  state: MarkerState;
  tabbable: boolean;
  zIndexOffset: number;
  showPrice: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const marker = useRef<L.Marker>(null);
  const icon = useMemo(() => markerIcon(p, state, showPrice), [p, state, showPrice]);
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
