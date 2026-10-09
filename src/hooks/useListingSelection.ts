import { useCallback, useState } from 'react';
import type { FlyTarget } from '../components/PropertyMap';
import type { Property } from '../types/property';

/**
 * Selection, hover and detail state shared by the list, the map and the search box.
 * - `activate` (card click/Enter/Space): selects and flies the map there; on an already-selected card it opens details.
 * - `selectFromMap` (marker click): selects without moving the map.
 * - `openDetails`: selects, flies the map and opens the detail drawer.
 * A selection or detail view whose listing is filtered out is dropped.
 */
export function useListingSelection(results: Property[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);

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
    },
    [flyTo],
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
  const detail = results.find((p) => p.id === detailId) ?? null;

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
    showOnMap,
    clearSelection: () => setSelectedId(null),
    closeDetails: () => setDetailId(null),
  };
}
