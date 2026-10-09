import { t } from '../i18n/en';
import { COUNTRY_CODES, type CountryCode } from '../types/property';

interface Props {
  country: CountryCode | 'all';
  onCountryChange: (country: CountryCode | 'all') => void;
}

const MARKETS: { value: CountryCode | 'all'; label: string }[] = [
  { value: 'all', label: t.nav.allMarkets },
  ...COUNTRY_CODES.map((c) => ({ value: c, label: t.countries[c] })),
];

/** Brand, market switcher (one market = one currency) and demo notice. */
export function Header({ country, onCountryChange }: Props) {
  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-6 border-b border-line bg-white px-4 sm:px-8">
      <a href="/" className="flex shrink-0 items-baseline gap-1.5" aria-label={`${t.brand} ${t.brandSub}`}>
        <span className="font-serif text-[26px] leading-none tracking-tight text-ink">Iceberg</span>
        <span className="relative -top-px grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-accent text-[11px] font-semibold text-white">
          X
        </span>
      </a>

      <nav aria-label={t.nav.markets} className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
        <ul className="flex items-center gap-0.5 rounded-full bg-canvas p-1">
          {MARKETS.map((m) => {
            const active = country === m.value;
            return (
              <li key={m.value}>
                <button
                  type="button"
                  onClick={() => onCountryChange(m.value)}
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
    </header>
  );
}
