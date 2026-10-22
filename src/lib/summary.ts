import { UI_LOCALE, t } from '../i18n/en';
import { formatAmount, formatListedDate, formatPropertyArea } from './format';
import { LEASE_TENURES, type AreaUnit, type Property } from '../types/property';

/**
 * A plain-language overview of a listing plus every recorded fact, grouped.
 *
 * Today it is built from templates in this file, using only fields recorded on
 * the listing: a fact that is `undefined` is never guessed. The shape is
 * deliberately source-agnostic so a server-side summary (for example an LLM
 * call made by a backend that holds the API key) could fill `overview` later;
 * the browser should never call a model provider directly.
 */
export interface ListingSummary {
  source: 'template';
  /** 2–3 complete sentences. */
  overview: string[];
  /** Labelled facts, grouped. Empty groups are left out. */
  groups: DetailGroup[];
}

export interface DetailGroup {
  key: keyof typeof t.details.groups;
  title: string;
  rows: DetailRow[];
}

export interface DetailRow {
  label: string;
  /** `null` = the listing does not state it; shown as "Not stated", never as "No". */
  value: string | null;
}

/** Stable small number per listing, used only to vary sentence shapes between listings. */
function variant(id: string, count: number): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % count;
}

const sentence = (clauses: string[]) => {
  const text = t.summary.list(clauses.filter(Boolean));
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : '';
};

