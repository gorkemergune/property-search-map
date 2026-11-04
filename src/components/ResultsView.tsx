import { useState, type ReactNode } from 'react';
import type { FilterChip, SortKey } from '../lib/filters';
import { explainMatch, type Criterion, type ParsedQuery, type RankedResult, type Relaxation } from '../lib/nlSearch';
import type { AreaUnit } from '../types/property';
import { ResultCard } from './ResultCard';
import { SearchIsland } from './SearchIsland';
import { ShareSearchButton } from './ShareSearchButton';
import { Symbol } from './ui/Symbol';

export type ResultSort = 'relevance' | SortKey;

const SORTS: { value: ResultSort; label: string; needsPeriod?: boolean }[] = [
  { value: 'relevance', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high', needsPeriod: true },
  { value: 'price-desc', label: 'Price: high to low', needsPeriod: true },
  { value: 'area-desc', label: 'Largest' },
];

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string) => void;
  parsed: ParsedQuery;
  chips: FilterChip[];
  onRemoveChip: (chip: FilterChip) => void;
  onRemoveCriterion: (c: Criterion) => void;
  loading: boolean;
  full: RankedResult[];
  partial: RankedResult[];
  relaxations: Relaxation[];
  onRelax: (r: Relaxation) => void;
  sort: ResultSort;
  priceSortEnabled: boolean;
  onSortChange: (s: ResultSort) => void;
  onOpenFilters: () => void;
  areaUnit: AreaUnit;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  onOpen: (id: string) => void;
  viewed: ReadonlySet<string>;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  /** Personal affinity per listing (0–1) for the "For you" badge. */
  affinity: (id: string) => number;
  map: ReactNode;
  showMap: boolean;
  onToggleMap: () => void;
  place: string;
}

