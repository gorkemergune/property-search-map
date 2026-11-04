import { useMemo, type ReactNode } from 'react';
import { getInsights } from '../lib/insights';
import type { Recommendation, Trait } from '../lib/recommend';
import type { AreaUnit, Property } from '../types/property';
import { ResultCard } from './ResultCard';
import { SearchIsland } from './SearchIsland';
import { Symbol } from './ui/Symbol';
import heroImage from '../assets/ev-hero.webp';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string) => void;
  properties: readonly Property[];
  recommendations: Recommendation[];
  traits: Trait[];
  recentSearches: string[];
  onClearRecent: () => void;
  areaUnit: AreaUnit;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  onOpen: (id: string) => void;
  viewed: ReadonlySet<string>;
  onBrowseAll: () => void;
}

/** "Example searches" chips: what people actually ask for in the UK. */
const EXAMPLES: { icon: string; label: string; query: string; tone: string }[] = [
  { icon: 'directions_subway', label: 'Near the Tube', query: '1 bed flat in London near the tube under £2,200 pcm', tone: 'text-secondary' },
  { icon: 'school', label: 'Outstanding schools', query: 'Family house with a garden near an outstanding school', tone: 'text-primary' },
  { icon: 'local_hospital', label: 'Close to a hospital', query: '2 bed flat to rent near a hospital and a GP, step free', tone: 'text-error' },
  { icon: 'backpack', label: 'Student house', query: 'Student house share near university, bills included', tone: 'text-tertiary' },
  { icon: 'pets', label: 'Garden & pets', query: 'Pet friendly home with a garden on a quiet street to rent', tone: 'text-primary-container' },
  { icon: 'laptop_mac', label: 'Home office', query: 'Bright 2 bed with a home office near a park', tone: 'text-tertiary' },
];

/** City chips: one-tap explore, with live counts. */
const FEATURED_CITIES = ['London', 'Manchester', 'Edinburgh', 'Bristol', 'Birmingham', 'Leeds', 'Liverpool', 'Brighton', 'Oxford', 'Cambridge', 'Glasgow', 'Cardiff'];

