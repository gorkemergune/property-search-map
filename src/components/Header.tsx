import { t } from '../i18n/en';
import { HeartIcon } from './icons';

interface Props {
  city: string | 'all';
  cities: readonly string[];
  onCityChange: (city: string | 'all') => void;
  savedCount: number;
  onOpenSaved: () => void;
}

/** Brand, city switcher and demo notice. */
export function Header({ city, cities, onCityChange, savedCount, onOpenSaved }: Props) {
  const tabs: { value: string | 'all'; label: string }[] = [
    { value: 'all', label: t.nav.allMarkets },
    ...cities.map((c) => ({ value: c, label: c })),
  ];

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-6 border-b border-line bg-white px-4 sm:px-8">
      <a href="/" className="flex shrink-0 items-baseline gap-1.5" aria-label={`${t.brand} ${t.brandSub}`}>
        <span className="font-serif text-[26px] leading-none tracking-tight text-ink">Iceberg</span>
        <span className="relative -top-px grid h-4.5 w-4.5 place-items-center rounded-[5px] bg-accent text-[11px] font-semibold text-white">
          X
        </span>
      </a>

      <nav
        aria-label={t.nav.markets}
        className="hidden min-w-0 flex-1 justify-center lg:flex"
      >
        <ul
          className="tabs-scroll flex w-full max-w-[760px] items-center gap-0.5 rounded-2xl bg-canvas px-1 pb-1 pt-1"
        >
          {tabs.map((m) => {
            const active = city === m.value;
            return (
              <li key={m.value} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onCityChange(m.value)}
                  aria-pressed={active}
                  className={`h-9 rounded-full px-4 text-[13px] transition focus-visible:outline-2 focus-visible:outline-accent ${
                    active ? 'bg-white font-medium text-ink shadow-[0_1px_3px_rgb(29_28_26/0.12)]' : 'text-muted hover:text-ink'
                  }`}
                >
                  {m.label}
                </button>
              </li>
            );
          })}
        </ul>
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
