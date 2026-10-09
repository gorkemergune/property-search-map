import { useCallback, useMemo, useState } from 'react';
import { FilterDrawer } from './components/FilterDrawer';
import { Header } from './components/Header';
import { CloseIcon, ListIcon, MapIcon } from './components/icons';
import { ListingDetail } from './components/ListingDetail';
import { PropertyCard } from './components/PropertyCard';
import { PropertyList } from './components/PropertyList';
import { MARKER_HELP_ID, PropertyMap } from './components/PropertyMap';
import { ResultsBar } from './components/ResultsBar';
import { Toolbar } from './components/Toolbar';
import { properties } from './data/properties';
import { useListingSelection } from './hooks/useListingSelection';
import { t } from './i18n/en';
import {
  DEFAULT_FILTERS,
  applyFilters,
  buildCityIndex,
  clearFilters,
  effectiveSort,
  getActiveChips,
  getPriceContext,
  sortProperties,
  updateFilters,
  type Filters,
  type SortKey,
} from './lib/filters';
import { COUNTRY_CODES, type CountryCode } from './types/property';

const CITY_INDEX = buildCityIndex(properties);
const CITIES_BY_COUNTRY = Object.fromEntries(
  COUNTRY_CODES.map((c) => [c, Object.keys(CITY_INDEX).filter((city) => CITY_INDEX[city] === c)]),
) as Record<CountryCode, string[]>;

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('newest');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const change = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => updateFilters(prev, patch, CITY_INDEX));
  }, []);
  const clearAll = useCallback(() => setFilters(clearFilters), []);

  const activeSort = effectiveSort(sort, filters);
  // The list and the map both render exactly this array, so counts and markers always agree.
  const results = useMemo(() => sortProperties(applyFilters(properties, filters), activeSort), [filters, activeSort]);
  const chips = useMemo(() => getActiveChips(filters), [filters]);
  const selection = useListingSelection(results);

  const place =
    filters.city !== 'all' ? filters.city : filters.country !== 'all' ? t.countries[filters.country] : t.results.everywhere;

  return (
    <div className="flex h-dvh flex-col bg-white text-ink">
      <Header country={filters.country} onCountryChange={(country) => change({ country })} />
      <Toolbar
        filters={filters}
        onChange={change}
        chips={chips}
        citiesByCountry={CITIES_BY_COUNTRY}
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
            />
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
          citiesByCountry={CITIES_BY_COUNTRY}
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
        />
      )}
    </div>
  );
}
