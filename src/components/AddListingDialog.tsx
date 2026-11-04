import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_ATTRIBUTION, TILE_URL } from '../config/map';
import { PHOTO_POOLS } from '../data/images';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { t } from '../i18n/en';
import {
  draftToProperty,
  emptyDraft,
  kmBetween,
  nearestPlace,
  photoToDataUrl,
  suggestTitle,
  validateDraft,
  type DraftErrors,
  type ListingDraft,
  type PlaceCity,
} from '../lib/userListings';
import {
  BILLS,
  EPC_RATINGS,
  FURNISHINGS,
  OUTDOOR_SPACES,
  PARKING_TYPES,
  PROPERTY_TYPES,
  TENURES,
  type AreaUnit,
  type ListingStatus,
  type Property,
} from '../types/property';
import { ResultCard } from './ResultCard';
import { Symbol } from './ui/Symbol';

interface Props {
  places: readonly PlaceCity[];
  myListingsCount: number;
  areaUnit: AreaUnit;
  onSubmit: (p: Property) => void;
  onClearMine: () => void;
  onClose: () => void;
}

const SECTIONS = [
  { id: 'al-basics', label: 'Basics', icon: 'sell' },
  { id: 'al-location', label: 'Location', icon: 'location_on' },
  { id: 'al-details', label: 'Details', icon: 'straighten' },
  { id: 'al-features', label: 'Features', icon: 'checklist' },
  { id: 'al-photos', label: 'Photo & text', icon: 'photo_camera' },
] as const;

const TYPE_ICON = { apartment: 'apartment', house: 'house', townhouse: 'holiday_village', villa: 'villa' } as const;

const PIN_ICON = L.divIcon({
  className: 'picker-pin-icon',
  html: '<div class="picker-pin"><span></span></div>',
  iconSize: [0, 0],
});

interface GeoHit {
  label: string;
  lat: number;
  lng: number;
  road?: string;
  house?: string;
  postcode?: string;
}

/** OpenStreetMap Nominatim lookups (free, rate-limited: used only on explicit clicks). */
async function geocode(q: string): Promise<GeoHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=gb&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(String(res.status));
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string; address?: Record<string, string> }[];
  return rows.map((r) => ({ label: r.display_name, lat: +r.lat, lng: +r.lon, road: r.address?.road, house: r.address?.house_number, postcode: r.address?.postcode }));
}
async function reverseGeocode(lat: number, lng: number): Promise<GeoHit | null> {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const r = (await res.json()) as { display_name?: string; address?: Record<string, string> };
  if (!r.display_name) return null;
  return { label: r.display_name, lat, lng, road: r.address?.road, house: r.address?.house_number, postcode: r.address?.postcode };
}

