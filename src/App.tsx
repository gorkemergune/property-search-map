import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilterDrawer } from './components/FilterDrawer';
import { Header } from './components/Header';
import { CloseIcon, ListIcon, MapIcon } from './components/icons';
import { ListingDetail } from './components/ListingDetail';
import { PropertyCard } from './components/PropertyCard';
import { PropertyList } from './components/PropertyList';
import { HEAT_STYLES, HeatLegend, MapModeControl } from './components/MapLayers';
import { MARKER_HELP_ID, PropertyMap } from './components/PropertyMap';
import { ResultsBar } from './components/ResultsBar';
import { SavedHomesPanel } from './components/SavedHomesPanel';
import { Toolbar } from './components/Toolbar';
import { properties } from './data/properties';
import { useListingSelection } from './hooks/useListingSelection';
import { useSavedHomes } from './hooks/useSavedHomes';
import { useUrlSearchState } from './hooks/useUrlSearchState';
import { useViewedHistory } from './hooks/useViewedHistory';
import { t } from './i18n/en';
import {
  applyFilters,
  buildCityIndex,
  clearFilters,
  effectiveSort,
  getActiveChips,
  getPriceContext,
  presetsFor,
  sortProperties,
  togglePreset,
  updateFilters,
  type Filters,
  type SortKey,
} from './lib/filters';
import { densityPoints, interestPoints, type MapMode } from './lib/heat';
const CITY_INDEX = buildCityIndex(properties);
/** Ordered city list; same order drives the Header tabs and the City dropdown. */
const CITIES: readonly string[] = ['London', 'Manchester', 'Birmingham', 'Bristol', 'Edinburgh'];
const BY_ID: ReadonlyMap<string, (typeof properties)[number]> = new Map(properties.map((p) => [p.id, p]));