const monthFormatter = new Intl.DateTimeFormat(UI_LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthYear = (iso: string) => monthFormatter.format(new Date(`${iso}T00:00:00Z`));

/** Deposit in pounds from weekly rent (monthly × 12 / 52), as UK agents quote it. */
export function depositAmount(p: Pick<Property, 'price'>, weeks: number): number {
  return Math.round(((p.price * 12) / 52) * weeks);
}

/** `true`/`false`/`undefined` → label / label / Not stated. */
function tri(value: boolean | undefined, labels: { yes: string; no: string }): string | null {
  return value === undefined ? null : value ? labels.yes : labels.no;
}

// ---------------------------------------------------------------------------
// Overview sentences
// ---------------------------------------------------------------------------

function lead(p: Property, areaUnit: AreaUnit): string {
  const s = t.summary;
  const homeNoun = s.home(p.bedrooms, t.propertyTypes[p.type].toLowerCase());
  const place = `${p.neighborhood}, ${p.city}`;
  const price = formatAmount(p.price, p.currency);
  const v = variant(p.id, 2);
  const subject = v === 0 ? `${s.article(homeNoun)} ${homeNoun}` : homeNoun;
  const opening = p.pricePeriod === 'total' ? s.leadSale[v](subject, place, price) : s.leadRent[v](subject, place, price);
  const size = s.size(t.bathrooms.long(p.bathrooms), formatPropertyArea(p, areaUnit));
  const status = p.status === 'available' ? '' : `; ${s.statusNote[p.status]}`;
  return sentence([`${opening}, ${v === 0 ? 'with' : 'offering'} ${size}${status}`]);
}

function rentalOverview(p: Property): string[] {
  const s = t.summary;
  const terms: string[] = [];
  if (p.furnishing) terms.push(s.furnished(t.furnishing[p.furnishing]));
  if (p.availableFrom) terms.push(s.availableFrom(formatListedDate(p.availableFrom)));
  const money: string[] = [];
  if (p.depositWeeks === 0) money.push(s.noDeposit);
  else if (p.depositWeeks !== undefined) money.push(s.deposit(p.depositWeeks, formatAmount(depositAmount(p, p.depositWeeks), p.currency)));
  if (p.includedBills?.length === 0) money.push(s.noBills);
  else if (p.includedBills) {
    const names = p.includedBills.map((b) => t.bills[b].toLowerCase());
    money.push(s.bills(s.list(names), names.length));
  }

  const welcome: string[] = [];
  if (p.petsAllowed === true) welcome.push(s.welcomeNoun.pets);
  if (p.studentFriendly) welcome.push(s.welcomeNoun.students);
  if (p.sharersAccepted) welcome.push(s.welcomeNoun.sharers);
  const fit: string[] = welcome.length ? [s.welcome(s.list(welcome))] : [];
  if (p.hmoLicensed) fit.push(s.hmoYes);
  if (p.petsAllowed === false) fit.push(s.petsNo);

  const termsSentence = [s.list(terms), money.join(', and ')].filter(Boolean).join('; ');
  return [sentence([termsSentence]), sentence(fit.slice(0, 3))].filter(Boolean);
}

function saleOverview(p: Property): string[] {
  const s = t.summary;
  const clauses: string[] = [];
  if (p.tenure === 'freehold') clauses.push(s.freehold);
  else if (p.tenure === 'outright') clauses.push(s.outright);
  else if (p.tenure) {
    const base = p.tenure === 'leasehold' ? s.leasehold : s.shareOfFreehold;
    clauses.push(p.leaseYearsRemaining !== undefined ? s.withDetails(base, s.leaseYears(p.leaseYearsRemaining)) : base);
  }
  if (p.newBuild) {
    if (p.offPlan === true && p.completionDate) clauses.push(s.itIs(s.offPlan(monthYear(p.completionDate))));
    else if (p.offPlan === false && p.completionDate) clauses.push(s.itIs(s.completed(monthYear(p.completionDate))));
    else clauses.push(s.newBuild);
  }
  if (p.chainFree === true) clauses.push(s.chainFree);
  return [sentence([clauses.join('; ')])].filter(Boolean);
}

function featuresSentence(p: Property): string {
  const f = t.summary.feature;
  const items: string[] = [];
  if (p.outdoorSpace) items.push(...p.outdoorSpace.map((x) => f[x]));
  else if (p.hasGarden) items.push(f.garden);
  if (p.parking) items.push(...p.parking.map((x) => f[x]));
  else if (p.hasParking) items.push(f.parking);
  if (p.homeOffice) items.push(f.homeOffice);
  if (p.hasLift) items.push(f.lift);
  if (p.stepFreeAccess) items.push(f.stepFree);
  const shape = t.summary.features[variant(`${p.id}-f`, 2)];
  return `${shape(p.epcRating, t.summary.list(items.slice(0, 4)))}.`;
}

// ---------------------------------------------------------------------------
// Detail rows
// ---------------------------------------------------------------------------

function detailGroups(p: Property): DetailGroup[] {
  const d = t.details;
  const gbp = (n: number) => formatAmount(n, p.currency);
  const rent = p.pricePeriod === 'monthly';

  // Garden and parking flags are always recorded; the type lists refine them on sale listings.
  const outdoor = p.outdoorSpace
    ? p.outdoorSpace.length ? p.outdoorSpace.map((x) => t.outdoorSpaces[x]).join(', ') : d.none
    : p.hasGarden ? d.yes : d.no;
  const parking = p.parking
    ? p.parking.length ? p.parking.map((x) => t.parkingTypes[x]).join(', ') : d.none
    : p.hasParking ? d.yes : d.no;
  const features: DetailRow[] = [
    { label: d.outdoor, value: outdoor },
    { label: d.parking, value: parking },
  ];
  if (rent) features.push({ label: d.homeOffice, value: tri(p.homeOffice, d) });

  // Beds, baths, area, type, furnishing and EPC are in the drawer's "Key facts" grid, so they are not repeated here.
  const groups: DetailGroup[] = [{ key: 'features', title: d.groups.features, rows: features }];

  if (rent) {
    const deposit =
      p.depositWeeks === undefined ? null : p.depositWeeks === 0 ? d.noDeposit : d.depositValue(p.depositWeeks, gbp(depositAmount(p, p.depositWeeks)));
    const bills = p.includedBills === undefined ? null : p.includedBills.length ? p.includedBills.map((b) => t.bills[b]).join(', ') : d.none;
    const rows: DetailRow[] = [
      { label: d.availableFrom, value: p.availableFrom ? formatListedDate(p.availableFrom) : null },
      { label: d.deposit, value: deposit },
      { label: d.bills, value: bills },
      { label: d.pets, value: tri(p.petsAllowed, d.petsValue) },
      { label: d.students, value: tri(p.studentFriendly, d.welcomeValue) },
      { label: d.sharers, value: tri(p.sharersAccepted, d.welcomeValue) },
      { label: d.shortLets, value: tri(p.shortLetsAccepted, d.shortLetsValue) },
    ];
    // An HMO licence is only shown when the listing says it has one.
    if (p.hmoLicensed) rows.push({ label: d.hmo, value: d.hmoValue });
    groups.push({ key: 'rental', title: d.groups.rental, rows });

    const access: DetailRow[] = [
      { label: d.stepFree, value: tri(p.stepFreeAccess, d) },
      { label: d.lift, value: tri(p.hasLift, d) },
      { label: d.accessibleBathroom, value: tri(p.accessibleBathroom, d) },
    ];
    // Only when at least one access fact is recorded.
    if (access.some((r) => r.value !== null)) groups.push({ key: 'access', title: d.groups.access, rows: access });
  } else {
    const rows: DetailRow[] = [{ label: d.tenure, value: p.tenure ? t.tenures[p.tenure] : null }];
    if (p.tenure && LEASE_TENURES.includes(p.tenure)) {
      rows.push(
        { label: d.lease, value: p.leaseYearsRemaining === undefined ? null : d.leaseValue(p.leaseYearsRemaining) },
        { label: d.serviceCharge, value: p.serviceChargePerYear === undefined ? null : d.perYear(gbp(p.serviceChargePerYear)) },
        {
          label: d.groundRent,
          value: p.groundRentPerYear === undefined ? null : p.groundRentPerYear === 0 ? d.none : d.perYear(gbp(p.groundRentPerYear)),
        },
      );
    }
    rows.push({ label: d.chain, value: tri(p.chainFree, d.chainValue) });
    if (p.newBuild) {
      const status = p.offPlan === undefined ? d.newBuildValue.unknown : p.offPlan ? d.newBuildValue.offPlan : d.newBuildValue.complete;
      rows.push({ label: d.newBuild, value: status });
      if (p.completionDate && p.offPlan !== undefined) {
        rows.push({ label: p.offPlan ? d.completion.offPlan : d.completion.complete, value: monthYear(p.completionDate) });
      }
    }
    groups.push({ key: 'ownership', title: d.groups.ownership, rows });
  }
  return groups;
}

export function buildListingSummary(p: Property, areaUnit: AreaUnit): ListingSummary {
  const terms = p.pricePeriod === 'monthly' ? rentalOverview(p) : saleOverview(p);
  // Lead + terms, then features (EPC is always recorded) when there is room for a third sentence.
  const overview = [lead(p, areaUnit), ...terms];
  if (overview.length < 3) overview.push(featuresSentence(p));
  return { source: 'template', overview, groups: detailGroups(p) };
}
