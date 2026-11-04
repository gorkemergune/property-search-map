import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { t } from '../i18n/en';
import { formatAmount, formatListedDate, formatPropertyArea } from '../lib/format';
import { getInsights, transitFor, type Amenity, type AreaScores } from '../lib/insights';
import { fetchLiveNearby, homedataEnabled, type LiveNearby, type LivePlace } from '../lib/live';
import type { Recommendation } from '../lib/recommend';
import { buildListingSummary } from '../lib/summary';
import type { AreaUnit, Property } from '../types/property';
import { PropertyImage } from './PropertyImage';
import { Symbol } from './ui/Symbol';

interface Props {
  property: Property;
  areaUnit: AreaUnit;
  onClose: () => void;
  onShowOnMap: (id: string) => void;
  saved: boolean;
  onToggleSave: (id: string) => void;
  similar?: Recommendation[];
  onOpenListing?: (id: string) => void;
}

/**
 * Listing details in a right-hand drawer (full screen on phones).
 * Focus moves into the drawer, Tab stays inside it, Escape closes it and focus
 * returns to the element that opened it.
 */
export function ListingDetail({ property: p, areaUnit, onClose, onShowOnMap, saved, onToggleSave, similar = [], onOpenListing }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useDialogFocus(panel, closeButton, onClose, () => document.querySelector<HTMLElement>(`#card-${p.id} button[aria-label^="View"]`));

  const ins = getInsights(p);
  const summary = buildListingSummary(p, areaUnit);
  const otherUnit: AreaUnit = areaUnit === 'sqm' ? 'sqft' : 'sqm';
  const titleId = `detail-title-${p.id}`;

  useEffect(() => {
    panel.current?.scrollTo?.({ top: 0 });
  }, [p.id]);

  return (
    <div className="fixed inset-0 z-1250 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" tabIndex={-1} aria-hidden="true" className="hidden flex-1 bg-inverse-surface/30 backdrop-blur-[2px] sm:block" onClick={onClose} />
      <div ref={panel} className="scroll-quiet flex h-full w-full flex-col overflow-y-auto bg-surface shadow-[-12px_0_40px_-12px_rgb(15_23_42/0.3)] sm:max-w-[760px]">
        <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-surface/90 px-5 backdrop-blur-xl sm:px-8">
          <button type="button" onClick={() => onShowOnMap(p.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-high">
            <Symbol name="map" size={16} />
            {t.detail.showOnMap}
          </button>
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => onToggleSave(p.id)}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${saved ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface hover:bg-surface-high'}`}
          >
            <Symbol name="favorite" size={16} filled={saved} />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button ref={closeButton} type="button" onClick={onClose} aria-label={t.detail.close} className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface">
            <Symbol name="close" size={20} />
          </button>
        </div>

        <div className="px-5 pb-12 pt-2 sm:px-8">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-surface-container">
            <PropertyImage property={p} />
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
              <span className="flex items-center gap-1 rounded-lg bg-inverse-surface/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                <Symbol name="visibility" size={14} /> {ins.popularity.viewsWeek} views this week
              </span>
              {p.status !== 'available' && <span className="rounded-lg bg-surface-lowest/95 px-2.5 py-1 text-[11px] font-semibold text-on-surface">{t.statuses[p.status]}</span>}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
            <span>{p.pricePeriod === 'monthly' ? 'To rent' : 'For sale'}</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant">{t.propertyTypes[p.type]}</span>
            <span className="ml-auto rounded-full bg-secondary-fixed/50 px-2.5 py-0.5 text-[11px] text-secondary">{ins.popularity.level}</span>
          </div>
          <h2 id={titleId} className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-on-surface">
            {p.title}
          </h2>
          <p className="mt-1.5 flex items-center gap-1 text-sm text-on-surface-variant">
            <Symbol name="location_on" size={18} className="text-outline" />
            {p.address} · {p.neighborhood}, {p.city}
          </p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-2xl bg-surface-lowest p-5 shadow-card tabular">
            <span className="text-3xl font-bold tracking-tight text-on-surface">{formatAmount(p.price, p.currency)}</span>
            {p.pricePeriod === 'monthly' && <span className="text-base text-on-surface-variant">pcm</span>}
            {ins.value && <ValuePill diff={ins.value.diffPct} area={ins.value.comparedTo} />}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact icon="bed" label={t.detail.bedrooms}>{p.bedrooms === 0 ? t.bedrooms.studio : p.bedrooms}</Fact>
            <Fact icon="bathtub" label={t.detail.bathrooms}>{p.bathrooms}</Fact>
            <Fact icon="square_foot" label={t.detail.area}>
              {formatPropertyArea(p, areaUnit)}
              <span className="block text-[11px] font-normal text-on-surface-variant">{formatPropertyArea(p, otherUnit)}</span>
            </Fact>
            <Fact icon="bolt" label={t.detail.epc}>{p.epcRating}</Fact>
          </dl>

          {/* AI summary */}
          <Section icon="auto_awesome" title="AI summary" tone="text-primary">
            <p className="text-[15px] leading-relaxed text-on-surface">{ins.summary}</p>
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Listing keywords">
              {ins.tags.map((tag) => (
                <li
                  key={tag.key}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                    tag.tone === 'proximity' ? 'bg-secondary-fixed/45 text-on-secondary-fixed' : tag.tone === 'feature' ? 'bg-primary-fixed/60 text-on-primary-fixed-variant' : 'bg-surface-high text-on-surface-variant'
                  }`}
                >
                  <Symbol name={tag.icon} size={14} />
                  {tag.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-outline">Generated from the listing's own keywords and area data. An LLM-written summary can replace this once an API key is connected.</p>
          </Section>

          {/* Why here */}
          <Section icon="lightbulb" title={`Why choose ${p.neighborhood}?`} tone="text-secondary">
            {ins.whyHere.length > 0 && (
              <ul className="mb-5 space-y-2">
                {ins.whyHere.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-on-surface">
                    <Symbol name="check_circle" size={18} className="mt-px text-secondary" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
            <Scores scores={ins.scores} />
          </Section>

          {/* Nearby */}
          <Section icon="pin_drop" title="What's nearby" tone="text-primary">
            <Nearby p={p} amenities={ins.amenities} />
          </Section>

          {/* Popularity */}
          <Section icon="local_fire_department" title="Popularity" tone="text-primary-container">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Views this week" value={ins.popularity.viewsWeek} sub={`${ins.popularity.trend >= 0 ? '+' : ''}${ins.popularity.trend}% vs last week`} up={ins.popularity.trend >= 0} />
              <Stat label="Saves" value={ins.popularity.saves} />
              <Stat label="Enquiries" value={ins.popularity.enquiries} />
              <Stat label={`Rank in ${p.city}`} value={`Top ${Math.max(1, 100 - ins.popularity.cityPercentile)}%`} />
            </div>
            <p className="mt-3 text-[11px] text-outline">Views, saves and enquiries are demo estimates shaped by price-per-m² value, freshness and location. Value comparison is computed from {ins.value?.sample ?? 'the'} listings in this dataset.</p>
          </Section>

          {/* Community */}
          <Section icon="forum" title={`What locals say about ${p.neighborhood}`} tone="text-tertiary">
            <ul className="space-y-3">
              {ins.voices.map((v) => (
                <li key={v.text} className="rounded-2xl bg-surface-low p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-tertiary-fixed text-[11px] font-bold text-on-tertiary-fixed">{v.author[0].toUpperCase()}</span>
                    <span className="font-semibold text-on-surface">{v.author}</span>
                    <span className="text-outline">· {v.meta}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.sentiment === 'positive' ? 'bg-secondary-fixed/50 text-secondary' : v.sentiment === 'mixed' ? 'bg-primary-fixed/60 text-on-primary-fixed-variant' : 'bg-error/10 text-error'}`}>{v.topic}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">“{v.text}”</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-outline">Sample community comments for the demo, not real posts. A production version would summarise public forum threads (e.g. local Reddit / community boards) with sources linked.</p>
          </Section>

          {/* Full details */}
          <Section icon="list_alt" title={t.details.heading} tone="text-on-surface-variant">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {summary.groups.map((group) => (
                <div key={group.key} role="group" aria-label={group.title}>
                  <p className="text-[13px] font-semibold text-on-surface">{group.title}</p>
                  <dl className="mt-1.5 divide-y divide-surface-high">
                    {group.rows.map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                        <dt className="text-on-surface-variant">{row.label}</dt>
                        <dd className={`text-right tabular ${row.value === null ? 'text-outline' : 'font-medium text-on-surface'}`}>{row.value ?? t.details.notStated}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-on-surface-variant">
              Listed {formatListedDate(p.listedAt)} · updated {formatListedDate(p.updatedAt)}
            </p>
          </Section>

          {similar.length > 0 && (
            <Section icon="travel_explore" title="Similar homes" tone="text-secondary">
              <ul className="grid gap-3 sm:grid-cols-2">
                {similar.map((r) => (
                  <li key={r.property.id}>
                    <button type="button" onClick={() => onOpenListing?.(r.property.id)} className="flex w-full gap-3 rounded-2xl bg-surface-low p-2.5 text-left transition hover:bg-surface-container">
                      <span className="block aspect-4/3 w-24 shrink-0 overflow-hidden rounded-xl">
                        <PropertyImage property={r.property} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-on-surface tabular">
                          {formatAmount(r.property.price, r.property.currency)}
                          {r.property.pricePeriod === 'monthly' && <span className="font-normal text-on-surface-variant"> pcm</span>}
                        </span>
                        <span className="block truncate text-xs text-on-surface-variant">
                          {r.property.neighborhood}, {r.property.city}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[11px] text-outline">{r.reasons[0] ?? ''}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="mt-10 pt-4 text-xs text-outline">
            {t.detail.demoNote} {t.detail.approximateLocation} {t.detail.listingId}: {p.id}
          </p>
        </div>
      </div>
    </div>
  );
}

function ValuePill({ diff, area }: { diff: number; area: string }) {
  const good = diff <= -5;
  const high = diff >= 8;
  return (
    <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${good ? 'bg-secondary-fixed/50 text-secondary' : high ? 'bg-primary-fixed/60 text-on-primary-fixed-variant' : 'bg-surface-high text-on-surface-variant'}`}>
      <Symbol name={good ? 'trending_down' : high ? 'trending_up' : 'trending_flat'} size={16} />
      {Math.abs(diff) < 5 ? `In line with ${area} per m²` : `${Math.abs(diff)}% ${diff < 0 ? 'below' : 'above'} ${area} avg per m²`}
    </span>
  );
}

function Section({ icon, title, tone, children }: { icon: string; title: string; tone: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-3xl bg-surface-lowest p-5 shadow-card sm:p-6">
      <h3 className={`mb-4 flex items-center gap-2 text-sm font-semibold ${tone}`}>
        <Symbol name={icon} size={20} />
        <span className="text-on-surface">{title}</span>
      </h3>
      {children}
    </section>
  );
}

function Fact({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-lowest p-3.5 shadow-card">
      <dt className="flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
        <Symbol name={icon} size={15} /> {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-on-surface tabular">{children}</dd>
    </div>
  );
}

function Stat({ label, value, sub, up }: { label: string; value: ReactNode; sub?: string; up?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-low p-3.5">
      <div className="text-[11px] font-medium text-on-surface-variant">{label}</div>
      <div className="mt-0.5 text-xl font-bold text-on-surface tabular">{value}</div>
      {sub && <div className={`text-[11px] font-semibold ${up ? 'text-secondary' : 'text-error'}`}>{sub}</div>}
    </div>
  );
}

const SCORE_LABEL: Record<keyof AreaScores, { label: string; icon: string }> = {
  transport: { label: 'Transport', icon: 'directions_subway' },
  schools: { label: 'Schools', icon: 'school' },
  green: { label: 'Green space', icon: 'park' },
  amenities: { label: 'Shops & GP', icon: 'storefront' },
  quiet: { label: 'Quietness', icon: 'volume_off' },
  nightlife: { label: 'Nightlife', icon: 'nightlife' },
};

function Scores({ scores }: { scores: AreaScores }) {
  return (
    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {(Object.keys(SCORE_LABEL) as (keyof AreaScores)[]).map((k) => (
        <div key={k}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium text-on-surface-variant">
              <Symbol name={SCORE_LABEL[k].icon} size={15} /> {SCORE_LABEL[k].label}
            </span>
            <span className="font-semibold text-on-surface tabular">{scores[k]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-container" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scores[k]} aria-label={SCORE_LABEL[k].label}>
            <div className={`h-full rounded-full ${scores[k] >= 70 ? 'bg-secondary' : scores[k] >= 45 ? 'bg-primary-container' : 'bg-outline-variant'}`} style={{ width: `${scores[k]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const KIND_ICON: Record<string, string> = {
  transit: 'directions_subway', primarySchool: 'school', secondarySchool: 'school', school: 'school', gp: 'medical_services',
  hospital: 'local_hospital', park: 'park', supermarket: 'local_grocery_store', university: 'account_balance',
};
const LIVE_LABEL: Record<LivePlace['kind'], string> = { transit: 'Station', school: 'School', hospital: 'Hospital', gp: 'GP surgery', park: 'Park' };

const distance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);

function Nearby({ p, amenities }: { p: Property; amenities: Amenity[] }) {
  const [live, setLive] = useState<{ status: 'loading' | 'done'; data: LiveNearby | null }>({ status: 'loading', data: null });

  useEffect(() => {
    let alive = true;
    setLive({ status: 'loading', data: null });
    fetchLiveNearby(p.id, p.lat, p.lng).then((data) => alive && setLive({ status: 'done', data }));
    return () => {
      alive = false;
    };
  }, [p.id, p.lat, p.lng]);

  const places = live.data?.places ?? [];
  const priority = ['school', 'hospital', 'transit', 'gp', 'park'] as const;

  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {amenities.map((a) => (
          <li key={a.kind} className="flex items-center gap-3 rounded-xl bg-surface-low px-3 py-2.5">
            <Symbol name={KIND_ICON[a.kind]} size={20} className={a.kind === 'hospital' || a.kind === 'gp' ? 'text-error' : a.kind.includes('School') ? 'text-primary' : 'text-secondary'} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-on-surface">{a.kind === 'transit' ? transitFor(p.city).label : a.label}</span>
              {a.rating && <span className={`text-[11px] font-semibold ${a.rating === 'Outstanding' ? 'text-secondary' : 'text-on-surface-variant'}`}>Ofsted: {a.rating} (est.)</span>}
            </span>
            <span className="text-right text-xs font-semibold text-on-surface tabular">
              {a.walkMin} min
              <span className="block font-normal text-outline">{distance(a.meters)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-outline">Walking times above are neighbourhood estimates used for tagging and search.</p>

      <div className="mt-5 rounded-2xl border border-surface-high p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface">
          <span className={`h-2 w-2 rounded-full ${live.status === 'loading' ? 'animate-pulse bg-primary-container' : places.length ? 'bg-secondary' : 'bg-outline-variant'}`} />
          Live check
          {live.data?.postcode && (
            <span className="font-normal text-on-surface-variant">
              · near {live.data.postcode.postcode}
              {live.data.postcode.ward ? `, ${live.data.postcode.ward}` : ''}
            </span>
          )}
          {live.data && live.data.sources.length > 0 && <span className="ml-auto font-normal text-outline">Source: {live.data.sources.join(', ')}</span>}
        </div>
        {live.status === 'loading' && <p className="text-sm text-on-surface-variant">Checking OpenStreetMap for named schools, hospitals and stations…</p>}
        {live.status === 'done' && places.length === 0 && (
          <p className="text-sm text-on-surface-variant">Live sources did not answer right now (they are free, rate-limited services). The estimates above still apply.</p>
        )}
        {places.length > 0 && (
          <ul className="space-y-1.5">
            {priority.flatMap((k) =>
              places
                .filter((x) => x.kind === k)
                .slice(0, k === 'school' ? 3 : 2)
                .map((x) => (
                  <li key={`${k}-${x.name}`} className="flex items-center gap-2 text-sm">
                    <Symbol name={KIND_ICON[k]} size={17} className="text-on-surface-variant" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-on-surface">{x.name}</span> <span className="text-[11px] text-outline">{LIVE_LABEL[k]}</span>
                      {x.rating && <span className="ml-1 rounded bg-secondary-fixed/50 px-1.5 text-[10px] font-semibold text-secondary">Ofsted {x.rating}</span>}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular text-on-surface">
                      {distance(x.meters)} · {x.walkMin} min
                    </span>
                  </li>
                )),
            )}
          </ul>
        )}
        {!homedataEnabled && <p className="mt-3 text-[11px] text-outline">Ofsted ratings by postcode switch on when the HomeData API key is added (see .env.example).</p>}
      </div>
    </div>
  );
}
