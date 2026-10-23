import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { t } from '../i18n/en';
import {
  NO_DATA_COLOR,
  POPULATION_STOPS,
  POPULATION_TICKS,
  ZERO_COUNT_COLOR,
  countBins,
  formatBin,
  populationScale,
  type AreaCounts,
  type AreaSources,
} from '../lib/areas';
import { MAP_MODES, type MapMode } from '../lib/heat';
import type { AreaLevel } from './AreaLayer';

const PANEL = 'rounded-xl bg-white/95 text-ink shadow-[0_4px_16px_-4px_rgb(29_28_26/0.3)] backdrop-blur';

/**
 * Map view switcher: price markers, census population density, or listing
 * density. A radio group with arrow-key navigation; each option carries a
 * short description so the two shaded views are told apart before choosing.
 */
export function MapModeControl({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (MAP_MODES.indexOf(mode) + step + MAP_MODES.length) % MAP_MODES.length;
    onChange(MAP_MODES[next]);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={t.mapLayers.label} onKeyDown={onKeyDown} className={`inline-flex rounded-full p-1 ${PANEL}`}>
      {MAP_MODES.map((m, i) => {
        const on = m === mode;
        return (
          <button
            key={m}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t.mapLayers.modes[m]}
            aria-describedby={`map-mode-hint-${m}`}
            tabIndex={on ? 0 : -1}
            title={t.mapLayers.hints[m]}
            onClick={() => onChange(m)}
            className={`h-8 whitespace-nowrap rounded-full px-3 text-[12.5px] transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              on ? 'bg-ink font-medium text-white' : 'text-ink-soft hover:bg-canvas hover:text-ink'
            }`}
          >
            {t.mapLayers.modes[m]}
            <span id={`map-mode-hint-${m}`} className="sr-only">
              {t.mapLayers.hints[m]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type AreaStatus = 'idle' | 'loading' | 'error' | 'ready';

function StatusLine({ status, onRetry }: { status: AreaStatus; onRetry?: () => void }) {
  if (status === 'loading' || status === 'idle') {
    return <p className="mt-2 text-[11.5px] text-muted">{t.mapLayers.loading}</p>;
  }
  if (status === 'error') {
    return (
      <div role="alert" className="mt-2 text-[11.5px] leading-snug text-ink-soft">
        {t.mapLayers.failed}{' '}
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-medium text-accent underline underline-offset-2">
            {t.mapLayers.retry}
          </button>
        )}
      </div>
    );
  }
  return null;
}

function SourceNote({ sources, children }: { sources: AreaSources; children?: ReactNode }) {
  return (
    <details className="mt-2 text-[11px] leading-snug text-muted">
      <summary className="cursor-pointer select-none font-medium text-ink-soft hover:text-ink">{t.mapLayers.aboutData}</summary>
      <div className="mt-1.5 space-y-1.5">
        {children}
        <p>
          {sources.population.publisher}.{' '}
          <a href={sources.population.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            {sources.population.title}
          </a>
          . Published {sources.population.published}.
        </p>
        <p>
          Boundaries: {sources.lad.title}; {sources.wards.title} ({sources.lad.publisher}).
        </p>
        <p>{sources.licence}</p>
      </div>
    </details>
  );
}

/** Legend for the census population-density view. */
export function PopulationLegend({ status, sources, onRetry }: { status: AreaStatus; sources: AreaSources | null; onRetry?: () => void }) {
  const l = t.mapLayers.popular;
  const ramp = POPULATION_STOPS.map(([offset, colour]) => `${colour} ${offset * 100}%`).join(', ');
  return (
    <section aria-label={l.title} className={`w-72 max-w-[calc(100vw-1.5rem)] px-3.5 py-3 ${PANEL}`}>
      <details>
      <summary className="cursor-pointer text-[12.5px] font-semibold focus-visible:outline-2 focus-visible:outline-accent">
        {l.title} · Map key
      </summary>
      <p className="mt-1 text-[11.5px] font-medium text-ink-soft">{l.subtitle}</p>
      {status !== 'ready' || !sources ? (
        <StatusLine status={status} onRetry={onRetry} />
      ) : (
        <>
          <div className="mt-2 h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${ramp})` }} aria-hidden="true" />
          <div className="relative mt-1 h-3.5 text-[10.5px] text-muted tabular" aria-hidden="true">
            {POPULATION_TICKS.map((v) => (
              <span key={v} className="absolute -translate-x-1/2" style={{ left: `${populationScale(v) * 100}%` }}>
                {v >= 1000 ? `${v / 1000}k` : v}
              </span>
            ))}
          </div>
          <p className="sr-only">
            {l.low} to {l.high}, from {POPULATION_TICKS[0]} to over {POPULATION_TICKS[POPULATION_TICKS.length - 1].toLocaleString('en-GB')} {l.unit}.
          </p>
          <p className="mt-0.5 flex items-center justify-between text-[11px] text-muted">
            <span>{l.unit}</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NO_DATA_COLOR }} aria-hidden="true" />
              {l.noData}
            </span>
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">{l.caveat}</p>
          <p className="mt-1 text-[11px] text-muted">
            {t.mapLayers.source}: ONS mid-year population estimates, {sources.population.year}. {l.level}
          </p>
          <SourceNote sources={sources} />
        </>
      )}
      </details>
    </section>
  );
}

export interface AreaSummary {
  code: string;
  name: string;
  count: number;
}

/** Legend for listing density: count classes, the current level, and the busiest areas as zoom shortcuts. */
export function ListingDensityLegend({
  status,
  sources,
  onRetry,
  resultCount,
  counts,
  level,
  topAreas,
  onFocusArea,
}: {
  status: AreaStatus;
  sources: AreaSources | null;
  onRetry?: () => void;
  resultCount: number;
  counts: AreaCounts | null;
  level: AreaLevel;
  topAreas: AreaSummary[];
  onFocusArea: (code: string) => void;
}) {
  const l = t.mapLayers.density;
  const levelCounts = counts ? (level === 'ward' ? counts.ward : counts.lad) : null;
  const max = levelCounts ? Math.max(0, ...levelCounts.values()) : 0;
  const bins = countBins(max);
  return (
    <section aria-label={l.title} className={`w-72 max-w-[calc(100vw-1.5rem)] px-3.5 py-3 ${PANEL}`}>
      <details>
      <summary className="cursor-pointer text-[12.5px] font-semibold focus-visible:outline-2 focus-visible:outline-accent">
        {l.title} · Map key
      </summary>
      <p className="mt-1 text-[11.5px] font-medium text-ink-soft">{l.subtitle}</p>
      {status !== 'ready' || !sources || !counts ? (
        <StatusLine status={status} onRetry={onRetry} />
      ) : (
        <>
          <ul className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-ink-soft tabular" aria-label="Colour key">
            <li className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-3.5 rounded-sm border border-[#134e5e]/30" style={{ background: ZERO_COUNT_COLOR }} aria-hidden="true" />
              0 · {l.zero}
            </li>
            {bins.map((b) => (
              <li key={b.min} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: b.color }} aria-hidden="true" />
                {formatBin(b)}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] leading-snug text-muted" role="status">
            {resultCount === 0 ? l.empty : l.caption(resultCount)} {level === 'ward' ? l.byWard : l.byLad}
          </p>
          {counts.unassigned > 0 && <p className="mt-1 text-[11px] text-ink-soft">{l.unassigned(counts.unassigned)}</p>}
          {topAreas.length > 0 && (
            <details className="mt-2 text-[11px]">
              <summary className="cursor-pointer select-none font-medium text-ink-soft hover:text-ink">{l.topAreas}</summary>
              <ol className="mt-1 max-h-40 space-y-0.5 overflow-y-auto pr-1">
                {topAreas.map((a) => (
                  <li key={a.code}>
                    <button
                      type="button"
                      onClick={() => onFocusArea(a.code)}
                      aria-label={l.zoomTo(a.name, a.count)}
                      className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left text-ink-soft hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="truncate">{a.name}</span>
                      <span className="tabular font-medium">{a.count}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <SourceNote sources={sources}>
            <p>{l.method}</p>
          </SourceNote>
        </>
      )}
      </details>
    </section>
  );
}
