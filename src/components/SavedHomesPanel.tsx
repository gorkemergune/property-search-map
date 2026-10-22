import { useId, useRef, useState, type ReactNode } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { t } from '../i18n/en';
import { formatAmount, formatListedDate, formatPrice, formatPropertyArea } from '../lib/format';
import type { SavedHome } from '../lib/storage';
import { depositAmount } from '../lib/summary';
import type { AreaUnit, Property } from '../types/property';
import { CloseIcon, StarIcon } from './icons';
import { PropertyImage } from './PropertyImage';

interface Props {
  homes: SavedHome[];
  /** Every listing, so saved homes outside the current results still show. */
  lookup: ReadonlyMap<string, Property>;
  /** Ids in the current result set. */
  inResults: ReadonlySet<string>;
  areaUnit: AreaUnit;
  onRemove: (id: string) => void;
  onClear: () => void;
  onNote: (id: string, note: string) => void;
  onRating: (id: string, rating: number | null) => void;
  onOpenDetails: (id: string) => void;
  onClose: () => void;
}

type Cell = string | null | undefined;
interface Row {
  label: string;
  /** `undefined` = does not apply to this listing (e.g. deposit on a sale); `null` = not stated. */
  value: (p: Property) => Cell;
  /** Only shown when at least one saved home is in this context. */
  period?: Property['pricePeriod'];
}

const s = t.saved;
const d = t.details;
const tri = (v: boolean | undefined, labels: { yes: string; no: string }) => (v === undefined ? null : v ? labels.yes : labels.no);

/** Comparison rows. Unknown facts read "Not stated"; facts that do not apply read "—". */
function rowsFor(areaUnit: AreaUnit): Row[] {
  return [
    { label: s.compare.price, value: (p) => formatPrice(p) },
    { label: s.compare.listing, value: (p) => `${t.listingTag[p.pricePeriod]} · ${t.propertyTypes[p.type]}` },
    { label: t.detail.bedrooms, value: (p) => (p.bedrooms === 0 ? t.bedrooms.studio : String(p.bedrooms)) },
    { label: t.detail.bathrooms, value: (p) => String(p.bathrooms) },
    { label: t.detail.area, value: (p) => formatPropertyArea(p, areaUnit) },
    { label: t.detail.epc, value: (p) => p.epcRating },
    { label: s.compare.location, value: (p) => `${p.neighborhood}, ${p.city}` },
    { label: t.detail.status, value: (p) => t.statuses[p.status] },
    // Rentals
    { period: 'monthly', label: d.availableFrom, value: (p) => (p.pricePeriod !== 'monthly' ? undefined : p.availableFrom ? formatListedDate(p.availableFrom) : null) },
    {
      period: 'monthly',
      label: d.deposit,
      value: (p) =>
        p.pricePeriod !== 'monthly'
          ? undefined
          : p.depositWeeks === undefined
            ? null
            : p.depositWeeks === 0
              ? d.noDeposit
              : d.depositValue(p.depositWeeks, formatAmount(depositAmount(p, p.depositWeeks), p.currency)),
    },
    {
      period: 'monthly',
      label: d.bills,
      value: (p) =>
        p.pricePeriod !== 'monthly' ? undefined : p.includedBills === undefined ? null : p.includedBills.map((b) => t.bills[b]).join(', ') || d.none,
    },
    { period: 'monthly', label: t.detail.furnishing, value: (p) => (p.pricePeriod !== 'monthly' ? undefined : p.furnishing ? t.furnishing[p.furnishing] : null) },
    { period: 'monthly', label: d.pets, value: (p) => (p.pricePeriod !== 'monthly' ? undefined : tri(p.petsAllowed, d.petsValue)) },
    // Sales
    { period: 'total', label: d.tenure, value: (p) => (p.pricePeriod !== 'total' ? undefined : p.tenure ? t.tenures[p.tenure] : null) },
    {
      period: 'total',
      label: d.lease,
      value: (p) =>
        p.pricePeriod !== 'total' || p.tenure === 'freehold' || p.tenure === 'outright'
          ? undefined
          : p.leaseYearsRemaining === undefined
            ? null
            : d.leaseValue(p.leaseYearsRemaining),
    },
    {
      period: 'total',
      label: d.serviceCharge,
      value: (p) =>
        p.pricePeriod !== 'total' || p.tenure === 'freehold' || p.tenure === 'outright'
          ? undefined
          : p.serviceChargePerYear === undefined
            ? null
            : d.perYear(formatAmount(p.serviceChargePerYear, p.currency)),
    },
    { period: 'total', label: d.chain, value: (p) => (p.pricePeriod !== 'total' ? undefined : tri(p.chainFree, d.chainValue)) },
  ];
}

