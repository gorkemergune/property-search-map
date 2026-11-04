import { Symbol } from './ui/Symbol';

export type Screen = 'home' | 'results';

interface Props {
  screen: Screen;
  onHome: () => void;
  onBrowse: () => void;
  savedCount: number;
  onOpenSaved: () => void;
  onAddListing: () => void;
}

/** Fixed top bar from the evara design: brand, primary navigation and the saved-homes basket. */
export function TopNav({ screen, onHome, onBrowse, savedCount, onOpenSaved, onAddListing }: Props) {
  const link = (active: boolean) =>
    `text-sm transition-colors ${active ? 'font-semibold text-primary' : 'font-semibold text-on-surface-variant hover:text-on-surface'}`;
  return (
    <header className="fixed top-0 z-[1200] w-full bg-white/85 shadow-[0_1px_0_rgba(16,40,28,0.06)] backdrop-blur-xl">
      <div className="flex h-16 w-full items-center justify-between px-5 md:h-20 md:px-8 lg:px-16">
        <button type="button" onClick={onHome} className="flex items-center gap-2.5" aria-label="Home">
          <span className="bg-garden grid h-8 w-8 place-items-center rounded-xl text-white shadow-sm">
            <Symbol name="roofing" size={20} />
          </span>
          <span className="hidden rounded-full bg-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant sm:inline">UK · demo</span>
        </button>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          <button type="button" onClick={onHome} aria-current={screen === 'home' ? 'page' : undefined} className={link(screen === 'home')}>
            Discover
          </button>
          <button type="button" onClick={onBrowse} aria-current={screen === 'results' ? 'page' : undefined} className={link(screen === 'results')}>
            Map search
          </button>
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-add-listing-trigger
            onClick={onAddListing}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-primary ring-1 ring-primary-container/40 transition-colors hover:bg-primary-fixed/60 sm:px-4"
          >
            <Symbol name="add_home" size={18} />
            <span className="hidden sm:inline">Add listing</span>
          </button>
          <button
            type="button"
            data-saved-trigger
            onClick={onOpenSaved}
            className="bg-garden inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition-[filter] hover:brightness-110"
          >
            <Symbol name="favorite" size={18} filled={savedCount > 0} />
            <span>Saved</span>
            <span className="rounded-full bg-white/25 px-1.5 text-xs tabular">{savedCount}</span>
          </button>
          <button type="button" onClick={onBrowse} className="grid h-9 w-9 place-items-center rounded-full bg-surface-container text-on-surface md:hidden" aria-label="Map search">
            <Symbol name="map" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
