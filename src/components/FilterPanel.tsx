import { useId, type ReactNode } from 'react';
import { MARKETS, PRICE_STEPS } from '../data/markets';
import { t } from '../i18n/en';
import { formatCompactAmount } from '../lib/format';
import {
  AREA_STEPS,
  BATHROOM_OPTIONS,
  BEDROOM_MAX_OPTIONS,
  BEDROOM_MIN_OPTIONS,
  getPriceContext,
  statusesFor,
  type Filters,
} from '../lib/filters';
import { formatArea } from '../lib/format';
import { AREA_UNITS, COUNTRY_CODES, FURNISHINGS, PROPERTY_TYPES, type AreaUnit, type CountryCode, type PricePeriod } from '../types/property';

export interface FieldProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}

/**
 * Individual filter controls. The desktop toolbar shows them in popovers; the
 * drawer (`FilterPanel`) stacks all of them. Each instance gets its own ids.
 */

export function CountryField({ filters, onChange }: FieldProps) {
  const id = useId();
  return (
    <Labeled label={t.filters.country} htmlFor={id}>
      <select
        id={id}
        value={filters.country}
        onChange={(e) => onChange({ country: e.target.value as CountryCode | 'all' })}
        className={selectClass}
      >
        <option value="all">{t.filters.allCountries}</option>
        {COUNTRY_CODES.map((c) => (
          <option key={c} value={c}>
            {t.countries[c]} · {MARKETS[c].currency}
          </option>
        ))}
      </select>
    </Labeled>
  );
}