/** Saved homes side by side, with private notes and ratings. A dialog like the filter drawer. */
export function SavedHomesPanel({ homes, lookup, inResults, areaUnit, onRemove, onClear, onNote, onRating, onOpenDetails, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useDialogFocus(panel, closeButton, onClose, () => document.querySelector<HTMLElement>('[data-saved-trigger]'));
  const [confirmClear, setConfirmClear] = useState(false);
  const titleId = useId();

  // A saved id whose listing no longer exists is shown as unavailable and can be removed.
  const entries = homes.map((h) => ({ home: h, property: lookup.get(h.id) ?? null }));
  const listed = entries.filter((e): e is { home: SavedHome; property: Property } => e.property !== null);
  const missing = entries.filter((e) => e.property === null);
  const periods = new Set(listed.map((e) => e.property.pricePeriod));
  const rows = rowsFor(areaUnit).filter((r) => !r.period || periods.has(r.period));

  return (
    <div className="fixed inset-0 z-1250 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" tabIndex={-1} aria-hidden="true" className="hidden flex-1 bg-ink/30 sm:block" onClick={onClose} />
      <div ref={panel} className="flex h-full w-full flex-col bg-white shadow-[-12px_0_40px_-12px_rgb(29_28_26/0.3)] sm:max-w-240">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5 sm:px-8">
          <h2 id={titleId} className="font-serif text-2xl text-ink">
            {s.title} <span className="font-sans text-base text-muted tabular">({homes.length})</span>
          </h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label={s.close}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="scroll-quiet flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <p className="max-w-prose text-xs leading-relaxed text-muted">{s.privacy}</p>

          {homes.length === 0 ? (
            <div className="py-14">
              <p className="font-serif text-[26px] leading-tight text-ink">{s.emptyTitle}</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{s.emptyBody}</p>
            </div>
          ) : (
            <>
              {listed.length > 0 && (
                // Scrolls sideways on phones; the first column stays put.
                <div className="scroll-quiet -mx-5 mt-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="region" aria-label={s.compareLabel} tabIndex={0}>
                  <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                    <caption className="sr-only">{s.compareLabel}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="sticky left-0 z-10 w-32 bg-white pr-3 text-left align-bottom text-xs font-normal text-muted">
                          <span className="sr-only">{s.compare.field}</span>
                        </th>
                        {listed.map(({ property: p }) => (
                          <th key={p.id} scope="col" className="w-56 px-3 pb-3 text-left align-top font-normal">
                            <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-canvas">
                              <PropertyImage property={p} />
                            </div>
                            <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-ink">{p.title}</p>
                            {!inResults.has(p.id) && <p className="mt-1 text-[11.5px] text-accent">{s.outsideResults}</p>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.label}>
                          <th scope="row" className="sticky left-0 z-10 border-t border-line bg-white py-2 pr-3 text-left text-xs font-normal text-muted">
                            {row.label}
                          </th>
                          {listed.map(({ property: p }) => {
                            const v = row.value(p);
                            return (
                              <td key={p.id} className={`border-t border-line px-3 py-2 tabular ${v ? 'text-ink' : 'text-faint'}`}>
                                {v === undefined ? <NotApplicable /> : (v ?? d.notStated)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr>
                        <th scope="row" className="sticky left-0 z-10 border-t border-line bg-white py-2 pr-3 text-left align-top text-xs font-normal text-muted">
                          {s.rating}
                        </th>
                        {listed.map(({ home, property: p }) => (
                          <td key={p.id} className="border-t border-line px-3 py-2 align-top">
                            <Rating title={p.title} value={home.rating} onChange={(r) => onRating(p.id, r)} />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th scope="row" className="sticky left-0 z-10 border-t border-line bg-white py-2 pr-3 text-left align-top text-xs font-normal text-muted">
                          {s.note}
                        </th>
                        {listed.map(({ home, property: p }) => (
                          <td key={p.id} className="border-t border-line px-3 py-2 align-top">
                            <textarea
                              aria-label={s.noteFor(p.title)}
                              value={home.note}
                              onChange={(e) => onNote(p.id, e.target.value)}
                              rows={3}
                              placeholder={s.notePlaceholder}
                              className="w-full resize-y rounded-lg border border-line-strong p-2 text-[13px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                            />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="sticky left-0 z-10 bg-white" />
                        {listed.map(({ property: p }) => (
                          <td key={p.id} className="px-3 pt-2">
                            <div className="flex items-center gap-4 text-xs font-medium">
                              <button type="button" onClick={() => onOpenDetails(p.id)} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                {t.card.details}
                              </button>
                              <button type="button" onClick={() => onRemove(p.id)} aria-label={s.removeHome(p.title)} className="text-accent hover:underline">
                                {s.remove}
                              </button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {missing.length > 0 && (
                <ul className="mt-6 space-y-2 text-sm text-muted">
                  {missing.map(({ home }) => (
                    <li key={home.id} className="flex items-center gap-3">
                      {s.unavailable}
                      <button type="button" onClick={() => onRemove(home.id)} className="text-xs font-medium text-accent hover:underline">
                        {s.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {homes.length > 0 && (
          <div className="flex shrink-0 items-center gap-3 border-t border-line px-5 py-4 sm:px-8">
            {confirmClear ? (
              <>
                <span className="text-sm text-ink">{s.confirmClear}</span>
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setConfirmClear(false);
                  }}
                  className="h-9 rounded-full bg-accent px-4 text-sm font-medium text-white"
                >
                  {s.confirmYes}
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className="text-sm font-medium text-ink hover:underline">
                  {s.confirmNo}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} className="text-sm font-medium text-accent hover:underline">
                {s.clearAll}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotApplicable(): ReactNode {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{s.notApplicable}</span>
    </>
  );
}

/** 1–5 stars as a radio group; choosing the current rating again clears it. */
function Rating({ title, value, onChange }: { title: string; value: number | null; onChange: (rating: number | null) => void }) {
  return (
    <div role="radiogroup" aria-label={s.ratingFor(title)} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={s.stars(n)}
            onClick={() => onChange(value === n ? null : n)}
            className={`grid h-7 w-7 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-accent ${on ? 'text-accent' : 'text-line-strong hover:text-muted'}`}
          >
            <StarIcon width={17} height={17} fill={on ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}
