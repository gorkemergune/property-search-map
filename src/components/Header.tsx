import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../i18n/en';
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon } from './icons';

interface Props {
  city: string | 'all';
  cities: readonly string[];
  onCityChange: (city: string | 'all') => void;
  savedCount: number;
  onOpenSaved: () => void;
}

/** Each arrow click moves the city strip by this many tabs. */
export const CITY_TABS_PER_STEP = 3;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollStrip(el: HTMLElement, left: number, smooth: boolean) {
  const behavior: ScrollBehavior = smooth && !prefersReducedMotion() ? 'smooth' : 'auto';
  if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior });
  else el.scrollLeft = left;
}

/** Brand, city switcher and demo notice. */
export function Header({ city, cities, onCityChange, savedCount, onOpenSaved }: Props) {
  const tabs: { value: string | 'all'; label: string }[] = [
    { value: 'all', label: t.nav.allMarkets },
    ...cities.map((c) => ({ value: c, label: c })),
  ];

  // The strip scrolls three ways: the arrow buttons (mouse users without a
  // horizontal wheel, e.g. on Windows), the visible scrollbar, and
  // trackpad/touch. The arrows are disabled at the matching end.
  const strip = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  const updateEdges = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = { atStart: el.scrollLeft <= 1, atEnd: el.scrollLeft >= max - 1 };
    setEdges((prev) => (prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next));
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      observer.disconnect();
    };
  }, [updateEdges]);

  const step = (direction: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    const items = [...el.children] as HTMLElement[];
    // Index of the first tab whose left edge is in view; move from there by a fixed number of tabs.
    const first = Math.max(0, items.findIndex((li) => li.offsetLeft + li.offsetWidth / 2 >= el.scrollLeft));
    const target = items[Math.min(items.length - 1, Math.max(0, first + direction * CITY_TABS_PER_STEP))];
    const left = direction === 1 && first + CITY_TABS_PER_STEP >= items.length ? el.scrollWidth : (target?.offsetLeft ?? 0) - 4;
    scrollStrip(el, Math.max(0, left), true);
  };

  // Keep the chosen city visible, whether it was picked here, in the filters or restored from a shared link.
  const firstReveal = useRef(true);
  useLayoutEffect(() => {
    const el = strip.current;
    const active = el?.querySelector<HTMLElement>('[aria-pressed="true"]')?.parentElement;
    if (!el || !active) return;
    const smooth = !firstReveal.current;
    firstReveal.current = false;
    const pad = 24;
    if (active.offsetLeft - pad < el.scrollLeft) scrollStrip(el, active.offsetLeft - pad, smooth);
    else if (active.offsetLeft + active.offsetWidth + pad > el.scrollLeft + el.clientWidth)
      scrollStrip(el, active.offsetLeft + active.offsetWidth + pad - el.clientWidth, smooth);
  }, [city]);

  const arrow =
    'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:border-line disabled:text-faint disabled:opacity-60';

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-6 border-b border-line bg-white px-4 sm:px-8">
      <a href="/" className="flex shrink-0 items-baseline gap-1.5" aria-label={`${t.brand} ${t.brandSub}`}>
        <span className="font-serif text-[26px] leading-none tracking-tight text-ink">Iceberg</span>
        <span className="relative -top-px grid h-4.5 w-4.5 place-items-center rounded-[5px] bg-accent text-[11px] font-semibold text-white">
          X
        </span>
      </a>

      <nav aria-label={t.nav.markets} className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 lg:flex">
        <button type="button" className={arrow} onClick={() => step(-1)} disabled={edges.atStart} aria-label={t.nav.prevCities} aria-controls="city-tabs">
          <ChevronLeftIcon />
        </button>
        <ul
          id="city-tabs"
          ref={strip}
          className="tabs-scroll relative flex w-full max-w-[760px] items-center gap-0.5 rounded-2xl bg-canvas px-1 pb-1 pt-1"
        >
          {tabs.map((m) => {
            const active = city === m.value;
            return (
              <li key={m.value} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onCityChange(m.value)}
                  aria-pressed={active}
                  className={`h-9 rounded-full px-4 text-[13px] transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                    active ? 'bg-white font-medium text-ink shadow-[0_1px_3px_rgb(29_28_26/0.12)]' : 'text-muted hover:text-ink'
                  }`}
                >
                  {m.label}
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className={arrow} onClick={() => step(1)} disabled={edges.atEnd} aria-label={t.nav.nextCities} aria-controls="city-tabs">
          <ChevronRightIcon />
        </button>
      </nav>

      <p className="ml-auto flex items-center gap-2 text-xs text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        {t.demoBadge}
      </p>
      <button
        type="button"
        data-saved-trigger
        onClick={onOpenSaved}
        aria-label={t.saved.openLabel(savedCount)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line-strong pl-3 pr-3.5 text-[13px] text-ink transition hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <HeartIcon width={15} height={15} fill={savedCount > 0 ? 'currentColor' : 'none'} className={savedCount > 0 ? 'text-accent' : ''} />
        <span className="hidden sm:inline">{t.saved.open}</span>
        <span className="tabular">{savedCount}</span>
      </button>
    </header>
  );
}
