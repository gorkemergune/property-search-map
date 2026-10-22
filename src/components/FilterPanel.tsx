import { useId, type ReactNode } from 'react';
import { PRICE_STEPS } from '../data/markets';
import { t } from '../i18n/en';
import { formatCompactAmount } from '../lib/format';
import {
  AREA_STEPS,
  BATHROOM_OPTIONS,
  BEDROOM_MAX_OPTIONS,
  BEDROOM_MIN_OPTIONS,
  COMPLETION_OPTIONS,
  DEPOSIT_WEEK_OPTIONS,
  GROUND_RENT_OPTIONS,
  LEASE_YEAR_OPTIONS,
  PET_POLICIES,
  RENT_FLAGS,
  SERVICE_CHARGE_OPTIONS,
  statusesFor,
  type CompletionFilter,
  type Filters,
  type PetPolicy,
  type RentFlag,
} from '../lib/filters';
import { formatArea } from '../lib/format';
import {
  AREA_UNITS,
  BILLS,
  EPC_RATINGS,
  FURNISHINGS,
  OUTDOOR_SPACES,
  PARKING_TYPES,
  PROPERTY_TYPES,
  TENURES,
  type AreaUnit,
  type EpcRating,
  type PricePeriod,
} from '../types/property';

export interface FieldProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}

/**
 * Individual filter controls. The desktop toolbar shows them in popovers; the
 * drawer (`FilterPanel`) stacks all of them. Each instance gets its own ids.
 */

