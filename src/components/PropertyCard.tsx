import { t } from '../i18n/en';
import { formatAmount, formatListedDate, formatPropertyArea } from '../lib/format';
import type { AreaUnit, Property } from '../types/property';
import { BedIcon } from './icons';
import { PropertyImage } from './PropertyImage';

interface Props {
  property: Property;
  selected: boolean;
  hovered: boolean;
  areaUnit: AreaUnit;
  /** Card activation (click, Enter, Space): selects the listing; on an already-selected card, opens details. */
  onActivate: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onHover: (id: string | null) => void;
  /** `horizontal` is the compact preview shown over the map; activating it opens details. */
  layout?: 'vertical' | 'horizontal';
}

/** Status shown on the photo; available listings need no badge. */
const STATUS_BADGE: Record<Property['status'], string> = {
  available: '',
  under_offer: 'bg-white/95 text-ink',
  sold: 'bg-ink/90 text-white',
  let: 'bg-ink/90 text-white',
};

export function PropertyCard({
  property: p,
  selected,
  hovered,
  areaUnit,
  onActivate,
  onOpenDetails,
  onHover,
  layout = 'vertical',
}: Props) {
  const horizontal = layout === 'horizontal';
  const active = p.status === 'available';

  const label = (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-accent' : 'bg-faint'}`} aria-hidden="true" />
      <span className={active ? 'text-accent' : 'text-muted'}>{t.listingTag[p.pricePeriod]}</span>
      <span className="text-faint">·</span>
      <span className="text-muted">{t.propertyTypes[p.type]}</span>
      {!active && horizontal && <span className="text-muted">· {t.statuses[p.status]}</span>}
    </span>
  );

  const price = (
    <span className="flex items-baseline gap-1 tabular">
      <span className={`font-semibold tracking-[-0.015em] text-ink ${horizontal ? 'text-lg' : 'text-[21px]'}`}>
        {formatAmount(p.price, p.currency)}
      </span>
      {p.pricePeriod === 'monthly' && <span className="text-[13px] text-muted">{t.price.perMonthSlash}</span>}
    </span>
  );

  const specs = (
    <span className={`flex items-center whitespace-nowrap text-[13px] text-ink-soft tabular ${horizontal ? 'gap-2' : 'gap-3'}`}>
      <span className="flex items-center gap-1.5">
        {!horizontal && <BedIcon width={15} height={15} className="text-muted" />}
        {t.bedrooms.count(p.bedrooms)}
      </span>
      <Divider />
      <span>{t.bathrooms.count(p.bathrooms)}</span>
      <Divider />
      <span>{formatPropertyArea(p, areaUnit)}</span>
    </span>
  );

  if (horizontal) {
    return (
      <button
        type="button"
        onClick={() => onOpenDetails(p.id)}
        className="group flex w-full gap-4 rounded-2xl bg-white p-2.5 pr-10 text-left shadow-[0_16px_40px_-12px_rgb(29_28_26/0.35),0_0_0_1px_rgb(29_28_26/0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span className="relative block aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-xl bg-canvas sm:w-36">
          <PropertyImage property={p} />
        </span>
        <span className="flex min-w-0 flex-col justify-center gap-1">
          {label}
          {price}
          {specs}
          <span className="truncate text-[13px] text-muted">
            {p.neighborhood}, {p.city}
          </span>
          <span className="text-xs font-medium text-ink underline decoration-line-strong underline-offset-4 group-hover:decoration-ink">
            {t.card.details}
          </span>
        </span>
      </button>
    );
  }

  return (
    <article
      id={`card-${p.id}`}
      className="relative scroll-mt-6"
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* The whole card is one button; "View details" is a sibling placed over it. */}
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onActivate(p.id)}
        onFocus={() => onHover(p.id)}
        onBlur={() => onHover(null)}
        className="group block w-full cursor-pointer rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-ink"
      >
        <span
          className={`relative block aspect-[4/3] overflow-hidden rounded-2xl bg-canvas transition ${
            selected ? 'ring-2 ring-accent ring-offset-[3px]' : hovered ? 'ring-1 ring-ink/20 ring-offset-[3px]' : ''
          }`}
        >
          <PropertyImage property={p} className="transition duration-500 ease-out group-hover:scale-[1.03]" />
          {!active && (
            <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm ${STATUS_BADGE[p.status]}`}>
              {t.statuses[p.status]}
            </span>
          )}
          {selected && (
            <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
              {t.map.onMap}
            </span>
          )}
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white">
            {p.countryCode}
          </span>
        </span>

        <span className="block px-0.5 pt-3.5">
          {label}
          <span className="mt-1 block">{price}</span>
          <span className="mt-2 block">{specs}</span>
          <span className="mt-2.5 block truncate text-[13px] text-ink-soft">
            {p.neighborhood}, {p.city}
          </span>
          <span className="block truncate text-[13px] text-muted">{p.address}</span>
          <span className="mt-2 block pr-24 text-[11.5px] italic text-faint">
            {t.card.listed(formatListedDate(p.listedAt))}
            {p.updatedAt !== p.listedAt && ` · ${t.card.updated(formatListedDate(p.updatedAt))}`}
          </span>
        </span>
        {selected && <span className="sr-only">{t.card.pressAgain}</span>}
      </button>

      <button
        type="button"
        onClick={() => onOpenDetails(p.id)}
        aria-label={`${t.card.details}: ${p.title}`}
        className="absolute bottom-0 right-0.5 text-xs font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {t.card.details}
      </button>
    </article>
  );
}

function Divider() {
  return <span className="h-3 w-px bg-line-strong" aria-hidden="true" />;
}
