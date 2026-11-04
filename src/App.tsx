import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterDrawer } from './components/FilterDrawer';
import { Home } from './components/Home';
import { ListingDetail } from './components/ListingDetail';
import type { AreaFocus, AreaLevel } from './components/AreaLayer';
import { ListingDensityLegend, MapModeControl, PopulationLegend, type AreaSummary } from './components/MapLayers';
import { MARKER_HELP_ID, PropertyMap, type AreaOverlay } from './components/PropertyMap';
import { ResultCard } from './components/ResultCard';
import { ResultsView, type ResultSort } from './components/ResultsView';
import { SavedHomesPanel } from './components/SavedHomesPanel';
import { SavedInsights } from './components/SavedInsights';
import { TopNav } from './components/TopNav';
import { Symbol } from './components/ui/Symbol';
import { properties } from './data/properties';
import { useAreaData } from './hooks/useAreaData';
import { useListingSelection } from './hooks/useListingSelection';
import { useSavedHomes } from './hooks/useSavedHomes';
import { useUrlSearchState } from './hooks/useUrlSearchState';
import { useViewedHistory } from './hooks/useViewedHistory';
import { t } from './i18n/en';
import { assignToAreas, countByArea } from './lib/areas';
import { applyFilters, buildCityIndex, clearFilters, getActiveChips, getPriceContext, sortProperties, updateFilters, DEFAULT_FILTERS, type Filters } from './lib/filters';
import type { MapMode } from './lib/heat';
import { primeInsights } from './lib/insights';
import { buildVocabulary, parseQuery, rankResults, removeCriterionFromQuery, suggestRelaxations, type Criterion, type Relaxation } from './lib/nlSearch';
import { affinity, buildProfile, commonTraits, recommend, similarTo, traitsToQuery } from './lib/recommend';
import { readJson, writeJson } from './lib/storage';
import { DEFAULT_SEARCH_STATE } from './lib/urlState';
import type { Property } from './types/property';

primeInsights(properties);
const VOCAB = buildVocabulary(properties);
const CITY_INDEX = buildCityIndex(properties);
const CITIES: readonly string[] = [...new Set(properties.map((p) => p.city))];
const BY_ID: ReadonlyMap<string, Property> = new Map(properties.map((p) => [p.id, p]));

const RECENT_KEY = 'evara.recentSearches.v1';
const parseRecent = (raw: unknown) => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(0, 8) : null);
/** Short "reading listings" pause so the visitor sees what is being matched; skipped in tests. */
const SCAN_MS = import.meta.env.MODE === 'test' ? 0 : 700;

const isDefaultFilters = (f: Filters) => JSON.stringify({ ...f, areaUnit: 'sqm' }) === JSON.stringify(DEFAULT_FILTERS);

