import { describe, expect, it } from 'vitest';
import { areaIn, formatArea, formatCompactAmount, formatListedDate, formatMarkerPrice, formatPrice, formatPropertyArea } from './format';

describe('price formatting', () => {
  it('shows sale prices as totals in the listing currency', () => {
    expect(formatPrice({ price: 1_650_000, currency: 'USD', pricePeriod: 'total' })).toBe('$1,650,000');
    expect(formatPrice({ price: 11_750_000, currency: 'TRY', pricePeriod: 'total' })).toBe('₺11,750,000');
    expect(formatPrice({ price: 895_000, currency: 'GBP', pricePeriod: 'total' })).toBe('£895,000');
  });

  it('marks rentals as monthly', () => {
    expect(formatPrice({ price: 2_375, currency: 'GBP', pricePeriod: 'monthly' })).toBe('£2,375/mo');
  });

  it('uses compact amounts for markers', () => {
    expect(formatMarkerPrice({ price: 1_650_000, currency: 'USD', pricePeriod: 'total' })).toBe('$1.7M');
    expect(formatMarkerPrice({ price: 42_000, currency: 'TRY', pricePeriod: 'monthly' })).toBe('₺42K/mo');
    expect(formatMarkerPrice({ price: 615_000, currency: 'USD', pricePeriod: 'total' })).toBe('$615K');
    expect(formatCompactAmount(3_350, 'USD')).toBe('$3,350');
  });

  it('formats listing dates independent of time zone', () => {
    expect(formatListedDate('2026-10-02')).toBe('Oct 2, 2026');
  });
});

describe('area conversion (regression)', () => {
  it('converts the number, not just the label, when switching units', () => {
    const p = { areaSqm: 94 };
    expect(areaIn(p, 'sqm')).toBe(94);
    expect(areaIn(p, 'sqft')).toBe(1012);
    expect(formatPropertyArea(p, 'sqm')).toBe('94 m²');
    expect(formatPropertyArea(p, 'sqft')).toBe('1,012 sq ft');
  });

  it('formats a value already in the unit without converting it again', () => {
    expect(formatArea(500, 'sqft')).toBe('500 sq ft');
    expect(formatArea(50, 'sqm')).toBe('50 m²');
  });

  it('shows what the area filter compares', () => {
    const p = { areaSqm: 46 }; // 495.1 sq ft → 495
    expect(areaIn(p, 'sqft')).toBe(495);
    expect(formatPropertyArea(p, 'sqft')).toBe('495 sq ft');
  });
});
