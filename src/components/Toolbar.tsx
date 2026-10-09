import { t } from '../i18n/en';
import { bedroomsLabel, type FilterChip, type Filters } from '../lib/filters';
import type { CountryCode, PricePeriod, Property } from '../types/property';
import { BedroomsField, CityField, PriceField, StatusField, TypeField } from './FilterPanel';
import { SlidersIcon } from './icons';
import { Popover } from './Popover';
import { SearchBox } from './SearchBox';

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  chips: FilterChip[];
  citiesByCountry: Record<CountryCode, string[]>;
  cityCountry: Readonly<Record<string, CountryCode>>;
  properties: readonly Property[];
  onOpenFilters: () => void;
  onOpenListing: (id: string) => void;
}

const TABS: { period: PricePeriod | 'all'; label: string }[] = [
  { period: 'total', label: t.nav.buy },
  { period: 'monthly', label: t.nav.rent },
  { period: 'all', label: t.nav.all },
];

/** Search row: Buy/Rent tabs, search with suggestions, quick filter popovers (xl+) and the full filter drawer. */
export function Toolbar({ filters, onChange, chips, citiesByCountry, cityCountry, properties, onOpenFilters, onOpenListing }: Props) {
  const fieldProps = { filters, onChange };
  const priceChip = chips.find((c) => c.key === 'price');
  const typeLabel =
    filters.types.length === 0
      ? t.filters.homeType
      : filters.types.length === 1
        ? t.propertyTypes[filters.types[0]]
        : `${t.propertyTypes[filters.types[0]]} +${filters.types.length - 1}`;
  const statusLabel =
    filters.statuses.length === 0
      ? t.filters.statusShort
      : filters.statuses.length === 1
        ? t.statuses[filters.statuses[0]]
        : `${t.statuses[filters.statuses[0]]} +${filters.statuses.length - 1}`;

  return (
    <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-white px-4 py-3 sm:px-8">
      <div role="radiogroup" aria-label={t.filters.listingType} className="flex items-center gap-5">
        {TABS.map((tab) => {
          const active = filters.pricePeriod === tab.period;
          return (
            <button
              key={tab.period}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ pricePeriod: tab.period })}
              className={`relative h-10 text-sm transition focus-visible:outline-2 focus-visible:outline-accent ${
                active ? 'font-semibold text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              <span
                className={`absolute inset-x-0 -bottom-3 h-0.5 rounded-full bg-accent transition ${active ? 'opacity-100' : 'opacity-0'}`}
              />
            </button>
          );
        })}
      </div>

      <span className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />

      <SearchBox
        properties={properties}
        filters={filters}
        cityCountry={cityCountry}
        onChange={onChange}
        onOpenListing={onOpenListing}
      />

      <div className="hidden items-center gap-2 xl:flex">
        <Popover label={filters.city !== 'all' ? filters.city : t.filters.city} title={t.filters.city} active={filters.city !== 'all'} width={280}>
          <CityField {...fieldProps} citiesByCountry={citiesByCountry} />
        </Popover>
        <Popover label={priceChip?.label ?? t.filters.priceShort} title={t.filters.price} active={!!priceChip} width={320}>
          <PriceField {...fieldProps} />
        </Popover>
        <Popover label={typeLabel} title={t.filters.propertyType} active={filters.types.length > 0} width={300}>
          <TypeField {...fieldProps} />
        </Popover>
        <Popover
          label={bedroomsLabel(filters.minBedrooms, filters.maxBedrooms) ?? t.filters.beds}
          title={t.filters.bedrooms}
          active={filters.minBedrooms !== null || filters.maxBedrooms !== null}
          width={320}
        >
          <BedroomsField {...fieldProps} />
        </Popover>
        <Popover label={statusLabel} title={t.filters.status} active={filters.statuses.length > 0} width={240}>
          <StatusField {...fieldProps} />
        </Popover>
      </div>

      <button
        type="button"
        data-filters-trigger
        onClick={onOpenFilters}
        className="ml-auto flex h-10 items-center gap-2 rounded-full border border-line-strong pl-3.5 pr-4 text-sm text-ink transition hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <SlidersIcon width={16} height={16} />
        <span className="xl:hidden">{t.results.filtersButton}</span>
        <span className="hidden xl:inline">{t.results.allFilters}</span>
        {chips.length > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white tabular">
            {chips.length}
          </span>
        )}
      </button>
    </div>
  );
}
