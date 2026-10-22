import { t } from '../i18n/en';
import { SORT_KEYS, isPriceSort, type FilterChip, type QuickPreset, type SortKey } from '../lib/filters';
import type { PricePeriod } from '../types/property';
import { CloseIcon, SlidersIcon } from './icons';
import { ShareSearchButton } from './ShareSearchButton';

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
  presets: { preset: QuickPreset; active: boolean }[];
  onTogglePreset: (preset: QuickPreset) => void;
  onOpenFilters: () => void;
  viewedCount: number;
  onClearViewed: () => void;
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
  presets,
  onTogglePreset,
  onOpenFilters,
  viewedCount,
  onClearViewed,
}: Props) {
  return (
    <div className="pb-5">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-serif text-[26px] leading-[1.1] tracking-[-0.01em] text-ink sm:text-[34px]">
            {t.results.headingLead(pricePeriod)} <em className="whitespace-nowrap">{place}</em>
          </h1>
          <p className="mt-1.5 text-[13px] text-muted tabular">
            <span aria-live="polite">{t.results.count(count)}</span>
            {viewedCount > 0 && (
              <>
                <span className="text-faint"> · {t.viewed.summary(viewedCount)} · </span>
                <button type="button" onClick={onClearViewed} className="text-muted underline decoration-line-strong underline-offset-2 hover:text-ink">
                  {t.viewed.clear}
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 pb-0.5">
        <ShareSearchButton />
        <div className="flex items-center gap-1.5 text-[13px]">
          <label htmlFor="sort" className="text-muted">
            {t.results.sortLabel}:
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            title={priceSortEnabled ? undefined : t.sort.priceNeedsMarket}
            className="cursor-pointer appearance-none bg-transparent font-medium text-accent field-sizing-content focus:outline-none focus-visible:underline"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key} disabled={isPriceSort(key) && !priceSortEnabled}>
                {t.sort[key]}
              </option>
            ))}
          </select>
        </div>
        </div>
      </div>
      {!priceSortEnabled && <p className="sr-only">{t.sort.priceNeedsMarket}</p>}

      {/* Quick filters scroll sideways on phones instead of wrapping into several rows. */}
      <div
        role="group"
        aria-label={t.presets.label}
        className="scroll-quiet -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {presets.map(({ preset, active }) => (
          <button
            key={preset.key}
            type="button"
            aria-pressed={active}
            onClick={() => onTogglePreset(preset)}
            className={`h-8 shrink-0 rounded-full border px-3 text-[13px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <SlidersIcon width={13} height={13} />
          {t.presets.more}
        </button>
      </div>

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
