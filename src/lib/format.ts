import { UI_LOCALE, t } from '../i18n/en';
import { SQFT_PER_SQM, type AreaUnit, type Currency, type Property } from '../types/property';

const fullFormatters = new Map<Currency, Intl.NumberFormat>();
const compactFormatters = new Map<Currency, Intl.NumberFormat>();

function full(currency: Currency): Intl.NumberFormat {
  let f = fullFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(UI_LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    fullFormatters.set(currency, f);
  }
  return f;
}

function compact(currency: Currency): Intl.NumberFormat {
  let f = compactFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(UI_LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    compactFormatters.set(currency, f);
  }
  return f;
}

/** "$1,650,000" or "$4,350" (no period suffix). */
export function formatAmount(amount: number, currency: Currency): string {
  return full(currency).format(amount);
}

/** Short amount for markers and filter options: "$1.7M", "₺42K", "£2,375". */
export function formatCompactAmount(amount: number, currency: Currency): string {
  return amount >= 10_000 ? compact(currency).format(amount) : full(currency).format(amount);
}

/** Card price: total for sale listings, "/mo" suffix for rentals. */
export function formatPrice(p: Pick<Property, 'price' | 'currency' | 'pricePeriod'>): string {
  const amount = formatAmount(p.price, p.currency);
  return p.pricePeriod === 'monthly' ? `${amount}${t.price.perMonth}` : amount;
}

/** Marker label: compact, with "/mo" for rentals so sale and rent never look alike. */
export function formatMarkerPrice(p: Pick<Property, 'price' | 'currency' | 'pricePeriod'>): string {
  const amount = formatCompactAmount(p.price, p.currency);
  return p.pricePeriod === 'monthly' ? `${amount}${t.price.perMonth}` : amount;
}

const dateFormatter = new Intl.DateTimeFormat(UI_LOCALE, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function formatListedDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

const areaFormatter = new Intl.NumberFormat(UI_LOCALE, { maximumFractionDigits: 0 });

/**
 * Floor area in the requested unit. Areas are stored in m²; square feet are
 * converted and rounded to whole numbers. Display and filtering both use this,
 * so the number a viewer sees is the number the area filter compares.
 */
export function areaIn(p: Pick<Property, 'areaSqm'>, unit: AreaUnit): number {
  return unit === 'sqm' ? p.areaSqm : Math.round(p.areaSqm * SQFT_PER_SQM);
}

/** Formats a value that is already in `unit`: "85 m²" or "915 sq ft". */
export function formatArea(value: number, unit: AreaUnit): string {
  return `${areaFormatter.format(value)} ${t.areaUnits[unit]}`;
}

/** A listing's floor area converted to and labelled in `unit`. */
export function formatPropertyArea(p: Pick<Property, 'areaSqm'>, unit: AreaUnit): string {
  return formatArea(areaIn(p, unit), unit);
}
