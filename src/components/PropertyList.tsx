import { useEffect } from 'react';
import { t } from '../i18n/en';
import type { AreaUnit, Property } from '../types/property';
import { PropertyCard } from './PropertyCard';

interface Props {
  properties: Property[];
  selectedId: string | null;
  hoveredId: string | null;
  areaUnit: AreaUnit;
  onActivate: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onHover: (id: string | null) => void;
  onClearFilters: () => void;
}

export function PropertyList({
  properties,
  selectedId,
  hoveredId,
  areaUnit,
  onActivate,
  onOpenDetails,
  onHover,
  onClearFilters,
}: Props) {
  // Bring the selected card into view (e.g. after a marker click).
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`card-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-start border-t border-line py-14">
        <h2 className="font-serif text-[28px] leading-tight text-ink">{t.empty.title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t.empty.body}</p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-6 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink-soft"
        >
          {t.empty.action}
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
        {properties.map((p) => (
          <li key={p.id}>
            <PropertyCard
              property={p}
              selected={p.id === selectedId}
              hovered={p.id === hoveredId}
              areaUnit={areaUnit}
              onActivate={onActivate}
              onOpenDetails={onOpenDetails}
              onHover={onHover}
            />
          </li>
        ))}
      </ul>
      <p className="mt-12 max-w-xl border-t border-line pt-4 text-xs leading-relaxed text-faint">{t.demoFootnote}</p>
    </>
  );
}