export default function App() {
  const [search, setSearch] = useUrlSearchState(CITY_INDEX);
  const { filters, mapMode } = search;
  const [browse, setBrowse] = useState(false);
  const screen = !browse && isDefaultFilters(filters) ? 'home' : 'results';

  const [draft, setDraft] = useState(filters.query);
  useEffect(() => setDraft(filters.query), [filters.query]);
  const [resultSort, setResultSort] = useState<ResultSort>('relevance');
  const [loading, setLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showMap, setShowMap] = useState(true);
  const [mobileMap, setMobileMap] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readJson(RECENT_KEY, parseRecent, []));
  const saved = useSavedHomes();
  const history = useViewedHistory();

  // ---------------------------------------------------------------- search
  const change = useCallback((patch: Partial<Filters>) => setSearch((prev) => ({ ...prev, filters: updateFilters(prev.filters, patch, CITY_INDEX) })), [setSearch]);
  const setMapMode = useCallback((next: MapMode) => setSearch((prev) => ({ ...prev, mapMode: next })), [setSearch]);

  const scan = useCallback(() => {
    if (!SCAN_MS) return;
    clearTimeout(loadingTimer.current);
    setLoading(true);
    loadingTimer.current = setTimeout(() => setLoading(false), SCAN_MS);
  }, []);
  useEffect(() => () => clearTimeout(loadingTimer.current), []);

  const runSearch = useCallback(
    (text: string) => {
      const q = text.trim();
      const parsed = parseQuery(q, VOCAB);
      setSearch((prev) => ({ ...prev, filters: updateFilters(clearFilters(prev.filters), { ...parsed.filters, query: q }, CITY_INDEX) }));
      setResultSort('relevance');
      setBrowse(true);
      setDraft(q);
      scan();
      if (q) {
        setRecent((prev) => {
          const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
          writeJson(RECENT_KEY, next);
          return next;
        });
      }
      window.scrollTo?.({ top: 0 });
    },
    [setSearch, scan],
  );

  const goHome = useCallback(() => {
    setSearch(DEFAULT_SEARCH_STATE);
    setBrowse(false);
    setDraft('');
    window.scrollTo?.({ top: 0 });
  }, [setSearch]);
  const browseAll = useCallback(() => {
    setBrowse(true);
    window.scrollTo?.({ top: 0 });
  }, []);

  const parsed = useMemo(() => parseQuery(filters.query, VOCAB), [filters.query]);
  const chips = useMemo(() => getActiveChips(filters).filter((c) => c.key !== 'query'), [filters]);
  const base = useMemo(() => applyFilters(properties, { ...filters, query: '' }), [filters]);

  // ---------------------------------------------------------------- personal profile
  const savedProps = useMemo(() => saved.homes.map((h) => BY_ID.get(h.id)).filter((p): p is Property => Boolean(p)), [saved.homes]);
  const viewedProps = useMemo(() => history.ids.map((id) => BY_ID.get(id)).filter((p): p is Property => Boolean(p)), [history.ids]);
  const profile = useMemo(() => buildProfile({ saved: savedProps, viewed: viewedProps }), [savedProps, viewedProps]);
  const affinityOf = useMemo(() => {
    const cache = new Map<string, number>();
    return (p: Property) => {
      let v = cache.get(p.id);
      if (v === undefined) cache.set(p.id, (v = affinity(p, profile).score));
      return v;
    };
  }, [profile]);
  const recommendations = useMemo(() => recommend(properties, profile, 8), [profile]);
  const traits = useMemo(() => commonTraits(savedProps), [savedProps]);
  const basketRecs = useMemo(() => recommend(properties, buildProfile({ saved: savedProps, viewed: [] }), 3), [savedProps]);

  // ---------------------------------------------------------------- results
  const ranked = useMemo(() => {
    const r = rankResults(base, parsed.soft, affinityOf);
    if (resultSort === 'relevance') return r;
    const order = new Map(sortProperties(base, resultSort).map((p, i) => [p.id, i]));
    return [...r].sort((a, b) => (parsed.soft.length ? b.score - a.score : 0) || order.get(a.property.id)! - order.get(b.property.id)!);
  }, [base, parsed.soft, affinityOf, resultSort]);
  const hasSoft = parsed.soft.length > 0;
  const full = useMemo(() => (hasSoft ? ranked.filter((r) => r.score >= 0.999) : ranked), [ranked, hasSoft]);
  const partial = useMemo(() => (hasSoft ? ranked.filter((r) => r.score > 0 && r.score < 0.999) : []), [ranked, hasSoft]);
  const mapResults = useMemo(() => [...full, ...partial].map((r) => r.property), [full, partial]);

  const relaxations = useMemo(() => {
    if (full.length >= 3 || (!hasSoft && chips.length === 0)) return [];
    return suggestRelaxations(parsed, filters, (f, soft) => rankResults(applyFilters(properties, { ...f, query: '' }), soft).filter((r) => r.score >= 0.999).length);
  }, [full.length, hasSoft, chips.length, parsed, filters]);

  const applyRelaxation = (r: Relaxation) => {
    setSearch((prev) => ({ ...prev, filters: updateFilters(prev.filters, { ...r.patch, query: r.query }, CITY_INDEX) }));
    scan();
  };
  const removeCriterion = (c: Criterion) => change({ query: removeCriterionFromQuery(filters.query, c) });

  // ---------------------------------------------------------------- selection & detail
  const selection = useListingSelection(mapResults, BY_ID);
  const detailId = selection.detail?.id;
  const recordView = history.record;
  useEffect(() => {
    if (detailId) recordView(detailId);
  }, [detailId, recordView]);
  const openListing = useCallback((id: string) => (mapResults.some((p) => p.id === id) ? selection.openDetails(id) : selection.openSavedDetails(id)), [mapResults, selection]);
  const similar = useMemo(() => (selection.detail ? similarTo(selection.detail, properties, 4) : []), [selection.detail]);

  // ---------------------------------------------------------------- map areas (unchanged behaviour)
  const geo = useAreaData(mapMode !== 'homes');
  const [areaLevel, setAreaLevel] = useState<AreaLevel>('lad');
  const [areaFocus, setAreaFocus] = useState<AreaFocus | null>(null);
  const focusArea = useCallback((code: string) => setAreaFocus((f) => ({ code, seq: (f?.seq ?? 0) + 1 })), []);
  const assignment = useMemo(() => (geo.status === 'ready' ? assignToAreas(properties, geo.lads, geo.wards) : null), [geo]);
  const areaCounts = useMemo(() => (assignment && mapMode === 'density' ? countByArea(mapResults, assignment) : null), [assignment, mapMode, mapResults]);
  const areaNames = useMemo(() => (geo.status === 'ready' ? new Map([...geo.lads.features, ...geo.wards.features].map((f) => [f.properties.code, f.properties.name])) : null), [geo]);
  const topAreas = useMemo<AreaSummary[]>(() => {
    if (!areaCounts || !areaNames) return [];
    const wardLads = new Set(geo.status === 'ready' ? geo.wards.features.map((f) => f.properties.lad) : []);
    const visible = areaLevel === 'ward' ? [...areaCounts.ward, ...[...areaCounts.lad].filter(([code]) => !wardLads.has(code))] : [...areaCounts.lad];
    return visible.map(([code, count]) => ({ code, count, name: areaNames.get(code) ?? code })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 12);
  }, [areaCounts, areaNames, areaLevel, geo]);
  const areas = useMemo<AreaOverlay | null>(
    () => (mapMode !== 'homes' && geo.status === 'ready' ? { mode: mapMode, lads: geo.lads, wards: geo.wards, counts: areaCounts, focus: areaFocus, onLevelChange: setAreaLevel } : null),
    [mapMode, geo, areaCounts, areaFocus],
  );

  const map = (
    <div className="relative isolate h-full w-full overflow-hidden">
      <p id={MARKER_HELP_ID} className="sr-only">
        {t.map.keyboardHelp}
      </p>
      <PropertyMap properties={mapResults} selectedId={selection.selectedId} hoveredId={selection.hoveredId} flyTarget={selection.flyTarget} onSelect={selection.selectFromMap} onHover={selection.setHoveredId} areas={areas} />
      <div className="absolute left-3 top-3 z-[1000] flex flex-col items-start gap-2">
        <MapModeControl mode={mapMode} onChange={setMapMode} />
        {mapMode === 'popular' && <PopulationLegend status={geo.status} sources={geo.status === 'ready' ? geo.sources : null} onRetry={geo.status === 'error' ? geo.retry : undefined} />}
        {mapMode === 'density' && (
          <ListingDensityLegend
            status={geo.status}
            sources={geo.status === 'ready' ? geo.sources : null}
            onRetry={geo.status === 'error' ? geo.retry : undefined}
            resultCount={mapResults.length}
            counts={areaCounts}
            level={areaLevel}
            topAreas={topAreas}
            onFocusArea={focusArea}
          />
        )}
      </div>
      {selection.selected && (
        <div className="absolute bottom-4 left-3 right-3 z-[1000] sm:left-4 sm:right-auto sm:w-[320px]">
          <div className="relative">
            <ResultCard property={selection.selected} areaUnit={filters.areaUnit} onOpen={selection.openDetails} saved={saved.isSaved(selection.selected.id)} onToggleSave={saved.toggle} compact />
            <button type="button" onClick={selection.clearSelection} aria-label={t.map.closePreview} className="absolute -right-2 -top-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-surface-lowest text-on-surface shadow">
              <Symbol name="close" size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const place = filters.city !== 'all' ? filters.city : 'the UK';

  return (
    <div className="min-h-dvh text-on-surface">
      <TopNav
        screen={screen}
        onHome={goHome}
        onBrowse={browseAll}
        savedCount={saved.homes.length}
        onOpenSaved={() => setSavedOpen(true)}
      />
      <main className="w-full pt-16 md:pt-20">
        {screen === 'home' ? (
          <Home
            query={draft}
            onQueryChange={setDraft}
            onSearch={runSearch}
            properties={properties}
            recommendations={recommendations}
            traits={traits}
            recentSearches={recent}
            onClearRecent={() => {
              setRecent([]);
              writeJson(RECENT_KEY, []);
            }}
            areaUnit={filters.areaUnit}
            isSaved={saved.isSaved}
            onToggleSave={saved.toggle}
            onOpen={openListing}
            viewed={history.viewed}
            onBrowseAll={browseAll}
          />
        ) : (
          <ResultsView
            query={draft}
            onQueryChange={setDraft}
            onSearch={runSearch}
            parsed={parsed}
            chips={chips}
            onRemoveChip={(chip) => change(chip.remove)}
            onRemoveCriterion={removeCriterion}
            loading={loading}
            full={full}
            partial={partial}
            relaxations={relaxations}
            onRelax={applyRelaxation}
            sort={resultSort}
            priceSortEnabled={getPriceContext(filters) !== null}
            onSortChange={setResultSort}
            onOpenFilters={() => setFiltersOpen(true)}
            areaUnit={filters.areaUnit}
            isSaved={saved.isSaved}
            onToggleSave={saved.toggle}
            onOpen={selection.openDetails}
            viewed={history.viewed}
            selectedId={selection.selectedId}
            onHover={selection.setHoveredId}
            affinity={(id) => affinityOf(BY_ID.get(id)!)}
            map={showMap && !mobileMap ? map : null}
            showMap={showMap}
            onToggleMap={() => setShowMap((v) => !v)}
            place={place}
          />
        )}
      </main>

      {screen === 'results' && (
        <>
          <button
            type="button"
            onClick={() => setMobileMap((v) => !v)}
            className="fixed bottom-5 left-1/2 z-[1150] flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-inverse-surface px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgb(15_23_42/0.5)] lg:hidden"
          >
            <Symbol name={mobileMap ? 'grid_view' : 'map'} size={18} />
            {mobileMap ? t.map.showList : t.map.showMap}
          </button>
          {mobileMap && <div className="fixed inset-x-0 bottom-0 top-16 z-[1100] bg-surface lg:hidden">{map}</div>}
        </>
      )}

      {filtersOpen && <FilterDrawer filters={filters} onChange={change} cities={CITIES} resultCount={mapResults.length} onClearAll={() => setSearch((prev) => ({ ...prev, filters: { ...clearFilters(prev.filters), query: prev.filters.query } }))} onClose={() => setFiltersOpen(false)} />}

      {selection.detail && (
        <ListingDetail
          property={selection.detail}
          areaUnit={filters.areaUnit}
          onClose={selection.closeDetails}
          onShowOnMap={(id) => {
            setBrowse(true);
            setShowMap(true);
            selection.showOnMap(id);
            if (window.matchMedia?.('(max-width: 1023px)').matches) setMobileMap(true);
          }}
          saved={saved.isSaved(selection.detail.id)}
          onToggleSave={saved.toggle}
          similar={similar}
          onOpenListing={openListing}
        />
      )}

      {savedOpen && (
        <SavedHomesPanel
          homes={saved.homes}
          lookup={BY_ID}
          inResults={new Set(mapResults.map((p) => p.id))}
          areaUnit={filters.areaUnit}
          onRemove={saved.remove}
          onClear={saved.clear}
          onNote={saved.setNote}
          onRating={saved.setRating}
          onOpenDetails={(id) => {
            setSavedOpen(false);
            selection.openSavedDetails(id);
          }}
          onClose={() => setSavedOpen(false)}
          insights={
            <SavedInsights
              traits={traits}
              recommendations={basketRecs}
              savedCount={saved.homes.length}
              onFindMore={() => {
                setSavedOpen(false);
                runSearch(traitsToQuery(traits));
              }}
              onOpen={(id) => {
                setSavedOpen(false);
                selection.openSavedDetails(id);
              }}
              onSave={saved.toggle}
            />
          }
        />
      )}
    </div>
  );
}
