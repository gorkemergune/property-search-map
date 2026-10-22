import { useCallback, useState } from 'react';
import type { FlyTarget } from '../components/PropertyMap';
import type { Property } from '../types/property';

/**
 * Selection, hover and detail state shared by the list, the map and the search box.
 * - `activate` (card click/Enter/Space): selects and flies the map there; on an already-selected card it opens details.
 * - `selectFromMap` (marker click): selects without moving the map.
 * - `openDetails`: selects, flies the map and opens the detail drawer.
 * - `openSavedDetails`: opens details from saved homes, even for a listing outside the current results.
 * A selection or detail view whose listing is filtered out is dropped, except a
 * detail view opened from saved homes (`all` supplies that listing).
 */
export function useListingSelection(results: Property[], all: ReadonlyMap<string, Property>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [detailOutsideResults, setDetailOutsideResults] = useState(false);

  const flyTo = useCallback((id: string) => setFlyTarget((prev) => ({ id, seq: (prev?.seq ?? 0) + 1 })), []);

  const activate = useCallback(
    (id: string) => {
      if (id === selectedId) {
        setDetailId(id);
        return;
      }
      setSelectedId(id);
      flyTo(id);
    },
    [selectedId, flyTo],
  );

  const selectFromMap = useCallback((id: string) => setSelectedId(id), []);

  const openDetails = useCallback(
    (id: string) => {
      setSelectedId(id);
      flyTo(id);
      setDetailId(id);
      setDetailOutsideResults(false);
    },
    [flyTo],
  );

  const openSavedDetails = useCallback(
    (id: string) => {
      const listed = results.some((p) => p.id === id);
      if (listed) {
        setSelectedId(id);
        flyTo(id);
      }
      setDetailId(id);
      setDetailOutsideResults(!listed);
    },
    [results, flyTo],
  );

  const showOnMap = useCallback(
    (id: string) => {
      setDetailId(null);
      setSelectedId(id);
      flyTo(id);
    },
    [flyTo],
  );

  const inResults = (id: string | null) => (id && results.some((p) => p.id === id) ? id : null);
  const activeSelectedId = inResults(selectedId);
  // Details close on their own if a filter change removes the listing from the results.
  const detail = results.find((p) => p.id === detailId) ?? (detailOutsideResults && detailId ? (all.get(detailId) ?? null) : null);

  return {
    selectedId: activeSelectedId,
    selected: results.find((p) => p.id === activeSelectedId) ?? null,
    hoveredId,
    setHoveredId,
    flyTarget,
    detail,
    activate,
    selectFromMap,
    openDetails,
    openSavedDetails,
    showOnMap,
    clearSelection: () => setSelectedId(null),
    closeDetails: () => setDetailId(null),
  };
}
