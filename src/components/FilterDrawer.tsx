import { useRef } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { t } from '../i18n/en';
import type { Filters } from '../lib/filters';
import type { CountryCode } from '../types/property';
import { FilterPanel } from './FilterPanel';
import { CloseIcon } from './icons';

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  citiesByCountry: Record<CountryCode, string[]>;
  resultCount: number;
  onClearAll: () => void;
  onClose: () => void;
}

/** Every filter in a right-hand drawer ("All filters" on desktop, "Filters" on smaller screens). */
export function FilterDrawer({ filters, onChange, citiesByCountry, resultCount, onClearAll, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // Back to the trigger if it was not focused (Safari mouse clicks).
  useDialogFocus(panel, closeButton, onClose, () => document.querySelector<HTMLElement>('[data-filters-trigger]'));

  return (
    <div className="fixed inset-0 z-[1200] flex" role="dialog" aria-modal="true" aria-label={t.filters.title}>
      <button type="button" tabIndex={-1} aria-hidden="true" className="flex-1 bg-ink/30" onClick={onClose} />
      <div ref={panel} className="flex w-full max-w-[400px] flex-col bg-white shadow-[-12px_0_40px_-12px_rgb(29_28_26/0.3)]">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-6">
          <h2 className="font-serif text-2xl text-ink">{t.filters.title}</h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label={t.filters.close}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="scroll-quiet flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-6">
          <FilterPanel filters={filters} onChange={onChange} citiesByCountry={citiesByCountry} />
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-line px-6 py-4">
          <button type="button" onClick={onClearAll} className="text-sm font-medium text-accent hover:underline">
            {t.filters.clearAll}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto h-11 rounded-full bg-ink px-6 text-sm font-medium text-white hover:bg-ink-soft tabular"
          >
            {t.filters.showResults(resultCount)}
          </button>
        </div>
      </div>
    </div>
  );
}