export default function App() {
  // Filters, sort and map view live in the URL, so a search can be shared and back/forward work.
  const [search, setSearch] = useUrlSearchState(CITY_INDEX);
  const { filters, sort, mapMode } = search;
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const saved = useSavedHomes();
  const history = useViewedHistory();

  const change = useCallback(
    (patch: Partial<Filters>) => setSearch((prev) => ({ ...prev, filters: updateFilters(prev.filters, patch, CITY_INDEX) })),
    [setSearch],
  );
  const clearAll = useCallback(() => setSearch((prev) => ({ ...prev, filters: clearFilters(prev.filters) })), [setSearch]);
  const setSort = useCallback((next: SortKey) => setSearch((prev) => ({ ...prev, sort: next })), [setSearch]);
  const setMapMode = useCallback((next: MapMode) => setSearch((prev) => ({ ...prev, mapMode: next })), [setSearch]);

  const activeSort = effectiveSort(sort, filters);
  // The list and the map both render exactly this array, so counts and markers always agree.
  const results = useMemo(() => sortProperties(applyFilters(properties, filters), activeSort), [filters, activeSort]);
  const chips = useMemo(() => getActiveChips(filters), [filters]);
  const presets = presetsFor(filters.pricePeriod).map((preset) => ({ preset, active: preset.isActive(filters) }));
  const selection = useListingSelection(results, BY_ID);
  const resultIds = useMemo(() => new Set(results.map((p) => p.id)), [results]);

  // A listing counts as viewed only when its detail view opens.
  const detailId = selection.detail?.id;
  const recordView = history.record;
  useEffect(() => {
    if (detailId) recordView(detailId);
  }, [detailId, recordView]);

  const heat = useMemo(() => {
    if (mapMode === 'homes') return null;
    const points = mapMode === 'density' ? densityPoints(results) : interestPoints(properties, filters).points;
    return { points, style: HEAT_STYLES[mapMode] };
  }, [mapMode, results, filters]);

  const place = filters.city !== 'all' ? filters.city : t.results.everywhere;

  return (
    <div className="flex h-dvh flex-col bg-white text-ink">
      <Header
        city={filters.city}
        cities={CITIES}
        onCityChange={(city) => change({ city })}
        savedCount={saved.homes.length}
        onOpenSaved={() => setSavedOpen(true)}
      />
      <Toolbar
        filters={filters}
        onChange={change}
        chips={chips}
        cities={CITIES}
        cityCountry={CITY_INDEX}
        properties={properties}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenListing={selection.openDetails}
      />

      {/* Workspace: results column + inset map */}
      <div className="flex min-h-0 flex-1 gap-6 sm:px-8">
        <main
          className={`scroll-quiet min-w-0 flex-1 overflow-y-auto px-4 pb-28 pt-6 sm:px-0 sm:pr-2 lg:max-w-[52%] lg:flex-none lg:basis-[52%] lg:pb-10 ${
            mobileView === 'map' ? 'hidden lg:block' : ''
          }`}
        >
          <ResultsBar
            place={place}
            pricePeriod={filters.pricePeriod}
            count={results.length}
            sort={activeSort}
            priceSortEnabled={getPriceContext(filters) !== null}
            onSortChange={setSort}
            chips={chips}
            onRemoveChip={(chip) => change(chip.remove)}
            onClearAll={clearAll}
            presets={presets}
            onTogglePreset={(preset) => change(togglePreset(preset, filters))}
            onOpenFilters={() => setFiltersOpen(true)}
            viewedCount={history.count}
            onClearViewed={history.clear}
          />
          <PropertyList
            properties={results}
            selectedId={selection.selectedId}
            hoveredId={selection.hoveredId}
            areaUnit={filters.areaUnit}
            onActivate={selection.activate}
            onOpenDetails={selection.openDetails}
            onHover={selection.setHoveredId}
            onClearFilters={clearAll}
            isSaved={saved.isSaved}
            onToggleSave={saved.toggle}
            viewed={history.viewed}
          />
        </main>

        <section
          aria-label={t.map.label}
          className={`min-w-0 flex-1 lg:block lg:py-6 ${mobileView === 'map' ? 'flex' : 'hidden'}`}
        >
          <p id={MARKER_HELP_ID} className="sr-only">
            {t.map.keyboardHelp}
          </p>
          <div className="relative isolate h-full w-full overflow-hidden sm:rounded-2xl sm:border sm:border-line">
            <PropertyMap
              properties={results}
              selectedId={selection.selectedId}
              hoveredId={selection.hoveredId}
              flyTarget={selection.flyTarget}
              onSelect={selection.selectFromMap}
              onHover={selection.setHoveredId}
              heat={heat}
            />
            <div className="absolute left-3 top-3 z-[1000] flex flex-col items-start gap-2 sm:left-4 sm:top-4">
              <MapModeControl mode={mapMode} onChange={setMapMode} />
              {mapMode !== 'homes' && <HeatLegend mode={mapMode} resultCount={results.length} />}
            </div>
            {selection.selected && (
              <div className="absolute bottom-20 left-3 right-3 z-[1000] sm:bottom-4 sm:left-4 sm:right-auto sm:w-[420px]">
                <div className="relative">
                  <PropertyCard
                    property={selection.selected}
                    layout="horizontal"
                    selected
                    hovered={false}
                    areaUnit={filters.areaUnit}
                    onActivate={selection.openDetails}
                    onOpenDetails={selection.openDetails}
                    onHover={() => {}}
                    saved={saved.isSaved(selection.selected.id)}
                    onToggleSave={saved.toggle}
                    viewed={history.viewed.has(selection.selected.id)}
                  />
                  <button
                    type="button"
                    onClick={selection.clearSelection}
                    aria-label={t.map.closePreview}
                    className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
                  >
                    <CloseIcon width={14} height={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile list/map switch */}
      <button
        type="button"
        onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}
        className="fixed bottom-5 left-1/2 z-[1100] flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgb(29_28_26/0.5)] lg:hidden"
      >
        {mobileView === 'list' ? <MapIcon /> : <ListIcon />}
        {mobileView === 'list' ? t.map.showMap : t.map.showList}
      </button>

      {filtersOpen && (
        <FilterDrawer
          filters={filters}
          onChange={change}
          cities={CITIES}
          resultCount={results.length}
          onClearAll={clearAll}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {selection.detail && (
        <ListingDetail
          property={selection.detail}
          areaUnit={filters.areaUnit}
          onClose={selection.closeDetails}
          onShowOnMap={(id) => {
            selection.showOnMap(id);
            setMobileView('map');
          }}
          saved={saved.isSaved(selection.detail.id)}
          onToggleSave={saved.toggle}
        />
      )}

      {savedOpen && (
        <SavedHomesPanel
          homes={saved.homes}
          lookup={BY_ID}
          inResults={resultIds}
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
        />
      )}
    </div>
  );
}