export function Home(props: Props) {
  const { query, onQueryChange, onSearch, properties, recommendations, traits, recentSearches, onClearRecent, areaUnit, isSaved, onToggleSave, onOpen, viewed, onBrowseAll } = props;

  const cityCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of properties) if (p.status === 'available') m.set(p.city, (m.get(p.city) ?? 0) + 1);
    return m;
  }, [properties]);

  const trending = useMemo(
    () =>
      [...properties]
        .filter((p) => p.status === 'available')
        .sort((a, b) => getInsights(b).popularity.viewsWeek - getInsights(a).popularity.viewsWeek)
        .filter((p, i, arr) => arr.findIndex((x) => x.city === p.city) === i || i < 3)
        .slice(0, 6),
    [properties],
  );

  const cardProps = (p: Property) => ({ property: p, areaUnit, saved: isSaved(p.id), onToggleSave, onOpen, viewed: viewed.has(p.id) });

  return (
    <div className="flex w-full flex-col">
      {/* Hero */}
      <div className="relative -mt-16 w-full overflow-hidden pt-16 md:-mt-20 md:pt-20">
        {/* Background photo (ev.png), washed out so the headline and search stay readable. */}
        <img src={heroImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[70%_center] opacity-45" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fde7d6]/60 via-[#fdf3e6]/45 to-surface" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(253_246_236/0.75)_0%,rgb(253_246_236/0.25)_55%,transparent_80%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-fixed-dim/40 blur-3xl" />
        <section className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pb-14 pt-12 md:px-8 lg:px-16 lg:pb-20 lg:pt-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1 shadow-sm ring-1 ring-primary-fixed-dim/60 backdrop-blur-md">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary-container" />
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Natural-language home search · UK</span>
          </div>
          <h1 className="max-w-4xl text-center text-4xl font-bold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-[56px] lg:leading-[64px]">
            What kind of home <span className="text-sunset font-serif font-normal italic">are you dreaming of?</span>
          </h1>
          <p className="mb-10 mt-4 max-w-2xl text-center text-lg font-medium leading-7 text-on-surface-variant">
            Describe it the way you'd tell a friend. We read every listing's keywords plus nearby schools, hospitals and transport, and explain why each home matches.
          </p>

          <div className="relative w-full max-w-4xl">
            <SearchIsland value={query} onChange={onQueryChange} onSubmit={onSearch} autoFocus />
            <p className="mt-3 text-center text-[11px] font-medium text-on-surface-variant">
              Tip: mention a city or area, bedrooms, a budget ("under £450k" or "£1,800 pcm") and what matters — Tube, schools, hospital, garden, pets…
            </p>

            {recentSearches.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                  <Symbol name="history" size={16} /> Recent:
                </span>
                {recentSearches.slice(0, 4).map((q) => (
                  <button key={q} type="button" onClick={() => onSearch(q)} className="max-w-[260px] truncate rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-on-surface backdrop-blur hover:bg-white">
                    {q}
                  </button>
                ))}
                <button type="button" onClick={onClearRecent} className="text-xs font-medium text-outline underline-offset-2 hover:underline">
                  Clear
                </button>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <span className="mr-1 text-xs font-semibold text-on-surface-variant">Example searches:</span>
              {EXAMPLES.map((ex) => (
                <Chip key={ex.label} onClick={() => onSearch(ex.query)} title={ex.query}>
                  <Symbol name={ex.icon} size={16} className={ex.tone} />
                  <span>{ex.label}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
              <span className="mr-1 text-xs font-semibold text-on-surface-variant">Explore cities:</span>
              {FEATURED_CITIES.filter((c) => cityCounts.has(c)).map((c) => (
                <Chip key={c} onClick={() => onSearch(`Homes in ${c}`)}>
                  <Symbol name="location_city" size={16} className="text-secondary" />
                  <span>{c}</span>
                  <span className="font-normal text-outline tabular">{cityCounts.get(c)}</span>
                </Chip>
              ))}
              <Chip onClick={onBrowseAll}>
                <Symbol name="map" size={16} className="text-primary" />
                <span>All {cityCounts.size} cities on the map</span>
              </Chip>
            </div>
          </div>
        </section>
      </div>

      {/* For you */}
      <section className="mx-auto w-full max-w-[1440px] px-5 py-10 md:px-8 lg:px-16" aria-labelledby="for-you">
        <SectionHead
          eyebrow={{ icon: 'person_heart', text: 'Personal picks' }}
          id="for-you"
          title={recommendations.length ? 'Recommended for you' : 'Your recommendations live here'}
          body={
            recommendations.length
              ? 'Based on the homes you saved and viewed on this device. Nothing leaves your browser.'
              : 'Save or open a few homes and we will learn what you like — bedrooms, budget, area, Tube or schools — and suggest similar ones.'
          }
        />
        {traits.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Your saved homes have in common:</span>
            {traits.map((t) => (
              <span key={t.label} className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/70 px-3 py-1 text-xs font-semibold text-on-secondary-fixed">
                <Symbol name={t.icon} size={14} />
                {t.label}
                <span className="font-normal opacity-70">
                  {t.count}/{t.total}
                </span>
              </span>
            ))}
          </div>
        )}
        {recommendations.length > 0 ? (
          <Carousel>
            {recommendations.map((r) => (
              <ResultCard key={r.property.id} {...cardProps(r.property)} compact why={r.reasons.join(' · ')} badge={{ label: `${Math.round(r.score * 100)}% match`, icon: 'person_heart' }} />
            ))}
          </Carousel>
        ) : (
          <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-primary-fixed/60 via-surface-lowest to-secondary-fixed/50 p-6 shadow-card ring-1 ring-primary-fixed-dim/40">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-fixed/50 text-primary">
              <Symbol name="favorite" size={26} />
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Tap the <Symbol name="favorite" size={16} className="align-[-3px] text-primary" /> on any home below to start. Two or three saves are enough.
            </p>
          </div>
        )}
      </section>

      {/* Trending */}
      <section className="mx-auto w-full max-w-[1440px] px-5 pb-12 md:px-8 lg:px-16" aria-labelledby="trending">
        <SectionHead
          eyebrow={{ icon: 'local_fire_department', text: 'Popular this week' }}
          id="trending"
          title="Most viewed homes right now"
          body="Ranked by views, saves and enquiries this week. Popularity figures are demo estimates."
          action={
            <button type="button" onClick={onBrowseAll} className="bg-sunset inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition-[filter] hover:brightness-110">
              Browse all on the map <Symbol name="arrow_forward" size={16} />
            </button>
          }
        />
        <Carousel>
          {trending.map((p) => {
            const pop = getInsights(p).popularity;
            return <ResultCard key={p.id} {...cardProps(p)} compact why={`${pop.saves} saves · ${pop.enquiries} enquiries · views ${pop.trend >= 0 ? '+' : ''}${pop.trend}% vs last week`} />;
          })}
        </Carousel>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="w-full bg-gradient-to-br from-secondary-fixed/60 via-surface-low/70 to-primary-fixed/50 px-5 py-16 md:px-8 lg:px-16">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-12 max-w-2xl">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Beyond traditional filters</div>
            <h2 className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">Why search in sentences instead of filling in forms?</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Bento icon="format_quote" tone="bg-secondary-fixed/50 text-secondary" title="Reads listing keywords" foot="Keyword index per listing" footTone="text-secondary" footIcon="check">
              “Bills included”, “pets considered”, “chain free”, “EPC B” — details that hide in descriptions become searchable keywords on every listing.
            </Bento>
            <Bento icon="route" tone="bg-primary-fixed text-primary" title="Real walking distance to what matters" foot="Schools · hospitals · Tube" footTone="text-primary" footIcon="pin_drop">
              For UK buyers, a good school catchment, a nearby hospital and the Tube matter as much as the flat itself. Every home is tagged with them; the detail view checks live OpenStreetMap data.
            </Bento>
            <Bento icon="person_heart" tone="bg-tertiary-fixed text-on-tertiary-fixed" title="Learns what you like" foot="Private, on this device" footTone="text-on-tertiary-fixed" footIcon="lock">
              Your saved homes reveal patterns — same bedrooms, same area, always near a station. We surface them and recommend homes that share them, with the reason.
            </Bento>
          </div>
        </div>
      </section>
    </div>
  );
}

function Chip({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-on-surface shadow-sm ring-1 ring-primary-fixed-dim/40 backdrop-blur transition-all hover:-translate-y-px hover:bg-white hover:shadow-md hover:ring-primary-fixed-dim"
    >
      {children}
    </button>
  );
}

function SectionHead({ eyebrow, id, title, body, action }: { eyebrow: { icon: string; text: string }; id: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Symbol name={eyebrow.icon} size={20} className="text-secondary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{eyebrow.text}</span>
        </div>
        <h2 id={id} className="text-2xl font-semibold tracking-tight text-on-surface sm:text-[32px] sm:leading-10">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">{body}</p>
      </div>
      {action}
    </div>
  );
}

function Carousel({ children }: { children: ReactNode }) {
  return <div className="scroll-quiet -mx-5 flex snap-x gap-6 overflow-x-auto px-5 pb-4 md:mx-0 md:px-0">{children}</div>;
}

function Bento({ icon, tone, title, children, foot, footTone, footIcon }: { icon: string; tone: string; title: string; children: ReactNode; foot: string; footTone: string; footIcon: string }) {
  return (
    <div className="flex flex-col justify-between rounded-3xl bg-surface-lowest/90 p-8 shadow-card ring-1 ring-white/60 transition-shadow hover:shadow-card-hover">
      <div>
        <div className={`mb-6 grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
          <Symbol name={icon} size={28} />
        </div>
        <h3 className="mb-3 text-xl font-semibold text-on-surface">{title}</h3>
        <p className="text-sm leading-relaxed text-on-surface-variant">{children}</p>
      </div>
      <div className={`mt-8 flex items-center gap-2 pt-4 text-xs font-semibold ${footTone}`}>
        <Symbol name={footIcon} size={16} />
        <span>{foot}</span>
      </div>
    </div>
  );
}
