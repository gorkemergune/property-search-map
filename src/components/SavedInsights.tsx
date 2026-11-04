import { formatAmount } from '../lib/format';
import type { Recommendation, Trait } from '../lib/recommend';
import { PropertyImage } from './PropertyImage';
import { Symbol } from './ui/Symbol';

interface Props {
  traits: Trait[];
  recommendations: Recommendation[];
  savedCount: number;
  onFindMore: () => void;
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
}

/** Top of the saved-homes basket: what the saved homes share, and homes that share it too. */
export function SavedInsights({ traits, recommendations, savedCount, onFindMore, onOpen, onSave }: Props) {
  if (savedCount === 0) return null;
  return (
    <section className="mt-5 rounded-3xl bg-surface-low p-5" aria-labelledby="basket-insights">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="basket-insights" className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Symbol name="person_heart" size={20} className="text-primary" />
            What your saved homes have in common
          </h3>
          {traits.length === 0 && <p className="mt-1 text-sm text-on-surface-variant">Save at least two homes to see shared traits and get matching suggestions.</p>}
        </div>
        {traits.length > 0 && (
          <button type="button" onClick={onFindMore} className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-4 py-2 text-xs font-semibold text-white hover:bg-primary">
            <Symbol name="travel_explore" size={16} />
            Find more like these
          </button>
        )}
      </div>
      {traits.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {traits.map((t) => (
            <li key={t.label} className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/45 px-3 py-1 text-xs font-semibold text-on-secondary-fixed">
              <Symbol name={t.icon} size={14} />
              {t.label}
              <span className="font-normal opacity-70">
                {t.count}/{t.total}
              </span>
            </li>
          ))}
        </ul>
      )}
      {recommendations.length > 0 && (
        <>
          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-secondary">You might also like</h4>
          <ul className="grid gap-3 sm:grid-cols-3">
            {recommendations.map((r) => (
              <li key={r.property.id} className="relative flex flex-col overflow-hidden rounded-2xl bg-surface-lowest shadow-card">
                <button type="button" onClick={() => onOpen(r.property.id)} className="text-left">
                  <span className="block aspect-[16/10] overflow-hidden">
                    <PropertyImage property={r.property} />
                  </span>
                  <span className="block p-3">
                    <span className="block text-sm font-bold text-on-surface tabular">
                      {formatAmount(r.property.price, r.property.currency)}
                      {r.property.pricePeriod === 'monthly' && <span className="font-normal text-on-surface-variant"> pcm</span>}
                      <span className="float-right rounded-full bg-secondary-fixed/50 px-2 text-[10px] font-semibold text-secondary">{Math.round(r.score * 100)}%</span>
                    </span>
                    <span className="block truncate text-xs text-on-surface-variant">
                      {r.property.neighborhood}, {r.property.city}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-outline">{r.reasons.join(' · ')}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSave(r.property.id)}
                  aria-label={`Save ${r.property.title}`}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-surface-lowest/90 text-on-surface hover:text-primary"
                >
                  <Symbol name="favorite" size={17} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
