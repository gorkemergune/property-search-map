import { formatAmount, formatListedDate, formatPropertyArea } from '../lib/format';
import { getInsights, type Tag } from '../lib/insights';
import type { AreaUnit, Property } from '../types/property';
import { PropertyImage } from './PropertyImage';
import { Symbol } from './ui/Symbol';

interface Props {
  property: Property;
  areaUnit: AreaUnit;
  onOpen: (id: string) => void;
  saved: boolean;
  onToggleSave: (id: string) => void;
  /** "Why it matched" / "Why we picked it" note. Omitted → listing summary. */
  why?: string;
  whyTitle?: string;
  /** Tag keys / labels to put first and highlight (what the visitor asked for). */
  highlight?: readonly string[];
  /** Small badge over the photo, e.g. "Best match". */
  badge?: { label: string; icon: string } | null;
  viewed?: boolean;
  selected?: boolean;
  onHover?: (id: string | null) => void;
  /** Narrow card for horizontal carousels. */
  compact?: boolean;
}

const TONE: Record<Tag['tone'], string> = {
  proximity: 'bg-secondary-fixed/45 text-on-secondary-fixed',
  feature: 'bg-primary-fixed/60 text-on-primary-fixed-variant',
  area: 'bg-surface-high text-on-surface-variant',
};

const STATUS: Record<Property['status'], string | null> = { available: null, under_offer: 'Under offer', sold: 'Sold', let: 'Let agreed' };

function relative(iso: string): string {
  const days = Math.round((Date.UTC(2026, 10, 4) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 14) return `Updated ${days} days ago`;
  return `Updated ${formatListedDate(iso)}`;
}

/** Listing card from the evara design: photo, price, place, matched keyword tags and a "Why it matched?" note. */
export function ResultCard({ property: p, areaUnit, onOpen, saved, onToggleSave, why, whyTitle = 'Why it matched?', highlight = [], badge, viewed, selected, onHover, compact = false }: Props) {
  const ins = getInsights(p);
  const rank = (t: Tag) => (highlight.includes(t.key) ? 0 : t.tone === 'proximity' ? 1 : t.tone === 'feature' ? 2 : 3);
  const tags = [...ins.tags].sort((a, b) => rank(a) - rank(b)).slice(0, compact ? 2 : 3);
  const status = STATUS[p.status];
  const pop = ins.popularity;

  return (
    <article
      id={`card-${p.id}`}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group relative flex flex-col overflow-hidden rounded-3xl bg-surface-lowest shadow-card transition-all duration-300 hover:shadow-card-hover ${
        selected ? 'ring-2 ring-primary-container ring-offset-2 ring-offset-surface' : ''
      } ${compact ? 'w-[300px] shrink-0 snap-start' : ''}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-container">
        <PropertyImage property={p} className="transition-transform duration-500 group-hover:scale-105" />
        {(badge || status) && (
          <div className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-md ${status ? 'bg-inverse-surface/85 text-white' : 'bg-secondary text-white'}`}>
            <Symbol name={status ? 'info' : badge!.icon} size={15} />
            <span>{status ?? badge!.label}</span>
          </div>
        )}
        <button
          type="button"
          aria-pressed={saved}
          aria-label={`${saved ? 'Remove from saved' : 'Save'}: ${p.title}`}
          onClick={() => onToggleSave(p.id)}
          className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface-lowest/85 backdrop-blur-md transition hover:scale-105 ${saved ? 'text-primary-container' : 'text-on-surface hover:text-primary'}`}
        >
          <Symbol name="favorite" size={19} filled={saved} />
        </button>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-lg bg-inverse-surface/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            <Symbol name="visibility" size={14} />
            {pop.viewsWeek} views this week
          </span>
          {pop.level === 'High demand' && (
            <span className="flex items-center gap-1 rounded-lg bg-primary-container/90 px-2 py-1 text-[11px] font-semibold text-white">
              <Symbol name="local_fire_department" size={14} />
              In demand
            </span>
          )}
        </div>
      </div>

      <div className={`flex flex-1 flex-col justify-between ${compact ? 'gap-3 p-4' : 'gap-5 p-6'}`}>
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <div className={`font-bold tracking-tight text-on-surface tabular ${compact ? 'text-xl' : 'text-2xl'}`}>
              {formatAmount(p.price, p.currency)}
              {p.pricePeriod === 'monthly' && <span className="ml-1 text-sm font-normal text-on-surface-variant">pcm</span>}
            </div>
            <span className="text-xs font-semibold text-primary">{p.pricePeriod === 'monthly' ? 'To rent' : 'For sale'}</span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-on-surface-variant">
            <Symbol name="location_on" size={18} className="text-outline" />
            <span className="font-medium text-on-surface">
              {p.neighborhood}, {p.city}
            </span>
            <span aria-hidden="true">•</span>
            <span>{p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} bed`}</span>
            <span aria-hidden="true">•</span>
            <span>{formatPropertyArea(p, areaUnit)}</span>
          </div>

          <ul className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mb-4'}`} aria-label="Key features">
            {tags.map((t) => (
              <li
                key={t.key}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${TONE[t.tone]} ${highlight.includes(t.key) ? 'ring-1 ring-secondary/40' : ''}`}
              >
                <Symbol name={t.icon} size={14} />
                {t.label}
              </li>
            ))}
          </ul>

          {!compact && (
            <div className="flex flex-col gap-1.5 rounded-2xl bg-surface-low p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Symbol name="auto_awesome" size={16} />
                <span>{whyTitle}</span>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">{why ?? ins.summary}</p>
            </div>
          )}
          {compact && why && <p className="mt-3 line-clamp-2 text-[13px] leading-snug text-on-surface-variant">{why}</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-outline">
            {viewed && (
              <>
                <Symbol name="history" size={14} /> Viewed ·
              </>
            )}
            {relative(p.updatedAt)}
          </span>
          <button
            type="button"
            onClick={() => onOpen(p.id)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors after:absolute after:inset-0 after:content-[''] hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`View details: ${p.title}`}
          >
            <span>View</span>
            <Symbol name="chevron_right" size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
