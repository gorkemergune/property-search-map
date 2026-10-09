import { t } from '../i18n/en';
import { SORT_KEYS, isPriceSort, type FilterChip, type SortKey } from '../lib/filters';
import type { PricePeriod } from '../types/property';
import { CloseIcon } from './icons';

interface Props {
  place: string;
  pricePeriod: PricePeriod | 'all';
  count: number;
  sort: SortKey;
  priceSortEnabled: boolean;
  onSortChange: (sort: SortKey) => void;
  chips: FilterChip[];
  onRemoveChip: (chip: FilterChip) => void;
  onClearAll: () => void;
}

/** Results heading (display serif), count, sort and the active-filter chips. */
export function ResultsBar({
  place,
  pricePeriod,
  count,
  sort,
  priceSortEnabled,
  onSortChange,
  chips,
  onRemoveChip,
  onClearAll,
}: Props) {
  return (
    <div className="pb-5">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-serif text-[26px] leading-[1.1] tracking-[-0.01em] text-ink sm:text-[34px]">
            {t.results.headingLead(pricePeriod)} <em className="whitespace-nowrap">{place}</em>
          </h1>
          <p className="mt-1.5 text-[13px] text-muted tabular" aria-live="polite">
            {t.results.count(count)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pb-0.5 text-[13px]">
          <label htmlFor="sort" className="text-muted">
            {t.results.sortLabel}:
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            title={priceSortEnabled ? undefined : t.sort.priceNeedsMarket}
            className="cursor-pointer appearance-none bg-transparent font-medium text-accent [field-sizing:content] focus:outline-none focus-visible:underline"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key} disabled={isPriceSort(key) && !priceSortEnabled}>
                {t.sort[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!priceSortEnabled && <p className="sr-only">{t.sort.priceNeedsMarket}</p>}

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onRemoveChip(chip)}
              aria-label={t.filters.removeChip(chip.label)}
              className="group flex h-7 items-center gap-1.5 rounded-full bg-canvas pl-3 pr-2 text-xs text-ink-soft transition hover:bg-line tabular"
            >
              {chip.label}
              <CloseIcon width={11} height={11} className="text-muted group-hover:text-ink" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="ml-1.5 text-xs font-medium text-accent hover:underline hover:underline-offset-2"
          >
            {t.filters.clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