export function ResultsView(props: Props) {
  const { query, onQueryChange, onSearch, parsed, chips, onRemoveChip, onRemoveCriterion, loading, full, partial, relaxations, onRelax, sort, priceSortEnabled, onSortChange, onOpenFilters, showMap, onToggleMap, map, place } = props;
  const [editing, setEditing] = useState(false);
  const [showPartial, setShowPartial] = useState(true);
  const hasSoft = parsed.soft.length > 0;
  const criticalCount = full.length;
  const total = full.length + partial.length;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 md:px-8 lg:px-12">
      {/* Active query bar */}
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl bg-surface-lowest p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center">
        {editing || !parsed.text ? (
          <div className="min-w-0 flex-1">
            <SearchIsland
              compact
              value={query}
              onChange={onQueryChange}
              onSubmit={(q) => {
                setEditing(false);
                onSearch(q);
              }}
              autoFocus={editing}
            />
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-fixed">
              <Symbol name="manage_search" size={22} className="text-on-primary-fixed" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">Your search</div>
              <h1 className="truncate text-lg font-semibold text-on-surface sm:text-xl">“{parsed.text}”</h1>
            </div>
          </div>
        )}
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          {!loading && (
            <span className="flex items-center gap-1 rounded-full bg-secondary-fixed/50 px-3 py-1 text-xs font-semibold text-secondary">
              <Symbol name="psychology" size={16} />
              {hasSoft ? `${criticalCount} full ${criticalCount === 1 ? 'match' : 'matches'}` : `${total} ${total === 1 ? 'home' : 'homes'} in ${place}`}
            </span>
          )}
          {!editing && parsed.text && (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-high">
              <Symbol name="edit" size={16} />
              Edit search
            </button>
          )}
          <button type="button" data-filters-trigger onClick={onOpenFilters} className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-high">
            <Symbol name="tune" size={16} />
            Filters{chips.length ? ` (${chips.length})` : ''}
          </button>
          <ShareSearchButton />
          <button type="button" onClick={onToggleMap} aria-pressed={showMap} className="hidden items-center gap-1.5 rounded-xl bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-high lg:inline-flex">
            <Symbol name={showMap ? 'grid_view' : 'map'} size={16} />
            {showMap ? 'Hide map' : 'Show map'}
          </button>
        </div>
      </div>

      {/* What we understood */}
      {(chips.length > 0 || parsed.soft.length > 0 || parsed.ignored.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="What we understood">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
            <Symbol name="auto_awesome" size={16} className="text-primary" /> We understood:
          </span>
          {chips.map((c) => (
            <RemovableChip key={c.key} label={c.label} icon="filter_alt" tone="bg-primary-fixed/60 text-on-primary-fixed-variant" onRemove={() => onRemoveChip(c)} hint="Must have" />
          ))}
          {parsed.soft.map((c) => (
            <RemovableChip key={c.id} label={c.label} icon={c.icon} tone="bg-secondary-fixed/45 text-on-secondary-fixed" onRemove={() => onRemoveCriterion(c)} hint="Ranks results" />
          ))}
          {parsed.ignored.length > 0 && (
            <span className="text-xs text-outline" title="These words did not match anything in the listings">
              Not found in listings: {parsed.ignored.map((w) => `“${w}”`).join(', ')}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          {loading ? (
            <Loading parsed={parsed} />
          ) : total === 0 || (hasSoft && full.length === 0 && partial.length === 0) ? (
            <Empty relaxations={relaxations} onRelax={onRelax} onEdit={() => setEditing(true)} />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">
                  {hasSoft ? (
                    <>
                      <strong className="font-semibold text-on-surface">{full.length}</strong> {full.length === 1 ? 'home matches' : 'homes match'} everything
                      {partial.length > 0 && <> · {partial.length} partly</>}
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold text-on-surface">{total}</strong> homes
                    </>
                  )}
                </p>
                <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                  Sort
                  <select value={sort} onChange={(e) => onSortChange(e.target.value as ResultSort)} className="rounded-lg border-0 bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface focus:outline-2 focus:outline-primary">
                    {SORTS.filter((s) => !s.needsPeriod || priceSortEnabled).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {full.length === 0 && hasSoft && relaxations.length > 0 && (
                <div className="mb-6 rounded-2xl bg-primary-fixed/30 p-4 text-sm text-on-primary-fixed-variant">
                  No home ticks every box yet — here are the closest ones. Or try:{' '}
                  {relaxations.map((r, i) => (
                    <span key={r.title}>
                      {i > 0 && ' · '}
                      <button type="button" onClick={() => onRelax(r)} className="font-semibold underline underline-offset-2">
                        {r.title} ({r.count})
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <Grid {...props} items={full} showMap={showMap} />

              {partial.length > 0 && (
                <section className="mt-12" aria-labelledby="partial-head">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 id="partial-head" className="text-lg font-semibold text-on-surface">
                        Close matches
                      </h2>
                      <p className="text-sm text-on-surface-variant">Missing one or more of the things you asked for — the note says which.</p>
                    </div>
                    <button type="button" onClick={() => setShowPartial((v) => !v)} className="rounded-xl bg-surface-container px-3 py-1.5 text-xs font-semibold hover:bg-surface-high">
                      {showPartial ? 'Hide' : `Show ${partial.length}`}
                    </button>
                  </div>
                  {showPartial && <Grid {...props} items={partial} showMap={showMap} partialSection />}
                </section>
              )}
            </>
          )}
        </div>

        {showMap && (
          <aside className="sticky top-24 hidden h-[calc(100dvh-7.5rem)] w-[42%] shrink-0 overflow-hidden rounded-3xl shadow-card lg:block" aria-label="Map of results">
            {map}
          </aside>
        )}
      </div>
    </div>
  );
}

function Grid({ items, showMap, parsed, areaUnit, isSaved, onToggleSave, onOpen, viewed, selectedId, onHover, affinity, partialSection = false }: Props & { items: RankedResult[]; partialSection?: boolean }) {
  const highlight = parsed.soft.flatMap((c) => [c.id]);
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${showMap ? '' : 'xl:grid-cols-3'}`}>
      {items.map((r, i) => {
        const p = r.property;
        const forYou = affinity(p.id) >= 0.55;
        const badge = !partialSection && i === 0 && parsed.soft.length > 0 ? { label: 'Best match', icon: 'verified' } : forYou ? { label: 'For you', icon: 'person_heart' } : null;
        return (
          <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            <ResultCard
              property={p}
              areaUnit={areaUnit}
              onOpen={onOpen}
              saved={isSaved(p.id)}
              onToggleSave={onToggleSave}
              why={explainMatch(r, parsed.hard)}
              whyTitle={parsed.soft.length || parsed.hard.length ? 'Why it matched?' : 'AI summary'}
              highlight={highlight}
              badge={badge}
              viewed={viewed.has(p.id)}
              selected={selectedId === p.id}
              onHover={onHover}
            />
          </div>
        );
      })}
    </div>
  );
}

function RemovableChip({ label, icon, tone, onRemove, hint }: { label: string; icon: string; tone: string; onRemove: () => void; hint: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-semibold ${tone}`} title={hint}>
      <Symbol name={icon} size={14} />
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="ml-0.5 grid h-5 w-5 place-items-center rounded-full hover:bg-black/10">
        <Symbol name="close" size={13} />
      </button>
    </span>
  );
}

function Loading({ parsed }: { parsed: ParsedQuery }) {
  const place = parsed.hard.find((h) => h.icon === 'location_city')?.label ?? parsed.soft.find((s) => s.kind === 'place')?.label ?? 'All UK cities';
  const near = parsed.soft.filter((s) => s.id.startsWith('near') || s.id === 'goodSchool').map((s) => s.label.replace(/^Near (a |the )?/i, ''));
  const kw = parsed.soft.filter((s) => !s.id.startsWith('near') && s.kind !== 'place').map((s) => s.label.toLowerCase());
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center rounded-3xl bg-surface-lowest p-8 text-center shadow-sm">
        <div className="relative mb-4 grid h-16 w-16 place-items-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-surface-container border-t-primary" />
          <Symbol name="neurology" size={28} className="text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-on-surface">Reading listings for you</h2>
        <p className="mb-6 max-w-lg text-sm text-on-surface-variant">Matching your words against listing keywords, walking distances and area data…</p>
        <div className="mb-6 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-surface-container">
          <div className="h-full w-3/4 animate-pulse rounded-full bg-primary-container" />
        </div>
        <div className="grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <Step done title="Location" detail={place} />
          <Step done title="Proximity check" detail={near.length ? near.join(' & ') : 'Transport, schools, hospitals'} />
          <Step title="Keyword match" detail={kw.length ? kw.slice(0, 3).join(', ') : 'Listing summaries'} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 opacity-75 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse space-y-4 rounded-3xl bg-surface-lowest p-5 shadow-sm">
            <div className="aspect-[16/10] w-full rounded-2xl bg-surface-container" />
            <div className="h-6 w-2/3 rounded-md bg-surface-container" />
            <div className="h-4 w-1/2 rounded-md bg-surface-container" />
            <div className="h-16 rounded-xl bg-surface-low" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Step({ title, detail, done = false }: { title: string; detail: string; done?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3.5 ${done ? 'bg-surface-low' : 'bg-surface-high/60'}`}>
      <Symbol name={done ? 'check_circle' : 'sync'} size={20} className={done ? 'text-secondary' : 'animate-spin text-primary'} />
      <div className="min-w-0">
        <div className="text-xs font-semibold text-on-surface">{title}</div>
        <div className={`truncate text-[11px] ${done ? 'text-on-surface-variant' : 'text-primary'}`}>{detail}</div>
      </div>
    </div>
  );
}

function Empty({ relaxations, onRelax, onEdit }: { relaxations: Relaxation[]; onRelax: (r: Relaxation) => void; onEdit: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl py-6">
      <div className="flex flex-col items-center rounded-3xl bg-surface-lowest p-8 text-center shadow-card sm:p-12">
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary-fixed/40 text-primary">
          <Symbol name="filter_alt_off" size={36} />
        </div>
        <h2 className="mb-3 text-2xl font-semibold text-on-surface sm:text-3xl">No homes match all of that yet</h2>
        <p className="mb-8 max-w-xl text-base leading-relaxed text-on-surface-variant">
          No listing meets every detail at once. Loosening one thing usually helps — each option shows how many homes it would bring back:
        </p>
        {relaxations.length > 0 && (
          <div className="mb-8 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
            {relaxations.map((r) => (
              <button key={r.title} type="button" onClick={() => onRelax(r)} className="group flex flex-col justify-between rounded-2xl bg-surface-low p-4 transition-all hover:bg-surface-container">
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                    <span>{r.title}</span>
                    <Symbol name={r.icon} size={18} />
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">{r.description}</p>
                </div>
                <span className="mt-4 text-xs font-semibold text-primary">
                  {r.count} {r.count === 1 ? 'home' : 'homes'} →
                </span>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary">
          <Symbol name="refresh" size={18} />
          Edit search
        </button>
      </div>
    </div>
  );
}
