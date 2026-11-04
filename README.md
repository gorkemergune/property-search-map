# Property Search With Map & Filters

A frontend proof of concept built for the Iceberg X R&D internship. It is a standalone property search page with a filter panel, a list of property cards and an interactive map, all running on mock data. Users can filter by location, price range, property type, bedroom count and listing status. Selecting a card highlights its marker on the map, and selecting a marker highlights its card in the list.

## evara redesign (Nov 2026)

The app now follows the `example.html` design (Plus Jakarta Sans, Material Symbols, warm terracotta + teal palette) and is search-first:

- **Discover page** — one large natural-language search box, example searches (Tube, Outstanding schools, hospital, student house, garden & pets, home office), city chips with live counts, *Recommended for you* and *Most viewed this week*.
- **Natural-language search** (`src/lib/nlSearch.ts`) — a sentence such as *"2 bed flat in Hackney near the tube with a garden under £2,500 pcm"* becomes hard filters (rent/buy, budget, bedrooms, city, type) plus ranking criteria (near Tube/school/hospital/GP/park/university, garden, pets, bills, quiet …). Results are split into full and close matches, each card says **why it matched** (or what it is missing), and an empty search offers relaxations with real counts. Runs in the browser; no model call.
- **Listing keywords & insights** (`src/lib/insights.ts`) — every listing gets keyword tags, walking times to transport / schools (Ofsted in England) / GP / hospital / park, area scores, popularity, value vs. similar homes (computed from the dataset), a keyword-based summary and sample community comments.
- **Personal recommendations** (`src/lib/recommend.ts`) — saved homes (×3) and viewed homes (×1) build a private, on-device profile. The basket shows what saved homes have in common and suggests similar homes; search results get a *For you* badge.
- **Live data** (`src/lib/live.ts`) — the detail view checks postcodes.io (postcode, ward) and OpenStreetMap Overpass (named schools, hospitals, GPs, stations, parks). Both are free and need no key.

### Demo vs. real data

Walking times, school ratings, popularity counts and community comments are **deterministic demo estimates** and are labelled as such in the UI. Value comparisons are computed from the listing dataset. Live sections show real data when the free services answer.

### Connecting HomeData (free API key)

1. Create a free account at <https://homedata.co.uk> with the company email and create an API key.
2. `cp .env.example .env.local` and set `HOMEDATA_API_KEY=…` and `VITE_HOMEDATA_ENABLED=true`.
3. `npm run dev`. The Vite dev server proxies `/api/homedata/*` to `https://api.homedata.co.uk` and adds `Authorization: Api-Key …`, so the key never reaches the browser bundle. Schools with Ofsted ratings (`/schools/nearby?postcode=…`) then appear in each listing's *Live check*.

For a deployed build the same `/api/homedata` path needs a tiny serverless proxy (e.g. Cloudflare Worker / Vercel function) holding the key.

## Mission deliverables

- [ ] Mock property dataset (image, price, address, type, bedrooms, status, coordinates)
- [ ] Filter panel: location, price range, property type, bedrooms, listing status
- [ ] Property cards list driven by the filtered data
- [ ] Interactive map with one marker per filtered property
- [ ] Card → marker highlight
- [ ] Marker → card highlight
- [ ] Empty state, result count and reset
- [ ] Responsive layout (desktop, tablet, mobile)
- [ ] Deploy (Vercel, pending mentor confirmation)

Full brief: [docs/mission.md](docs/mission.md)

## Chosen stack

| Area | Choice |
|---|---|
| Framework | React + TypeScript, built with Vite |
| Styling | Tailwind CSS |
| Map | Leaflet 1.9.x + react-leaflet 5 (needs React 19) |
| Tiles | OpenStreetMap standard tiles in development; CARTO basemaps optional (needs a free API key) |
| State | `useState` for filters, selected and hovered property; `filteredProperties` derived with `useMemo` (no global store) |

The reasons for these choices are in the [research report](reports/research-report.en.md#2-map-technology).

## Planned folder structure

The app has not been scaffolded yet. Planned layout:

```
src/
  components/   # FilterPanel, PropertyList, PropertyCard, PropertyMap, ...
  data/         # mock properties
  types/        # Property, Filters, ...
  hooks/        # e.g. useFilteredProperties
```

The existing top-level `components/`, `data/` and `feature/` folders only contain `.gitkeep` placeholders. They will be replaced by the `src/` layout when the app is scaffolded.

## Team and task split

| Member | Research sites (from `görev.txt`) |
|---|---|
| Sevde | react-leaflet, Leaflet, OpenStreetMap, CARTO, OnTheMarket |
| Yasemin | Zillow, Rightmove, Zoopla, OpenStreetMap, CARTO, OpenRent |
| Görkem | Airbnb, Sahibinden, react-leaflet, Leaflet |

Implementation tasks (owners to be assigned):

| Task | Branch |
|---|---|
| Filter panel and filtering logic | `feature/filters` |
| Property cards and list | `feature/cards` |
| Map, markers and card ↔ marker sync | `feature/map` |

## Branch convention

- `main` holds reviewed, working code only.
- Work happens on feature branches: `feature/filters`, `feature/cards`, `feature/map` (more `feature/<name>` branches as needed).
- Open a pull request into `main`; merge after review.

## Docs and reports

- [Mission](docs/mission.md)
- [Architecture notes](docs/architecture.md)
- [Research report (English)](reports/research-report.en.md)
- [Araştırma raporu (Türkçe)](reports/research-report.tr.md)

## License

[Apache License 2.0](LICENSE)
