import { t } from '../i18n/en';
import { MAP_MODES, type MapMode } from '../lib/heat';
import type { HeatStyle } from './HeatLayer';

/** Warm ramp for demand, cool ramp for supply, so the two layers are never confused. */
export const HEAT_STYLES: Record<Exclude<MapMode, 'homes'>, HeatStyle> = {
  popular: {
    stops: [
      [0, 'rgba(254,240,138,0)'],
      [0.25, '#fde68a'],
      [0.55, '#f59e0b'],
      [0.8, '#ea580c'],
      [1, '#9f1239'],
    ],
    radiusMeters: 2_200,
    intensity: 0.8,
  },
  density: {
    stops: [
      [0, 'rgba(204,251,241,0)'],
      [0.25, '#99f6e4'],
      [0.55, '#14b8a6'],
      [0.8, '#0e7490'],
      [1, '#1e3a8a'],
    ],
    radiusMeters: 1_300,
    intensity: 0.4,
  },
};

/** Map view switcher: price markers, demo popularity heat, or listing density heat. */
export function MapModeControl({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label={t.mapLayers.label}
      className="inline-flex rounded-full bg-white/95 p-1 shadow-[0_4px_16px_-4px_rgb(29_28_26/0.3)] backdrop-blur"
    >
      {MAP_MODES.map((m) => {
        const on = m === mode;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m)}
            className={`h-8 whitespace-nowrap rounded-full px-3 text-[12.5px] transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              on ? 'bg-ink font-medium text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t.mapLayers.modes[m]}
          </button>
        );
      })}
    </div>
  );
}

/** Legend for the active heat layer. Text carries the meaning; colour only reinforces it. */
export function HeatLegend({ mode, resultCount }: { mode: Exclude<MapMode, 'homes'>; resultCount: number }) {
  const l = t.mapLayers.legend[mode];
  const ramp = HEAT_STYLES[mode].stops.map(([offset, colour]) => `${colour} ${offset * 100}%`).join(', ');
  const { popular, density } = t.mapLayers.legend;
  const caption = mode === 'popular' ? popular.caption : resultCount === 0 ? density.empty : density.caption(resultCount);
  return (
    <section
      aria-label={l.title}
      className="w-60 rounded-xl bg-white/95 px-3.5 py-3 text-ink shadow-[0_4px_16px_-4px_rgb(29_28_26/0.3)] backdrop-blur"
    >
      <h3 className="text-[12.5px] font-semibold">{l.title}</h3>
      <div className="mt-2 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${ramp})` }} aria-hidden="true" />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{l.low}</span>
        <span>{l.high}</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted" role="status">
        {caption}
      </p>
    </section>
  );
}