export function AddListingDialog({ places, myListingsCount, areaUnit, onSubmit, onClearMine, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useDialogFocus(panel, closeButton, onClose, () => document.querySelector<HTMLElement>('[data-add-listing-trigger]'));

  const [d, setD] = useState<ListingDraft>(emptyDraft);
  const set = <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const toggleIn = <K extends 'outdoorSpace' | 'parking' | 'includedBills'>(k: K, v: ListingDraft[K][number]) =>
    setD((prev) => {
      const list = prev[k] as string[];
      return { ...prev, [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    });

  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (submitted) setErrors(validateDraft(d));
  }, [d, submitted]);

  const rent = d.pricePeriod === 'monthly';
  const city = places.find((c) => c.name === d.city) ?? null;
  const scotland = city?.nation === 'scotland';
  const leased = !rent && !scotland && (d.tenure === 'leasehold' || d.tenure === 'share_of_freehold');

  // ------------------------------------------------------------ map view
  const [view, setView] = useState<{ lat: number; lng: number; zoom: number; seq: number }>({ lat: 54.3, lng: -2.6, zoom: 5, seq: 0 });
  const flyTo = (lat: number, lng: number, zoom: number) => setView((v) => ({ lat, lng, zoom, seq: v.seq + 1 }));

  const chooseCity = (name: string) => {
    const c = places.find((x) => x.name === name);
    setD((prev) => ({ ...prev, city: name, neighborhood: '', tenure: c?.nation === 'scotland' ? 'outright' : prev.tenure === 'outright' ? 'leasehold' : prev.tenure }));
    if (c) flyTo(c.lat, c.lng, 12);
  };
  const chooseArea = (name: string) => {
    set('neighborhood', name);
    const a = city?.areas.find((x) => x.name === name);
    if (a) {
      flyTo(a.lat, a.lng, 15);
      setD((prev) => (prev.lat === null ? { ...prev, neighborhood: name, lat: a.lat, lng: a.lng } : { ...prev, neighborhood: name }));
    }
  };

  /** Moving the pin also picks the nearest known city / neighbourhood when the form has none yet. */
  const placePin = (lat: number, lng: number) => {
    const near = nearestPlace(places, { lat, lng });
    setD((prev) => {
      const next = { ...prev, lat: round5(lat), lng: round5(lng) };
      if (near && near.km < 25) {
        if (!prev.city) next.city = near.city.name;
        if (!prev.neighborhood && (prev.city || near.city.name) === near.city.name) next.neighborhood = near.area.name;
      }
      return next;
    });
  };

  const nearest = useMemo(() => (d.lat !== null && d.lng !== null ? nearestPlace(places, { lat: d.lat, lng: d.lng }) : null), [places, d.lat, d.lng]);
  const areaKm = useMemo(() => {
    const a = city?.areas.find((x) => x.name === d.neighborhood);
    return a && d.lat !== null && d.lng !== null ? kmBetween(a, { lat: d.lat, lng: d.lng }) : null;
  }, [city, d.neighborhood, d.lat, d.lng]);

  // ------------------------------------------------------------ address search
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<GeoHit[] | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'busy' | 'error'>('idle');
  const runGeocode = async () => {
    if (!q.trim()) return;
    setGeoState('busy');
    try {
      setHits(await geocode(q.trim()));
      setGeoState('idle');
    } catch {
      setGeoState('error');
    }
  };
  const applyHit = (h: GeoHit) => {
    setHits(null);
    const near = nearestPlace(places, h);
    setD((prev) => ({
      ...prev,
      lat: round5(h.lat),
      lng: round5(h.lng),
      address: h.road ? [h.house, h.road].filter(Boolean).join(' ') : prev.address,
      postcode: h.postcode ?? prev.postcode,
      ...(near && near.km < 25 ? { city: near.city.name, neighborhood: near.area.name, tenure: near.city.nation === 'scotland' ? 'outright' : prev.tenure === 'outright' ? 'leasehold' : prev.tenure } : {}),
    }));
    flyTo(h.lat, h.lng, 17);
  };
  const fillFromPin = async () => {
    if (d.lat === null || d.lng === null) return;
    setGeoState('busy');
    try {
      const h = await reverseGeocode(d.lat, d.lng);
      if (h) setD((prev) => ({ ...prev, address: h.road ? [h.house, h.road].filter(Boolean).join(' ') : prev.address, postcode: h.postcode ?? prev.postcode }));
      setGeoState('idle');
    } catch {
      setGeoState('error');
    }
  };
  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        placePin(pos.coords.latitude, pos.coords.longitude);
        flyTo(pos.coords.latitude, pos.coords.longitude, 16);
      },
      () => setGeoState('error'),
    );
  };

  // ------------------------------------------------------------ photo
  const [photoError, setPhotoError] = useState('');
  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    try {
      set('image', await photoToDataUrl(file));
    } catch {
      setPhotoError('That file could not be read as a photo.');
    }
  };

  // ------------------------------------------------------------ preview & submit
  const preview = useMemo<Property>(() => {
    const filled: ListingDraft = {
      ...d,
      city: d.city || 'London',
      neighborhood: d.neighborhood || 'Neighbourhood',
      address: d.address || 'Street address',
      price: d.price || (rent ? '1500' : '350000'),
      areaSqm: d.areaSqm || '70',
      lat: d.lat ?? 51.5,
      lng: d.lng ?? -0.12,
    };
    return draftToProperty(filled, city?.nation ?? 'england', 'user-preview');
  }, [d, rent, city]);

  const submit = () => {
    setSubmitted(true);
    const e = validateDraft(d);
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      const section = first === 'price' || first === 'areaSqm' ? 'al-details' : 'al-location';
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    onSubmit(draftToProperty(d, city?.nation ?? 'england'));
  };

  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="fixed inset-0 z-[1300] flex items-stretch justify-center bg-ink/40 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="add-listing-title">
      <div ref={panel} className="flex h-full w-full max-w-[1200px] flex-col overflow-hidden bg-surface shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-5 py-3 sm:px-8">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-fixed text-primary">
            <Symbol name="add_home" size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="add-listing-title" className="text-lg font-semibold text-on-surface">
              Add a listing
            </h2>
            <p className="truncate text-xs text-on-surface-variant">Demo only: the listing is stored in this browser and appears in search and on the map right away.</p>
          </div>
          {myListingsCount > 0 && (
            <div className="ml-auto hidden items-center gap-2 text-xs text-on-surface-variant md:flex">
              <span>
                {myListingsCount} listing{myListingsCount === 1 ? '' : 's'} added
              </span>
              {confirmClear ? (
                <>
                  <button type="button" onClick={onClearMine} className="rounded-full bg-error px-3 py-1 font-semibold text-white">
                    Remove all
                  </button>
                  <button type="button" onClick={() => setConfirmClear(false)} className="font-semibold hover:underline">
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmClear(true)} className="font-semibold text-error hover:underline">
                  Remove
                </button>
              )}
            </div>
          )}
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`${myListingsCount > 0 ? '' : 'ml-auto'} grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink`}
          >
            <Symbol name="close" size={20} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Section nav */}
          <nav className="hidden w-48 shrink-0 flex-col gap-1 border-r border-line bg-white p-4 lg:flex" aria-label="Form sections">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-container text-[11px] font-semibold">{i + 1}</span>
                {s.label}
              </button>
            ))}
          </nav>

          {/* Form */}
          <div className="scroll-quiet min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="mx-auto flex max-w-[720px] flex-col gap-6"
            >
              {/* 1. Basics */}
              <Section id="al-basics" n={1} title="Basics" icon="sell">
                <Field label="Listing for">
                  <Segmented
                    value={d.pricePeriod}
                    onChange={(v) => set('pricePeriod', v)}
                    options={[
                      { value: 'total', label: 'For sale', icon: 'sell' },
                      { value: 'monthly', label: 'To rent', icon: 'key' },
                    ]}
                  />
                </Field>
                <Field label="Property type">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PROPERTY_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={d.type === type}
                        onClick={() => set('type', type)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                          d.type === type ? 'border-primary-container bg-primary-fixed/60 text-primary' : 'border-line-strong bg-white text-on-surface hover:border-outline'
                        }`}
                      >
                        <Symbol name={TYPE_ICON[type]} size={24} />
                        {t.propertyTypes[type]}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Status">
                  <select value={d.status} onChange={(e) => set('status', e.target.value as ListingStatus)} className={INPUT}>
                    {(['available', 'under_offer', rent ? 'let' : 'sold'] as const).map((s) => (
                      <option key={s} value={s}>
                        {t.statuses[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              </Section>

              {/* 2. Location */}
              <Section id="al-location" n={2} title="Location" icon="location_on" hint="Search an address or postcode, pick a city and neighbourhood, then fine-tune the pin on the map (click or drag).">
                <Field label="Search address or postcode">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Symbol name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void runGeocode();
                          }
                        }}
                        placeholder="e.g. 10 Downing Street or SW1A 2AA"
                        className={`${INPUT} pl-9`}
                      />
                    </div>
                    <button type="button" onClick={() => void runGeocode()} className="bg-garden h-11 shrink-0 rounded-xl px-4 text-sm font-semibold text-white hover:brightness-110">
                      {geoState === 'busy' ? 'Searching…' : 'Find'}
                    </button>
                  </div>
                  {geoState === 'error' && <p className="mt-1.5 text-xs text-error">Address lookup is not available right now. Place the pin by clicking the map instead.</p>}
                  {hits && (
                    <ul className="mt-2 overflow-hidden rounded-xl border border-line bg-white">
                      {hits.length === 0 && <li className="px-3 py-2 text-sm text-on-surface-variant">No matches in the UK.</li>}
                      {hits.map((h) => (
                        <li key={`${h.lat},${h.lng}`}>
                          <button type="button" onClick={() => applyHit(h)} className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-surface-low">
                            <Symbol name="location_on" size={18} className="mt-0.5 text-primary" />
                            <span className="line-clamp-2">{h.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" error={errors.city}>
                    <select value={d.city} onChange={(e) => chooseCity(e.target.value)} className={INPUT}>
                      <option value="">Choose a city…</option>
                      {places.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Neighbourhood" error={errors.neighborhood}>
                    <input
                      list="al-areas"
                      value={d.neighborhood}
                      disabled={!city}
                      onChange={(e) => (city?.areas.some((a) => a.name === e.target.value) ? chooseArea(e.target.value) : set('neighborhood', e.target.value))}
                      placeholder={city ? 'Pick from the list or type' : 'Choose a city first'}
                      className={INPUT}
                    />
                    <datalist id="al-areas">
                      {city?.areas.map((a) => (
                        <option key={a.name} value={a.name} />
                      ))}
                    </datalist>
                  </Field>
                </div>
                {city && (
                  <div className="-mt-1 flex flex-wrap gap-1.5">
                    {city.areas.map((a) => (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => chooseArea(a.name)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${d.neighborhood === a.name ? 'bg-primary-container text-white' : 'bg-white text-on-surface ring-1 ring-line-strong hover:ring-outline'}`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <div className="relative h-[340px] overflow-hidden rounded-2xl ring-1 ring-line-strong">
                    <MapContainer center={[view.lat, view.lng]} zoom={view.zoom} scrollWheelZoom className="h-full w-full">
                      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
                      <MapView view={view} />
                      <ClickToPlace onPlace={placePin} />
                      {d.lat !== null && d.lng !== null && (
                        <Marker
                          position={[d.lat, d.lng]}
                          icon={PIN_ICON}
                          draggable
                          eventHandlers={{
                            dragend: (e) => {
                              const ll = (e.target as L.Marker).getLatLng();
                              placePin(ll.lat, ll.lng);
                            },
                          }}
                        />
                      )}
                    </MapContainer>
                    {d.lat === null && (
                      <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center">
                        <span className="rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white">Click the map to drop the pin</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
                      <MapButton icon="my_location" onClick={useMyLocation}>
                        My location
                      </MapButton>
                      {d.lat !== null && (
                        <MapButton icon="center_focus_strong" onClick={() => flyTo(d.lat!, d.lng!, 17)}>
                          Zoom to pin
                        </MapButton>
                      )}
                    </div>
                  </div>
                  {errors.pin && <p className="mt-1.5 text-xs font-medium text-error">{errors.pin}</p>}
                  {d.lat !== null && d.lng !== null && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                      <span className="tabular">
                        <Symbol name="pin_drop" size={14} className="mr-1 align-[-2px] text-primary" />
                        {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
                      </span>
                      {nearest && (
                        <span>
                          Nearest known area: <b className="text-on-surface">{nearest.area.name}, {nearest.city.name}</b> ({nearest.km < 1 ? `${Math.round(nearest.km * 1000)} m` : `${nearest.km.toFixed(1)} km`})
                        </span>
                      )}
                      {areaKm !== null && areaKm > 3 && <span className="font-semibold text-secondary">The pin is {areaKm.toFixed(1)} km from {d.neighborhood}: check the location.</span>}
                      <button type="button" onClick={() => void fillFromPin()} className="font-semibold text-primary hover:underline">
                        Fill address from pin
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                  <Field label="Street address" error={errors.address}>
                    <input value={d.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g. Flat 3, 12 Example Road" className={INPUT} />
                  </Field>
                  <Field label="Postcode">
                    <input value={d.postcode} onChange={(e) => set('postcode', e.target.value.toUpperCase())} placeholder="SW1A 2AA" className={`${INPUT} uppercase`} />
                  </Field>
                </div>
              </Section>

              {/* 3. Details */}
              <Section id="al-details" n={3} title="Details" icon="straighten">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={rent ? 'Rent per month' : 'Asking price'} error={errors.price}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-on-surface-variant">£</span>
                      <input inputMode="numeric" value={d.price} onChange={(e) => set('price', formatThousands(e.target.value))} placeholder={rent ? '1,850' : '425,000'} className={`${INPUT} pl-7 ${rent ? 'pr-12' : ''}`} />
                      {rent && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant">pcm</span>}
                    </div>
                  </Field>
                  <Field label="Floor area" error={errors.areaSqm}>
                    <div className="relative">
                      <input inputMode="numeric" value={d.areaSqm} onChange={(e) => set('areaSqm', e.target.value.replace(/[^\d]/g, ''))} placeholder="72" className={`${INPUT} pr-12`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant">m²</span>
                    </div>
                  </Field>
                </div>
                <Field label="Bedrooms">
                  <Pills value={d.bedrooms} onChange={(v) => set('bedrooms', v)} options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n === 0 ? 'Studio' : n === 6 ? '6+' : String(n) }))} />
                </Field>
                <Field label="Bathrooms">
                  <Pills value={d.bathrooms} onChange={(v) => set('bathrooms', v)} options={[1, 2, 3, 4].map((n) => ({ value: n, label: n === 4 ? '4+' : String(n) }))} />
                </Field>
                <Field label="EPC rating">
                  <div className="flex flex-wrap gap-1.5">
                    {EPC_RATINGS.map((r, i) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={d.epcRating === r}
                        onClick={() => set('epcRating', r)}
                        className={`h-9 w-11 rounded-lg text-sm font-bold text-white transition ${d.epcRating === r ? 'scale-110 ring-2 ring-ink ring-offset-2' : 'opacity-60 hover:opacity-100'}`}
                        style={{ background: EPC_COLORS[i] }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>

              {/* 4. Features */}
              <Section id="al-features" n={4} title="Features" icon="checklist" hint="These are the same facts the search filters use, so the listing shows up for matching searches.">
                {rent ? (
                  <>
                    <Field label="Furnishing">
                      <Segmented value={d.furnishing} onChange={(v) => set('furnishing', v)} options={FURNISHINGS.map((f) => ({ value: f, label: t.furnishing[f] }))} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Available from">
                        <input type="date" value={d.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} className={INPUT} />
                      </Field>
                      <Field label="Deposit (weeks of rent)">
                        <input inputMode="numeric" value={d.depositWeeks} onChange={(e) => set('depositWeeks', e.target.value.replace(/[^\d]/g, '').slice(0, 2))} className={INPUT} />
                      </Field>
                    </div>
                    <Field label="Pets">
                      <Segmented
                        value={d.petsAllowed}
                        onChange={(v) => set('petsAllowed', v)}
                        options={[
                          { value: 'yes', label: 'Pets allowed', icon: 'pets' },
                          { value: 'no', label: 'No pets' },
                          { value: 'unknown', label: 'Not stated' },
                        ]}
                      />
                    </Field>
                    <Field label="Bills included">
                      <Toggles items={BILLS.map((b) => ({ key: b, label: t.bills[b], on: d.includedBills.includes(b), toggle: () => toggleIn('includedBills', b) }))} />
                    </Field>
                    <Field label="Tenants">
                      <Toggles
                        items={[
                          { key: 'couples', label: 'Couples welcome', on: d.couplesWelcome, toggle: () => set('couplesWelcome', !d.couplesWelcome) },
                          { key: 'students', label: 'Students welcome', on: d.studentFriendly, toggle: () => set('studentFriendly', !d.studentFriendly) },
                          { key: 'sharers', label: 'Sharers accepted', on: d.sharersAccepted, toggle: () => set('sharersAccepted', !d.sharersAccepted) },
                          { key: 'short', label: 'Short lets considered', on: d.shortLetsAccepted, toggle: () => set('shortLetsAccepted', !d.shortLetsAccepted) },
                        ]}
                      />
                    </Field>
                    <Field label="Outside">
                      <Toggles
                        items={[
                          { key: 'garden', label: 'Garden', on: d.hasGarden, toggle: () => set('hasGarden', !d.hasGarden) },
                          { key: 'parking', label: 'Parking', on: d.hasParking, toggle: () => set('hasParking', !d.hasParking) },
                        ]}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Tenure">
                        {scotland ? (
                          <p className="flex h-11 items-center rounded-xl bg-surface-container px-3 text-sm text-on-surface-variant">{t.tenures.outright}</p>
                        ) : (
                          <select value={d.tenure} onChange={(e) => set('tenure', e.target.value as ListingDraft['tenure'])} className={INPUT}>
                            {TENURES.filter((x) => x !== 'outright').map((x) => (
                              <option key={x} value={x}>
                                {t.tenures[x]}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                      <Field label="Sale">
                        <Toggles
                          items={[
                            { key: 'chain', label: 'Chain free', on: d.chainFree, toggle: () => set('chainFree', !d.chainFree) },
                            { key: 'new', label: 'New build', on: d.newBuild, toggle: () => set('newBuild', !d.newBuild) },
                          ]}
                        />
                      </Field>
                    </div>
                    {leased && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Lease remaining (years)">
                          <input inputMode="numeric" value={d.leaseYearsRemaining} onChange={(e) => set('leaseYearsRemaining', e.target.value.replace(/[^\d]/g, ''))} placeholder="110" className={INPUT} />
                        </Field>
                        <Field label="Service charge (£ / year)">
                          <input inputMode="numeric" value={d.serviceChargePerYear} onChange={(e) => set('serviceChargePerYear', formatThousands(e.target.value))} placeholder="1,800" className={INPUT} />
                        </Field>
                      </div>
                    )}
                    <Field label="Outdoor space">
                      <Toggles items={OUTDOOR_SPACES.map((o) => ({ key: o, label: t.outdoorSpaces[o], on: d.outdoorSpace.includes(o), toggle: () => toggleIn('outdoorSpace', o) }))} />
                    </Field>
                    <Field label="Parking">
                      <Toggles items={PARKING_TYPES.map((o) => ({ key: o, label: t.parkingTypes[o], on: d.parking.includes(o), toggle: () => toggleIn('parking', o) }))} />
                    </Field>
                  </>
                )}
                <Field label="Home & access">
                  <Toggles
                    items={[
                      { key: 'office', label: 'Home office', on: d.homeOffice, toggle: () => set('homeOffice', !d.homeOffice) },
                      { key: 'stepfree', label: 'Step-free access', on: d.stepFreeAccess, toggle: () => set('stepFreeAccess', !d.stepFreeAccess) },
                      { key: 'lift', label: 'Lift', on: d.hasLift, toggle: () => set('hasLift', !d.hasLift) },
                      { key: 'bath', label: 'Accessible bathroom', on: d.accessibleBathroom, toggle: () => set('accessibleBathroom', !d.accessibleBathroom) },
                    ]}
                  />
                </Field>
              </Section>

              {/* 5. Photo & text */}
              <Section id="al-photos" n={5} title="Photo & text" icon="photo_camera">
                <Field label="Cover photo">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong bg-white text-xs font-semibold text-on-surface-variant hover:border-primary-container hover:text-primary">
                      <Symbol name="upload" size={20} />
                      Upload
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
                    </label>
                    {d.image.startsWith('data:') && <Thumb src={d.image} active onClick={() => undefined} />}
                    {PHOTO_POOLS[d.type].slice(0, 4).map((src) => (
                      <Thumb key={src} src={src} active={d.image === src || (!d.image && src === PHOTO_POOLS[d.type][0])} onClick={() => set('image', src)} />
                    ))}
                  </div>
                  {photoError && <p className="mt-1.5 text-xs text-error">{photoError}</p>}
                </Field>
                <Field label="Title">
                  <input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder={suggestTitle(d)} maxLength={90} className={INPUT} />
                </Field>
                <Field label="Description">
                  <textarea
                    value={d.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={4}
                    placeholder="Bright, newly decorated, five minutes from the station…  Keywords here (e.g. “south-facing”, “bills included”) are searchable."
                    className={`${INPUT} h-auto py-2.5`}
                  />
                </Field>
              </Section>
            </form>
          </div>

          {/* Live preview */}
          <aside className="hidden w-[340px] shrink-0 flex-col gap-3 border-l border-line bg-white p-5 xl:flex">
            <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Live preview</div>
            <div className="pointer-events-none [&_article]:w-full">
              <ResultCard property={preview} areaUnit={areaUnit} onOpen={() => undefined} saved={false} onToggleSave={() => undefined} compact />
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-on-surface-variant">
              {SECTIONS.map((s) => {
                const ok =
                  s.id === 'al-location' ? !errorsOf(d).some((k) => ['city', 'neighborhood', 'address', 'pin'].includes(k)) : s.id === 'al-details' ? !errorsOf(d).some((k) => k === 'price' || k === 'areaSqm') : true;
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <Symbol name={ok ? 'check_circle' : 'radio_button_unchecked'} size={16} filled={ok} className={ok ? 'text-primary' : 'text-outline'} />
                    {s.label}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-white px-5 py-3 sm:px-8">
          {Object.keys(errors).length > 0 && <p className="text-xs font-medium text-error">Fill in the highlighted fields to publish.</p>}
          <button type="button" onClick={onClose} className="ml-auto h-11 rounded-xl px-5 text-sm font-semibold text-on-surface hover:bg-surface-low">
            Cancel
          </button>
          <button type="button" onClick={submit} className="bg-garden inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-md hover:brightness-110">
            <Symbol name="publish" size={18} />
            Publish listing
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- helpers

const INPUT =
  'h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-faint focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container/20 disabled:bg-surface-container disabled:text-faint';

const EPC_COLORS = ['#008054', '#19b459', '#8dce46', '#ffd500', '#fcaa65', '#ef8023', '#e9153b'];

const round5 = (x: number) => Math.round(x * 1e5) / 1e5;
const errorsOf = (d: ListingDraft) => Object.keys(validateDraft(d));

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 9);
  return digits ? Number(digits).toLocaleString('en-GB') : '';
}

function MapView({ view }: { view: { lat: number; lng: number; zoom: number; seq: number } }) {
  const map = useMap();
  useEffect(() => {
    if (view.seq > 0) map.flyTo([view.lat, view.lng], view.zoom, { duration: 0.8 });
  }, [map, view]);
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

function ClickToPlace({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapButton({ icon, onClick, children }: { icon: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-md hover:bg-surface-low">
      <Symbol name={icon} size={16} />
      {children}
    </button>
  );
}

function Section({ id, n, title, icon, hint, children }: { id: string; n: number; title: string; icon: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-3xl bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-fixed text-primary">
          <Symbol name={icon} size={20} />
        </span>
        <div>
          <h3 className="text-base font-semibold text-on-surface">
            <span className="mr-1.5 text-outline">{n}.</span>
            {title}
          </h3>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{hint}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-on-surface-variant">{label}</div>
      <div className={error ? '[&_input]:border-error [&_select]:border-error' : ''}>{children}</div>
      {error && <p className="mt-1 text-xs font-medium text-error">{error}</p>}
    </div>
  );
}

function Segmented<V extends string>({ value, onChange, options }: { value: V; onChange: (v: V) => void; options: { value: V; label: string; icon?: string }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-container p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition ${value === o.value ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          {o.icon && <Symbol name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Pills({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: { value: number; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 min-w-12 rounded-xl px-3 text-sm font-semibold transition ${value === o.value ? 'bg-primary-container text-white' : 'bg-white text-on-surface ring-1 ring-line-strong hover:ring-outline'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggles({ items }: { items: { key: string; label: string; on: boolean; toggle: () => void }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <button
          key={i.key}
          type="button"
          aria-pressed={i.on}
          onClick={i.toggle}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition ${i.on ? 'bg-primary-fixed text-primary ring-1 ring-primary-container' : 'bg-white text-on-surface ring-1 ring-line-strong hover:ring-outline'}`}
        >
          <Symbol name={i.on ? 'check' : 'add'} size={16} />
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Thumb({ src, active, onClick }: { src: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`h-20 w-28 overflow-hidden rounded-xl transition ${active ? 'ring-[3px] ring-primary-container ring-offset-2' : 'opacity-80 ring-1 ring-line-strong hover:opacity-100'}`}>
      <img src={src} alt="" className="h-full w-full object-cover" />
    </button>
  );
}