export function CityField({ filters, onChange, citiesByCountry }: FieldProps & { citiesByCountry: Record<CountryCode, string[]> }) {
  const id = useId();
  const countries = filters.country === 'all' ? COUNTRY_CODES : [filters.country];
  return (
    <Labeled label={t.filters.city} htmlFor={id}>
      <select id={id} value={filters.city} onChange={(e) => onChange({ city: e.target.value })} className={selectClass}>
        <option value="all">{t.filters.allCities}</option>
        {countries.map((c) => (
          <optgroup key={c} label={t.countries[c]}>
            {citiesByCountry[c].map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </Labeled>
  );
}

export function ListingTypeField({ filters, onChange }: FieldProps) {
  return (
    <Choices<PricePeriod | 'all'>
      label={t.filters.listingType}
      value={filters.pricePeriod}
      onChange={(pricePeriod) => onChange({ pricePeriod })}
      options={[
        { value: 'all', label: t.filters.anyListing },
        { value: 'total', label: t.listingType.total },
        { value: 'monthly', label: t.listingType.monthly },
      ]}
    />
  );
}

export function PriceField({ filters, onChange }: FieldProps) {
  const id = useId();
  const ctx = getPriceContext(filters);
  if (!ctx) {
    return <p className="max-w-64 text-[13px] leading-relaxed text-muted">{t.filters.priceLocked}</p>;
  }
  const steps = PRICE_STEPS[ctx.currency][ctx.pricePeriod];
  const format = (v: number) => formatCompactAmount(v, ctx.currency);
  const parse = (v: string) => (v === '' ? null : Number(v));
  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        {ctx.pricePeriod === 'monthly' ? t.filters.monthlyRent : t.filters.price} · {ctx.currency}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <label htmlFor={`${id}-min`} className="sr-only">
          {t.filters.min}
        </label>
        <select
          id={`${id}-min`}
          value={filters.minPrice ?? ''}
          onChange={(e) => onChange({ minPrice: parse(e.target.value) })}
          className={`${selectClass} tabular`}
        >
          <option value="">{t.filters.noMin}</option>
          {steps.map((s) => (
            <option key={s} value={s} disabled={filters.maxPrice !== null && s > filters.maxPrice}>
              {format(s)}
            </option>
          ))}
        </select>
        <span className="text-faint">–</span>
        <label htmlFor={`${id}-max`} className="sr-only">
          {t.filters.max}
        </label>
        <select
          id={`${id}-max`}
          value={filters.maxPrice ?? ''}
          onChange={(e) => onChange({ maxPrice: parse(e.target.value) })}
          className={`${selectClass} tabular`}
        >
          <option value="">{t.filters.noMax}</option>
          {steps.map((s) => (
            <option key={s} value={s} disabled={filters.minPrice !== null && s < filters.minPrice}>
              {format(s)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function TypeField({ filters, onChange }: FieldProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.filters.propertyType}>
      {PROPERTY_TYPES.map((type) => {
        const on = filters.types.includes(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={on}
            onClick={() => onChange({ types: on ? filters.types.filter((x) => x !== type) : [...filters.types, type] })}
            className={chipClass(on)}
          >
            {t.propertyTypes[type]}
          </button>
        );
      })}
    </div>
  );
}

export function BedroomsField({ filters, onChange }: FieldProps) {
  return (
    <RangeSelect
      minLabel={t.filters.minBedrooms}
      maxLabel={t.filters.maxBedrooms}
      min={filters.minBedrooms}
      max={filters.maxBedrooms}
      minOptions={BEDROOM_MIN_OPTIONS}
      maxOptions={BEDROOM_MAX_OPTIONS}
      formatMin={t.bedrooms.minOption}
      formatMax={t.bedrooms.option}
      onChange={(minBedrooms, maxBedrooms) => onChange({ minBedrooms, maxBedrooms })}
    />
  );
}

export function BathroomsField({ filters, onChange }: FieldProps) {
  return (
    <RangeSelect
      minLabel={t.filters.minBathrooms}
      maxLabel={t.filters.maxBathrooms}
      min={filters.minBathrooms}
      max={filters.maxBathrooms}
      minOptions={BATHROOM_OPTIONS}
      maxOptions={BATHROOM_OPTIONS}
      formatMin={(n) => `${n}+`}
      formatMax={String}
      onChange={(minBathrooms, maxBathrooms) => onChange({ minBathrooms, maxBathrooms })}
    />
  );
}

export function AreaField({ filters, onChange }: FieldProps) {
  const steps = AREA_STEPS[filters.areaUnit];
  const fmt = (v: number) => formatArea(v, filters.areaUnit);
  return (
    <div className="space-y-3">
      <Choices<AreaUnit>
        label={t.filters.areaUnit}
        value={filters.areaUnit}
        onChange={(areaUnit) => onChange({ areaUnit })}
        options={AREA_UNITS.map((u) => ({ value: u, label: t.areaUnits[u] }))}
      />
      <RangeSelect
        minLabel={t.filters.minArea}
        maxLabel={t.filters.maxArea}
        min={filters.minArea}
        max={filters.maxArea}
        minOptions={steps}
        maxOptions={steps}
        formatMin={fmt}
        formatMax={fmt}
        onChange={(minArea, maxArea) => onChange({ minArea, maxArea })}
      />
    </div>
  );
}

export function FurnishingField({ filters, onChange }: FieldProps) {
  if (filters.pricePeriod !== 'monthly') {
    return <p className="max-w-64 text-[13px] leading-relaxed text-muted">{t.filters.furnishingLocked}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.filters.furnishing}>
      {FURNISHINGS.map((item) => {
        const on = filters.furnishing.includes(item);
        return (
          <button
            key={item}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange({ furnishing: on ? filters.furnishing.filter((x) => x !== item) : [...filters.furnishing, item] })
            }
            className={chipClass(on)}
          >
            {t.furnishing[item]}
          </button>
        );
      })}
    </div>
  );
}

export function StatusField({ filters, onChange }: FieldProps) {
  return (
    <div className="space-y-2.5" role="group" aria-label={t.filters.status}>
      {statusesFor(filters.pricePeriod).map((status) => {
        const on = filters.statuses.includes(status);
        return (
          <label key={status} className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={on}
              onChange={() =>
                onChange({ statuses: on ? filters.statuses.filter((s) => s !== status) : [...filters.statuses, status] })
              }
              className="h-4 w-4 rounded border-line-strong accent-ink"
            />
            {t.statuses[status]}
          </label>
        );
      })}
    </div>
  );
}

/** Every filter stacked; used in the drawer ("All filters" on desktop, "Filters" on mobile). */
export function FilterPanel(props: FieldProps & { citiesByCountry: Record<CountryCode, string[]> }) {
  return (
    <div className="divide-y divide-line">
      <Section title={t.filters.market}>
        <div className="grid gap-3">
          <CountryField {...props} />
          <CityField {...props} />
        </div>
      </Section>
      <Section title={t.filters.listingType}>
        <ListingTypeField {...props} />
      </Section>
      <Section title={t.filters.price}>
        <PriceField {...props} />
      </Section>
      <Section title={t.filters.propertyType}>
        <TypeField {...props} />
      </Section>
      <Section title={t.filters.bedrooms}>
        <BedroomsField {...props} />
      </Section>
      <Section title={t.filters.bathrooms}>
        <BathroomsField {...props} />
      </Section>
      <Section title={t.filters.area}>
        <AreaField {...props} />
      </Section>
      <Section title={t.filters.furnishing}>
        <FurnishingField {...props} />
      </Section>
      <Section title={t.filters.status}>
        <StatusField {...props} />
      </Section>
    </div>
  );
}

export const selectClass =
  'h-10 w-full appearance-none rounded-lg border border-line-strong bg-white bg-[length:10px] bg-[right_12px_center] bg-no-repeat pl-3 pr-8 text-sm text-ink focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ' +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2375716a' stroke-width='1.4'/%3E%3C/svg%3E\")]";

export function chipClass(on: boolean): string {
  return `h-9 rounded-lg border px-3.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
    on ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink'
  }`;
}

/** Two selects for an inclusive min/max range; options that would invert the range are disabled. */
function RangeSelect({
  minLabel,
  maxLabel,
  min,
  max,
  minOptions,
  maxOptions,
  formatMin,
  formatMax,
  onChange,
}: {
  minLabel: string;
  maxLabel: string;
  min: number | null;
  max: number | null;
  minOptions: readonly number[];
  maxOptions: readonly number[];
  formatMin: (v: number) => string;
  formatMax: (v: number) => string;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const id = useId();
  const parse = (v: string) => (v === '' ? null : Number(v));
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
      <div>
        <label htmlFor={`${id}-min`} className="mb-1.5 block text-xs text-muted">
          {minLabel}
        </label>
        <select
          id={`${id}-min`}
          value={min ?? ''}
          onChange={(e) => onChange(parse(e.target.value), max)}
          className={`${selectClass} tabular`}
        >
          <option value="">{t.filters.noMinShort}</option>
          {minOptions.map((v) => (
            <option key={v} value={v} disabled={max !== null && v > max}>
              {formatMin(v)}
            </option>
          ))}
        </select>
      </div>
      <span className="pb-2.5 text-faint">–</span>
      <div>
        <label htmlFor={`${id}-max`} className="mb-1.5 block text-xs text-muted">
          {maxLabel}
        </label>
        <select
          id={`${id}-max`}
          value={max ?? ''}
          onChange={(e) => onChange(min, parse(e.target.value))}
          className={`${selectClass} tabular`}
        >
          <option value="">{t.filters.noMaxShort}</option>
          {maxOptions.map((v) => (
            <option key={v} value={v} disabled={min !== null && v < min}>
              {formatMax(v)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <h3 className="mb-3.5 text-[13px] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Labeled({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function Choices<V extends string | number>({
  label,
  value,
  options,
  onChange,
  wrap = false,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
  /** Wrap onto several lines as separate chips instead of one segmented control. */
  wrap?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={wrap ? 'flex flex-wrap gap-1.5' : 'inline-flex w-full rounded-lg bg-canvas p-1'}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={
              wrap
                ? `${chipClass(on)} min-w-12`
                : `h-8 flex-1 rounded-md text-sm transition focus-visible:outline-2 focus-visible:outline-accent ${
                    on ? 'bg-white font-medium text-ink shadow-[0_1px_2px_rgb(29_28_26/0.12)]' : 'text-muted hover:text-ink'
                  }`
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
