import { describe, expect, it } from 'vitest';
import { properties } from '../data/properties';
import type { Property } from '../types/property';
import { buildListingSummary } from './summary';

const base = properties.find((p) => p.pricePeriod === 'monthly')!;
/** A rental with every optional fact removed, so only required fields remain. */
const bareRental: Property = {
  id: 'test-001',
  title: base.title,
  description: base.description,
  image: base.image,
  imageAlt: base.imageAlt,
  price: 1_300,
  currency: 'GBP',
  pricePeriod: 'monthly',
  address: base.address,
  neighborhood: 'Hackney',
  city: 'London',
  countryCode: 'GB',
  nation: 'england',
  type: 'apartment',
  bedrooms: 2,
  bathrooms: 1,
  areaSqm: 68,
  status: 'available',
  lat: 0,
  lng: 0,
  listedAt: '2026-10-01',
  updatedAt: '2026-10-01',
  epcRating: 'C',
  hasGarden: false,
  hasParking: false,
};
const summarize = (p: Property) => buildListingSummary(p, 'sqm');
const text = (p: Property) => summarize(p).overview.join(' ');
/** Every detail row as "Label: value", with unknowns as "Label: —". */
const rows = (p: Property) =>
  Object.fromEntries(summarize(p).groups.flatMap((g) => g.rows.map((r) => [r.label, r.value ?? '—'])));

describe('buildListingSummary', () => {
  it('writes a 2–3 sentence overview for every listing', () => {
    for (const p of properties) {
      const { overview, source } = summarize(p);
      expect(source).toBe('template');
      expect(overview.length, p.id).toBeGreaterThanOrEqual(2);
      expect(overview.length, p.id).toBeLessThanOrEqual(3);
      for (const s of overview) {
        expect(s, p.id).toMatch(/^[A-Z].*\.$/);
        expect(s, p.id).not.toMatch(/undefined|null|NaN|\s{2}|, \.|,,|; \./);
      }
    }
  });

  it('only states facts the listing records, and shows unknowns as not stated', () => {
    const summary = text(bareRental);
    expect(summary).toContain('£1,300 a month');
    expect(summary).toContain('68 m²');
    expect(summary).not.toMatch(/pet|student|sharer|HMO|deposit|bill|lift|step-free|short let|office|furnished/i);
    const r = rows(bareRental);
    for (const label of ['Pets', 'Students', 'Sharers', 'Deposit', 'Bills included', 'Short lets', 'Home office', 'Available from']) {
      expect(r[label], label).toBe('—');
    }
    // No access group without any recorded access fact, and no HMO row unless licensed.
    expect(summarize(bareRental).groups.map((g) => g.key)).toEqual(['features', 'rental']);
    expect(r['HMO licence']).toBeUndefined();
  });

  it('states explicit negatives and zero values as facts, not as unknowns', () => {
    const p: Property = { ...bareRental, petsAllowed: false, depositWeeks: 0, includedBills: [], hasLift: false };
    expect(text(p)).toMatch(/pets are not accepted/i);
    expect(text(p)).toMatch(/no deposit is required/i);
    expect(text(p)).toMatch(/bills are not included/i);
    expect(rows(p)).toMatchObject({ Pets: 'Not allowed', Deposit: 'No deposit', 'Bills included': 'None', Lift: 'No', 'Step-free access': '—' });
  });

  it('names each included bill instead of claiming all bills', () => {
    const p: Property = { ...bareRental, includedBills: ['water', 'internet'] };
    expect(text(p)).toMatch(/water and internet are included/i);
    expect(text(p)).not.toMatch(/all bills|electricity|gas/i);
    expect(rows(p)['Bills included']).toBe('Water, Internet');
  });

  it('lists every recorded rental fact', () => {
    const p: Property = {
      ...bareRental,
      furnishing: 'furnished',
      availableFrom: '2026-11-01',
      petsAllowed: true,
      studentFriendly: true,
      sharersAccepted: true,
      hmoLicensed: true,
      shortLetsAccepted: true,
      depositWeeks: 5,
      homeOffice: true,
      stepFreeAccess: true,
      hasLift: true,
      accessibleBathroom: false,
    };
    expect(rows(p)).toMatchObject({
      Pets: 'Allowed',
      Students: 'Welcome',
      Sharers: 'Welcome',
      'HMO licence': 'Licensed',
      'Short lets': 'Considered',
      Deposit: '5 weeks (£1,500)',
      'Home office': 'Yes',
      'Accessible bathroom': 'No',
      'Available from': 'Nov 1, 2026',
    });
  });

  it('describes ownership, lease costs and new-build timing on sales', () => {
    const sale: Property = {
      ...bareRental,
      pricePeriod: 'total',
      price: 450_000,
      tenure: 'leasehold',
      leaseYearsRemaining: 125,
      serviceChargePerYear: 1_850,
      groundRentPerYear: 0,
      newBuild: true,
      offPlan: true,
      completionDate: '2027-03-31',
      outdoorSpace: ['balcony'],
      parking: [],
    };
    expect(text(sale)).toContain('£450,000');
    expect(text(sale)).toContain('125 years left on the lease');
    expect(text(sale)).toContain('March 2027');
    expect(rows(sale)).toMatchObject({
      Tenure: 'Leasehold',
      'Lease remaining': '125 years',
      'Service charge': '£1,850 a year',
      'Ground rent': 'None',
      Chain: '—',
      'New build': 'Off-plan',
      'Expected completion': 'March 2027',
      'Outdoor space': 'Balcony',
      Parking: 'None',
    });
  });

  it('never shows lease rows for Scottish homes', () => {
    const scottish = properties.find((p) => p.nation === 'scotland' && p.pricePeriod === 'total')!;
    const r = rows(scottish);
    expect(r.Tenure).toBe('Owned outright (Scotland)');
    expect(r['Lease remaining'] ?? r['Ground rent'] ?? r['Service charge']).toBeUndefined();
    expect(text(scottish)).toContain('owned outright');
  });

  it('follows the chosen area unit', () => {
    expect(buildListingSummary(bareRental, 'sqft').overview.join(' ')).toContain('sq ft');
  });
});
