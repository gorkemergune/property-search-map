import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { t } from '../i18n/en';
import type { Filters } from '../lib/filters';
import { formatPrice } from '../lib/format';
import { flattenSuggestions, getSuggestions, type Suggestion, type SuggestionGroups } from '../lib/search';
import type { CountryCode, Property } from '../types/property';
import { CloseIcon, PinIcon, SearchIcon } from './icons';
import { PropertyImage } from './PropertyImage';

interface Props {
  properties: readonly Property[];
  filters: Filters;
  cityCountry: Readonly<Record<string, CountryCode>>;
  onChange: (patch: Partial<Filters>) => void;
  onOpenListing: (id: string) => void;
}

const listingDetail = (p: Property) => `${formatPrice(p)} · ${p.neighborhood}, ${p.city}`;
const NO_SUGGESTIONS: SuggestionGroups = { query: null, places: [], types: [], listings: [] };

/**
 * Location/keyword search with suggestions (ARIA combobox).
 * Typing filters live; arrows move through suggestions; Enter applies the
 * highlighted one (or keeps the typed keyword); Escape or a click outside
 * closes the list.
 */
export function SearchBox({ properties, filters, cityCountry, onChange, onOpenListing }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  // Suggestions are only worked out while the list is open.
  const groups = useMemo(
    () => (open ? getSuggestions(filters.query, properties, filters, cityCountry, listingDetail) : NO_SUGGESTIONS),
    [open, filters, properties, cityCountry],
  );
  const flat = useMemo(() => flattenSuggestions(groups), [groups]);
  // Only say nothing matches when the keyword itself finds no homes.
  const nothingFound = groups.query !== null && groups.query.count === 0 && flat.length === 1;
  const showList = open && flat.length > 0;

  const apply = (s: Suggestion) => {
    if (s.kind === 'listing') onOpenListing(s.property.id);
    else onChange(s.patch);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (flat.length === 0 ? -1 : (i + 1) % flat.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (flat.length === 0 ? -1 : i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showList && active >= 0 && flat[active]) apply(flat[active]);
      else setOpen(false); // The typed keyword is already applied live.
    } else if (e.key === 'Escape') {
      if (showList) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  };

  let index = -1;
  const renderOption = (s: Suggestion) => {
    index += 1;
    const i = index;
    const selected = i === active;
    // Listings already show their full title; the hint is for places and types.
    const didYouMean = s.fuzzy && s.kind !== 'listing';
    return (
      <li
        key={s.id}
        id={optionId(i)}
        role="option"
        aria-selected={selected}
        // Keep focus in the input so blur does not close the list before the click lands.
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => setActive(i)}
        onClick={() => apply(s)}
        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${selected ? 'bg-canvas' : ''}`}
      >
        {s.kind === 'listing' ? (
          <span className="block h-10 w-12 shrink-0 overflow-hidden rounded-md bg-canvas">
            <PropertyImage property={s.property} />
          </span>
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-canvas text-muted">
            {s.kind === 'query' ? <SearchIcon width={14} height={14} /> : <PinIcon width={14} height={14} />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">
            {didYouMean && <span className="text-muted">{t.search.didYouMean} </span>}
            <span className="font-medium">{s.label}</span>
            {didYouMean && <span className="text-muted">?</span>}
          </span>
          {s.detail && <span className="block truncate text-xs text-muted tabular">{s.detail}</span>}
        </span>
        {s.kind !== 'listing' && <span className="shrink-0 text-xs text-muted tabular">{t.search.homes(s.count)}</span>}
      </li>
    );
  };

  const group = (title: string, items: Suggestion[]) =>
    items.length > 0 && (
      <li role="presentation">
        <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{title}</p>
        <ul role="group" aria-label={title}>
          {items.map(renderOption)}
        </ul>
      </li>
    );

  return (
    <form
      role="search"
      className="relative order-first w-full sm:order-none sm:w-80 xl:w-[22rem]"
      onSubmit={(e) => e.preventDefault()}
    >
      <label htmlFor="location-search" className="sr-only">
        {t.search.label}
      </label>
      <SearchIcon width={17} height={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        id="location-search"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        value={filters.query}
        onChange={(e) => {
          onChange({ query: e.target.value });
          setOpen(true);
          setActive(-1);
        }}
        // Opens on click, typing or arrow keys, not on focus: focus also comes back
        // here programmatically (e.g. when a listing drawer closes).
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={t.search.placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-full border border-transparent bg-canvas pl-11 pr-10 text-sm text-ink placeholder:text-muted focus:border-line-strong focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {filters.query && (
        <button
          type="button"
          onClick={() => {
            onChange({ query: '' });
            setActive(-1);
            inputRef.current?.focus();
          }}
          aria-label={t.search.clear}
          className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
        >
          <CloseIcon width={13} height={13} />
        </button>
      )}

      <ul
        id={listboxId}
        role="listbox"
        aria-label={t.search.suggestions}
        hidden={!showList}
        className="scroll-quiet absolute left-0 top-full z-[1300] mt-2 max-h-[min(70vh,520px)] w-full overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_-8px_rgb(29_28_26/0.18),0_2px_6px_rgb(29_28_26/0.06)] sm:w-[440px]"
      >
        {groups.query && renderOption(groups.query)}
        {nothingFound && (
          <li role="presentation" className="px-3 pb-2 pt-1 text-xs text-muted">
            {t.search.noSuggestions}
          </li>
        )}
        {group(t.search.groups.places, groups.places)}
        {group(t.search.groups.types, groups.types)}
        {group(t.search.groups.listings, groups.listings)}
      </ul>
    </form>
  );
}
