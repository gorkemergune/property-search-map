import { useRef, type ReactNode } from 'react';
import { MARKETS } from '../data/markets';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { t } from '../i18n/en';
import { formatAmount, formatListedDate, formatPropertyArea } from '../lib/format';
import { buildListingSummary } from '../lib/summary';
import type { AreaUnit, Property } from '../types/property';
import { CloseIcon, MapIcon } from './icons';
import { PropertyImage } from './PropertyImage';

interface Props {
  property: Property;
  areaUnit: AreaUnit;
  onClose: () => void;
  onShowOnMap: (id: string) => void;
}

/**
 * Listing details in a right-hand drawer (full screen on phones).
 * Focus moves into the drawer, Tab stays inside it, Escape closes it and focus
 * returns to the element that opened it.
 */
export function ListingDetail({ property: p, areaUnit, onClose, onShowOnMap }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Back to the listing's card if the opener was not focused (Safari mouse clicks).
  useDialogFocus(panel, closeButton, onClose, () => document.querySelector<HTMLElement>(`#card-${p.id} > button`));

  const otherUnit: AreaUnit = areaUnit === 'sqm' ? 'sqft' : 'sqm';
  const market = MARKETS[p.countryCode];
  const titleId = `detail-title-${p.id}`;
  const aboutId = `detail-about-${p.id}`;
  const summary = buildListingSummary(p, areaUnit);

  return (
    <div className="fixed inset-0 z-1250 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" tabIndex={-1} aria-hidden="true" className="hidden flex-1 bg-ink/30 sm:block" onClick={onClose} />
      <div
        ref={panel}
        className="scroll-quiet flex h-full w-full flex-col overflow-y-auto bg-white shadow-[-12px_0_40px_-12px_rgb(29_28_26/0.3)] sm:max-w-160"
      >
        <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-line bg-white/95 px-5 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={() => onShowOnMap(p.id)}
            className="flex items-center gap-2 text-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <MapIcon width={15} height={15} />
            {t.detail.showOnMap}
          </button>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label={t.detail.close}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 pb-10 pt-6 sm:px-8">
          <div className="relative aspect-16/10 overflow-hidden rounded-2xl bg-canvas">
            <PropertyImage property={p} />
            {p.status !== 'available' && (
              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-ink shadow-sm">
                {t.statuses[p.status]}
              </span>
            )}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-xs font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'available' ? 'bg-accent' : 'bg-faint'}`} aria-hidden="true" />
            <span className={p.status === 'available' ? 'text-accent' : 'text-muted'}>{t.listingTag[p.pricePeriod]}</span>
            <span className="text-faint">·</span>
            <span className="text-muted">{t.propertyTypes[p.type]}</span>
          </p>
          <h2 id={titleId} className="mt-2 font-serif text-[32px] leading-[1.1] tracking-[-0.01em] text-ink">
            {p.title}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {p.address} · {p.neighborhood}, {p.city}, {t.countries[p.countryCode]}
          </p>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-y border-line py-5 tabular">
            <span className="text-[30px] font-semibold tracking-[-0.02em] text-ink">{formatAmount(p.price, p.currency)}</span>
            {p.pricePeriod === 'monthly' && <span className="text-base text-muted">{t.price.perMonthSlash}</span>}
            <span className="ml-auto text-xs text-muted">
              {t.detail.priceNote[p.pricePeriod]} · {p.currency}
            </span>
          </div>

          <h3 className="mt-8 text-[13px] font-semibold text-ink">{t.detail.facts}</h3>
          <dl className="mt-3 grid grid-cols-2 border-t border-line sm:grid-cols-3">
            <Fact label={t.detail.bedrooms}>{p.bedrooms === 0 ? t.bedrooms.studio : p.bedrooms}</Fact>
            <Fact label={t.detail.bathrooms}>{p.bathrooms}</Fact>
            <Fact label={t.detail.area}>
              {formatPropertyArea(p, areaUnit)}
              <span className="block text-xs font-normal text-muted">{formatPropertyArea(p, otherUnit)}</span>
            </Fact>
            <Fact label={t.detail.type}>{t.propertyTypes[p.type]}</Fact>
            <Fact label={t.detail.epc}>{p.epcRating}</Fact>
            <Fact label={t.detail.status}>{t.statuses[p.status]}</Fact>
            {p.furnishing && <Fact label={t.detail.furnishing}>{t.furnishing[p.furnishing]}</Fact>}
            <Fact label={t.detail.listed}>{formatListedDate(p.listedAt)}</Fact>
            <Fact label={t.detail.updated}>{formatListedDate(p.updatedAt)}</Fact>
            <Fact label={t.detail.market}>
              {market.name} · {market.currency}
            </Fact>
          </dl>

          <section aria-labelledby={aboutId} className="mt-8">
            <h3 id={aboutId} className="text-[13px] font-semibold text-ink">
              {t.detail.about}
            </h3>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.06em] text-muted">{t.summary.heading}</p>
            <div className="mt-1.5 max-w-prose space-y-2 text-[15px] leading-relaxed text-ink-soft">
              {summary.overview.map((s) => (
                <p key={s}>{s}</p>
              ))}
            </div>

            <h4 className="mt-6 text-xs font-medium uppercase tracking-[0.06em] text-muted">{t.details.heading}</h4>
            <div className="mt-2 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {summary.groups.map((group) => (
                <div key={group.key} role="group" aria-labelledby={`${aboutId}-${group.key}`}>
                  <p id={`${aboutId}-${group.key}`} className="text-[13px] font-semibold text-ink">
                    {group.title}
                  </p>
                  <dl className="mt-1.5 divide-y divide-line border-y border-line">
                    {group.rows.map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                        <dt className="text-muted">{row.label}</dt>
                        <dd className={`text-right tabular ${row.value === null ? 'text-faint' : 'font-medium text-ink'}`}>
                          {row.value ?? t.details.notStated}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-prose text-xs text-muted">{t.summary.note}</p>
          </section>

          <h3 className="mt-8 text-[13px] font-semibold text-ink">{t.detail.location}</h3>
          <p className="mt-2 text-[15px] text-ink-soft">
            {p.neighborhood}, {p.city}, {t.countries[p.countryCode]}
          </p>
          <p className="mt-1 text-xs text-muted">{t.detail.approximateLocation}</p>

          <p className="mt-10 border-t border-line pt-4 text-xs text-faint">
            {t.detail.demoNote} {t.detail.listingId}: {p.id}
          </p>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-3.5 pr-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-medium text-ink tabular">{children}</dd>
    </div>
  );
}