export function CityField({ filters, onChange, cities }: FieldProps & { cities: readonly string[] }) {
  const id = useId();
  return (
    <Labeled label={t.filters.city} htmlFor={id}>
      <select id={id} value={filters.city} onChange={(e) => onChange({ city: e.target.value })} className={selectClass}>
        <option value="all">{t.filters.allCities}</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
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

/** Reusable min/max dropdown pair for a single period's prices. */
function PriceRange({
  heading,
  period,
  min,
  max,
  onChange,
}: {
  heading: string;
  period: PricePeriod;
  min: number | null;
  max: number | null;
  onChange: (patch: Partial<Filters>) => void;
}) {
  const id = useId();
  const steps = PRICE_STEPS.GBP[period];
  const format = (v: number) => formatCompactAmount(v, 'GBP');
  const parse = (v: string) => (v === '' ? null : Number(v));
  const minKey = period === 'total' ? 'minSalePrice' : 'minMonthlyPrice';
  const maxKey = period === 'total' ? 'maxSalePrice' : 'maxMonthlyPrice';
  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        {heading} · GBP
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <label htmlFor={`${id}-min`} className="sr-only">
          {t.filters.min}
        </label>
        <select
          id={`${id}-min`}
          value={min ?? ''}
          onChange={(e) => onChange({ [minKey]: parse(e.target.value) })}
          className={`${selectClass} tabular`}
        >
          <option value="">{t.filters.noMin}</option>
          {steps.map((s) => (
            <option key={s} value={s} disabled={max !== null && s > max}>
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
          value={max ?? ''}
          onChange={(e) => onChange({ [maxKey]: parse(e.target.value) })}
          className={`${selectClass} tabular`}
        >
          <option value="">{t.filters.noMax}</option>
          {steps.map((s) => (
            <option key={s} value={s} disabled={min !== null && s < min}>
              {format(s)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PriceField({ filters, onChange }: FieldProps) {
  const showSale = filters.pricePeriod !== 'monthly';
  const showMonthly = filters.pricePeriod !== 'total';
  return (
    <div className="space-y-4">
      {showSale && (
        <PriceRange
          heading={t.filters.price}
          period="total"
          min={filters.minSalePrice}
          max={filters.maxSalePrice}
          onChange={onChange}
        />
      )}
      {showMonthly && (
        <PriceRange
          heading={t.filters.monthlyRent}
          period="monthly"
          min={filters.minMonthlyPrice}
          max={filters.maxMonthlyPrice}
          onChange={onChange}
        />
      )}
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

export function FeaturesField({ filters, onChange }: FieldProps) {
  const sale = filters.pricePeriod === 'total';
  const items: { key: 'hasGarden' | 'hasParking' | 'newBuildOnly' | 'chainFree'; label: string; show: boolean }[] = [
    { key: 'hasGarden', label: t.filters.gardenLabel, show: true },
    { key: 'hasParking', label: t.filters.parkingLabel, show: true },
    { key: 'newBuildOnly', label: t.filters.newBuildLabel, show: sale },
    { key: 'chainFree', label: t.filters.chainFreeLabel, show: sale },
  ];
  return <Checkboxes label={t.filters.features} items={items.filter((i) => i.show)} filters={filters} onChange={onChange} />;
}

const ACCESSIBILITY_FLAGS = ['stepFreeAccess', 'hasLift', 'accessibleBathroom'] as const satisfies readonly RentFlag[];
const TENANCY_FLAGS = RENT_FLAGS.filter((key) => !(ACCESSIBILITY_FLAGS as readonly RentFlag[]).includes(key));

/** Rentals only: pet policy plus who the home is let to. */
export function TenancyField({ filters, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs text-muted">{t.filters.pets}</p>
        <Choices<PetPolicy>
          label={t.filters.pets}
          value={filters.petPolicy}
          onChange={(petPolicy) => onChange({ petPolicy })}
          options={PET_POLICIES.map((value) => ({ value, label: t.petPolicy[value] }))}
        />
      </div>
      <Checkboxes
        label={t.filters.tenancy}
        items={TENANCY_FLAGS.map((key) => ({ key, label: t.filters.rentFlags[key].label }))}
        filters={filters}
        onChange={onChange}
      />
      <p className="text-xs text-muted">{t.filters.unknownHint}</p>
    </div>
  );
}

export function AccessibilityField({ filters, onChange }: FieldProps) {
  return (
    <Checkboxes
      label={t.filters.accessibility}
      items={ACCESSIBILITY_FLAGS.map((key) => ({ key, label: t.filters.rentFlags[key].label }))}
      filters={filters}
      onChange={onChange}
    />
  );
}

export function BillsField({ filters, onChange }: FieldProps) {
  return (
    <div className="space-y-2">
      <ToggleChips
        label={t.filters.bills}
        options={BILLS.map((value) => ({ value, label: t.bills[value] }))}
        selected={filters.includedBills}
        onChange={(includedBills) => onChange({ includedBills })}
      />
      <p className="text-xs text-muted">{t.filters.billsHint}</p>
    </div>
  );
}

export function DepositField({ filters, onChange }: FieldProps) {
  return (
    <PresetSelect
      label={t.filters.depositLabel}
      anyLabel={t.filters.anyDeposit}
      value={filters.maxDepositWeeks}
      options={DEPOSIT_WEEK_OPTIONS}
      format={t.filters.depositOption}
      onChange={(maxDepositWeeks) => onChange({ maxDepositWeeks })}
    />
  );
}

export function OutdoorSpaceField({ filters, onChange }: FieldProps) {
  return (
    <ToggleChips
      label={t.filters.outdoorSpace}
      options={OUTDOOR_SPACES.map((value) => ({ value, label: t.outdoorSpaces[value] }))}
      selected={filters.outdoorSpace}
      onChange={(outdoorSpace) => onChange({ outdoorSpace })}
    />
  );
}

export function ParkingTypeField({ filters, onChange }: FieldProps) {
  return (
    <ToggleChips
      label={t.filters.parkingType}
      options={PARKING_TYPES.map((value) => ({ value, label: t.parkingTypes[value] }))}
      selected={filters.parkingTypes}
      onChange={(parkingTypes) => onChange({ parkingTypes })}
    />
  );
}

export function CompletionField({ filters, onChange }: FieldProps) {
  return (
    <Choices<CompletionFilter>
      label={t.filters.completion}
      value={filters.completion}
      onChange={(completion) => onChange({ completion })}
      options={COMPLETION_OPTIONS.map((value) => ({ value, label: t.completion[value] }))}
    />
  );
}

export function LeaseholdField({ filters, onChange }: FieldProps) {
  const gbp = (v: number) => formatCompactAmount(v, 'GBP');
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t.filters.leaseHint}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <PresetSelect
          label={t.filters.minLeaseLabel}
          anyLabel={t.filters.anyValue}
          value={filters.minLeaseYears}
          options={LEASE_YEAR_OPTIONS}
          format={t.filters.leaseOption}
          onChange={(minLeaseYears) => onChange({ minLeaseYears })}
        />
        <PresetSelect
          label={t.filters.serviceChargeLabel}
          anyLabel={t.filters.anyValue}
          value={filters.maxServiceCharge}
          options={SERVICE_CHARGE_OPTIONS}
          format={(v) => t.filters.perYearOption(gbp(v))}
          onChange={(maxServiceCharge) => onChange({ maxServiceCharge })}
        />
        <PresetSelect
          label={t.filters.groundRentLabel}
          anyLabel={t.filters.anyValue}
          value={filters.maxGroundRent}
          options={GROUND_RENT_OPTIONS}
          format={(v) => t.filters.groundRentOption(v, gbp(v))}
          onChange={(maxGroundRent) => onChange({ maxGroundRent })}
        />
      </div>
    </div>
  );
}

export function EpcField({ filters, onChange }: FieldProps) {
  const id = useId();
  return (
    <Labeled label={t.filters.epcHint} htmlFor={id}>
      <select
        id={id}
        value={filters.minEpcRating ?? ''}
        onChange={(e) => onChange({ minEpcRating: (e.target.value || null) as EpcRating | null })}
        className={selectClass}
      >
        <option value="">{t.filters.anyEpc}</option>
        {EPC_RATINGS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </Labeled>
  );
}

export function TenureField({ filters, onChange }: FieldProps) {
  if (filters.pricePeriod !== 'total') {
    return <p className="max-w-64 text-[13px] leading-relaxed text-muted">{t.filters.tenureLocked}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.filters.tenure}>
      {TENURES.map((item) => {
        const on = filters.tenure.includes(item);
        return (
          <button
            key={item}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange({ tenure: on ? filters.tenure.filter((x) => x !== item) : [...filters.tenure, item] })
            }
            className={chipClass(on)}
          >
            {t.tenures[item]}
          </button>
        );
      })}
    </div>
  );
}

export function AvailableByField({ filters, onChange }: FieldProps) {
  const id = useId();
  if (filters.pricePeriod !== 'monthly') {
    return <p className="max-w-64 text-[13px] leading-relaxed text-muted">{t.filters.availableByLocked}</p>;
  }
  return (
    <Labeled label={t.filters.availableByLabel} htmlFor={id}>
      <input
        id={id}
        type="date"
        value={filters.availableBy ?? ''}
        onChange={(e) => onChange({ availableBy: e.target.value || null })}
        className={`${selectClass} tabular`}
      />
    </Labeled>
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
export function FilterPanel(props: FieldProps & { cities: readonly string[] }) {
  const period = props.filters.pricePeriod;
  return (
    <div className="divide-y divide-line">
      <Section title={t.filters.city}>
        <CityField {...props} />
      </Section>
      <Section title={t.filters.listingType}>
        <ListingTypeField {...props} />
        {period === 'all' && <p className="mt-2.5 text-xs leading-relaxed text-muted">{t.filters.contextHint}</p>}
      </Section>
      <Section title={t.filters.price}>
        <PriceField {...props} />
      </Section>

      {/* Context-specific filters come straight after price so they are seen without scrolling far. */}
      {period === 'monthly' && (
        <>
          <GroupHeading>{t.filters.rentalGroup}</GroupHeading>
          <Section title={t.filters.tenancy}>
            <TenancyField {...props} />
          </Section>
          <Section title={t.filters.bills}>
            <BillsField {...props} />
          </Section>
          <Section title={t.filters.deposit}>
            <DepositField {...props} />
          </Section>
          <Section title={t.filters.accessibility}>
            <AccessibilityField {...props} />
          </Section>
          <Section title={t.filters.furnishing}>
            <FurnishingField {...props} />
          </Section>
          <Section title={t.filters.availableBy}>
            <AvailableByField {...props} />
          </Section>
        </>
      )}
      {period === 'total' && (
        <>
          <GroupHeading>{t.filters.saleGroup}</GroupHeading>
          <Section title={t.filters.tenure}>
            <TenureField {...props} />
          </Section>
          <Section title={t.filters.leasehold}>
            <LeaseholdField {...props} />
          </Section>
          <Section title={t.filters.outdoorSpace}>
            <OutdoorSpaceField {...props} />
          </Section>
          <Section title={t.filters.parkingType}>
            <ParkingTypeField {...props} />
          </Section>
          <Section title={t.filters.completion}>
            <CompletionField {...props} />
          </Section>
        </>
      )}

      {period !== 'all' && <GroupHeading>{t.filters.homeGroup}</GroupHeading>}
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
      <Section title={t.filters.features}>
        <FeaturesField {...props} />
      </Section>
      <Section title={t.filters.epc}>
        <EpcField {...props} />
      </Section>
      <Section title={t.filters.status}>
        <StatusField {...props} />
      </Section>
    </div>
  );
}

/** Divider label between groups of sections in the drawer. */
function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pb-1 pt-7 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent first:pt-0">{children}</h3>
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

type BooleanFilterKey = { [K in keyof Filters]: Filters[K] extends boolean ? K : never }[keyof Filters];

/** A group of must-have checkboxes bound to boolean filters. */
function Checkboxes({
  label,
  items,
  filters,
  onChange,
}: FieldProps & { label: string; items: { key: BooleanFilterKey; label: string }[] }) {
  return (
    <div className="space-y-2.5" role="group" aria-label={label}>
      {items.map((item) => {
        const on = filters[item.key];
        return (
          <label key={item.key} className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={on}
              onChange={() => onChange({ [item.key]: !on })}
              className="h-4 w-4 rounded border-line-strong accent-ink"
            />
            {item.label}
          </label>
        );
      })}
    </div>
  );
}

/** Multi-select chip buttons (`aria-pressed`) for a list-valued filter. */
function ToggleChips<V extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: V; label: string }[];
  selected: readonly V[];
  onChange: (next: V[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
            className={chipClass(on)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** One labelled select over numeric presets; the empty option means "any". */
function PresetSelect({
  label,
  anyLabel,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  anyLabel: string;
  value: number | null;
  options: readonly number[];
  format: (v: number) => string;
  onChange: (value: number | null) => void;
}) {
  const id = useId();
  return (
    <Labeled label={label} htmlFor={id}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={`${selectClass} tabular`}
      >
        <option value="">{anyLabel}</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {format(v)}
          </option>
        ))}
      </select>
    </Labeled>
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
