# Research Report: Property Search With Map & Filters

- **Project:** Iceberg X R&D internship, "Property Search With Map & Filters" (frontend POC)
- **Date:** 2026-10-07
- **Turkish version:** [research-report.tr.md](research-report.tr.md)

**Method.** Raw HTML and JavaScript bundles were downloaded with `curl` (desktop and iPhone user agents). Map libraries were identified from script tags, embedded page data (`__NEXT_DATA__`) and library code inside the bundles. WebFetch and web search filled some gaps. Library versions were read from the npm registry. **Update (same day): Playwright 1.49.1 checks.** Each site's map search page was opened in headless Chromium at desktop 1440×900, phone 390×844 (iPhone 13 profile) and tablet 820×1180 (iPad Pro 11 profile), plus Firefox and WebKit at desktop size. These are **emulated viewports in headless browsers, not real devices**. At most 5–8 page loads per site. Only "reject/essential only" cookie buttons were clicked. No login, no captcha solving, and no retry after a block. Screenshots are in `docs/presentation/shots/` (git-ignored).

---

## 1. Summary

- **Big portals use Google Maps; the one Leaflet site is OpenRent.** Rightmove and OnTheMarket use Google Maps through `@vis.gl/react-google-maps` with `AdvancedMarkerElement`. Zillow, Airbnb and Zoopla load the Google Maps JS API (confirmed at runtime with Playwright). OpenRent uses Leaflet 1.5.1 + `leaflet.markercluster` with MapTiler raster tiles. → Leaflet is a proven choice for this kind of UI, and it needs no API key.
- **Recommendation: Leaflet 1.9.4 + react-leaflet 5.0.0.** react-leaflet 5 **requires React 19**. Its license is **Hippocratic-2.1** (not an OSI license); flag this to the mentor. Leaflet 2.0 is still alpha, so stay on 1.9.x.
- **CARTO is a GIS/location-intelligence platform, not a filtering tool.** For us its only use is free basemap tiles. CARTO basemaps **now need an API key** (without one, tiles show an "API key required" watermark). Attribution "© OpenStreetMap contributors, © CARTO" is mandatory.
- **OSM's own tiles (`tile.openstreetmap.org`) are fine for a low-traffic POC**, with visible attribution. There is no SLA, and bulk/offline prefetch is forbidden. Keep the tile URL in config so we can switch providers.
- **The price filter always depends on the listing mode.** Sale = total price with preset steps. Rent = per month, with an optional per-week toggle (OpenRent, Zoopla) or "monthly payment" (Zillow). Airbnb = total price for N nights. Every site that has min/max blocks min > max.
- **The common highlight vocabulary is small:** one recency/price-change badge ("Added today", "Reduced", "Price cut"), one paid-placement badge ("Featured", "Premium", "Spotlight", "Showcase"), a status (Under offer / Let agreed / Sold STC), and media counts (photos, 3D tour, floorplan).
- **Map ↔ list sync in practice:** Rightmove tracks `hover`, `selected` and `visited` states on price pins and clusters. OpenRent highlights the map marker when a list card is hovered. Rightmove has a "Search this area" button after the map moves; Airbnb and Zillow send map bounds as search params.
- **POC decision:** a filter bar (location text, price min/max presets, type, beds "N+", status) with instant apply on desktop, a modal with an "Apply / Show N results" button on mobile, active-filter chips + "Clear all", price-bubble markers (`L.divIcon`), and a hover/selected sync between cards and markers.

---

## 2. Map technology

### 2.1 Library comparison

| | **Leaflet + react-leaflet** | **MapLibre GL JS** (+ react-map-gl) | **Mapbox GL JS** (+ react-map-gl) | **Google Maps JS** (+ @vis.gl/react-google-maps) |
|---|---|---|---|---|
| Latest version (npm, 2026-10-07) | leaflet 1.9.4 (2023-05-18), 2.0.0-alpha.1; react-leaflet 5.0.0 | maplibre-gl 6.13.0; react-map-gl 8.1.3 | mapbox-gl 3.32.0 | @vis.gl/react-google-maps 1.10.1 |
| License | Leaflet BSD-2-Clause; **react-leaflet Hippocratic-2.1** | BSD-3-Clause | **Proprietary** (Mapbox TOS, v2+), needs an active Mapbox account | Proprietary service; wrapper is MIT |
| API key / account | None (the tile provider may need one) | None for the library; depends on the tile/style source | Access token + Mapbox account | API key. A no-billing "Maps Demo Key" exists for prototyping; production needs billing |
| Cost | Free library; tiles free within provider limits | Free library | Free up to 50,000 map loads/month, then $5.00 per 1,000 (50,001–100,000) | 10,000 free billable events/month for Dynamic Maps, then $7.00 per 1,000 (up to 100,000) |
| Rendering | DOM/SVG/Canvas, raster tiles | WebGL, vector tiles | WebGL, vector tiles | Google-rendered vector/raster |
| React integration | `MapContainer`, `Marker`, `Popup`, `useMap`; types via `@types/leaflet` | `react-map-gl/maplibre` | `react-map-gl/mapbox` | `APIProvider`, `Map`, `AdvancedMarker` (used by Rightmove/OTM) |
| Clustering | `react-leaflet-cluster` 4.1.3 (peer: react-leaflet ^5, React ^19) or `leaflet.markercluster` | Built-in GeoJSON source clustering, or `supercluster` | Same as MapLibre | `@googlemaps/markerclusterer` or `supercluster` (Rightmove-style) |
| Custom HTML markers (price bubbles) | Easy: `L.divIcon` with HTML/CSS | Possible (`Marker` with HTML); thousands of HTML markers get slow | Same as MapLibre | `AdvancedMarker` with React children |
| Performance | Good for hundreds of DOM markers; thousands need clustering | Best for large datasets (GPU) | Best for large datasets (GPU) | Good; vendor managed |
| Fit for our POC | **Best:** no key, simplest API, matches the brief | Good alternative if we need vector styling | Not worth it: token + proprietary license | Not worth it: key + billing, vendor lock-in |

Evidence: npm registry (versions, licenses, peer deps). Mapbox license text from `mapbox-gl@3.32.0/LICENSE.txt`. Pricing from mapbox.com/pricing and Google's pricing page. API key rules from Google's "get API key" page.

### 2.2 Recommendation

**Leaflet 1.9.4 + react-leaflet 5.0.0** (+ `@types/leaflet`). Add `react-leaflet-cluster` only if the mock data grows beyond what renders cleanly. We did not measure that threshold.

Caveats to confirm:
- react-leaflet 5 peer-depends on **React ^19**. Scaffold Vite with React 19, not 18.
- react-leaflet's **Hippocratic-2.1** license adds human-rights conditions and is not OSI-approved. Probably fine for an internal POC, but the mentor should decide.
- The leafletjs.com homepage now features **2.0.0-alpha.1** (ESM API, `new TileLayer(...)`). npm `latest` is still 1.9.4, and react-leaflet requires `leaflet ^1.9.0`. Use 1.9.4.
- Leaflet's CSS must be imported, and default marker icons need bundler-friendly paths. This is a known issue; we avoid it by using `divIcon`.

### 2.3 Tile providers and attribution

| Provider | Key | Free limits | Required attribution | Notes |
|---|---|---|---|---|
| OSM standard (`tile.openstreetmap.org`) | No | No numeric limit; "heavy use" can be blocked without notice | "© OpenStreetMap contributors" + link to osm.org/copyright, visible on the map, not hidden behind UI | No SLA. No bulk/pre-emptive/offline fetching. Do not send `no-cache` headers. Send a valid Referer (do not set a restrictive `Referrer-Policy`). Fine for a POC |
| CARTO basemaps (`basemaps.cartocdn.com`) | **Yes** (free, "no account, in your inbox in a minute") | Non-commercial: up to 5M requests/month. Commercial: free up to 1M/month. Paid: $500/month (10M) | "© OpenStreetMap contributors, © CARTO" on every map | Without a key, a watermark "API key required". Keys registered before 2026-09-23 keep working until 2026-11-30. Terms version 2026-09-29. Voyager confirmed on the key page; Positron/Dark Matter not confirmed there |
| MapTiler (used by OpenRent) | Yes | Not checked | OSM + MapTiler | Not researched further |

**What CARTO is:** it describes itself as "The Agentic GIS Platform": spatial analytics, data-warehouse-native apps, deck.gl visualization. It provides **no frontend filter component**. For us, its only relevance is the basemap tiles (a cleaner, low-contrast style that lets price markers stand out).

**Decision:** in development, use the OSM standard tiles with attribution. Keep the tile URL and attribution in one config file (`src/config/map.ts`). If the mentor wants the CARTO look, get a free key and store it in `VITE_CARTO_KEY`. Never hide the attribution control (OpenRent hides `.leaflet-control-attribution` in its mobile card view; do not copy that).

---

## 3. Per-site analysis

### 3.1 OnTheMarket (onthemarket.com)
1. **Highlights:** each card has one `main-label` ("Added today", "Reduced today", "Spotlight Property", "3D tour"). Flags: `premium?`, `exclusive?`, `spotlight?`, `matterport-virtual-tour?`. Icon labels ("Greener choice", "Accessible features"). A price qualifier next to the price ("Guide price", "Offers over", "Offers in excess of", "Shared ownership"). A `short-price` field ("£475k") exists. Map markers on the map-only view are **plain grey pins without prices** (screenshot). Hover/selected marker visuals *not verified*.
2. **Map:** Google Maps. Evidence: `preconnect` to maps.googleapis.com, `google.maps.*` calls, and the `@vis.gl/react-google-maps` wrapper (`APIProvider`, `AdvancedMarkerElement`) in a lazy chunk. Polygon "Drawn area" search exists. No clustering code found in the chunks inspected. Marker shape *not verified*.
3. **Price filter:** preset steps from `formData.price-ranges`: £10k steps up to £250k, £25k to £500k, £50k to £1M, £100k to £2.5M, then larger steps. Each step carries a `percent` value, i.e. a distribution/histogram of listings. Rent uses `priceFrequency: "pcm"`. GBP.
4. **Devices (Playwright, emulated):** map-only view → full-width map with a "List" button on desktop, phone and tablet. On phone the filters collapse into a search field + icon button, with a floating "Create alert". Firefox and WebKit: same layout (same map size and position). A cookie panel appears on first load.
5. **Filters:** radius, price, bedrooms min/max, property type, size, "Include under offer/sold STC", let agreed, recently added/reduced, new homes, retirement, shared ownership, auction, pet friendly, accessible, greener choice, furnished, let length, tenure. Sort default `recommended` with `exclusiveFirst: true`. "Clear all" present. "Map view" toggle text present.

### 3.2 Zillow (zillow.com)
1. **Highlights:** one "flex" badge per card, chosen by priority: "Showcase" (paid, 18 of 41 cards in Austin), recency ("3 hours ago"), "Price cut: $3,000 (9/17)", "Open: Sat 2-4pm", "3D Tour", "Zillow Preview", or a short feature phrase ("Sparkling pool"). Status text ("Active", "Pending", "Accepting backup offers").
2. **Map:** Google Maps JS API v3.65 (`<script data-testid="google-map-script-src" ...libraries=places,geometry>`) plus Google Static Maps images. Query state holds `mapBounds` and `isMapVisible`. Playwright (Chromium) confirmed `google.maps` 3.65 at runtime. Marker style *not verified*: a bot check appeared before any markers rendered.
3. **Price filter:** two modes. `price`: list price, presets in $50k steps up to $1M, then larger steps up to $18M. `monthlyPayment`: presets $200 steps, with down payment/rate/term/credit score inputs. Labels: "$X+", "Up to $Y", "$X-$Y". USD.
4. **Devices:** **blocked.** curl with iPhone UA → 403. Playwright Chromium desktop → a "Before we continue… Press & Hold" bot check over the page (map and list visible underneath). Per our rules, no further loads: phone, tablet, Firefox and WebKit *not verified*.
5. **Filters:** 111 filter definitions: price, monthly payment, beds ("Any/1+…5+" or exact incl. "Studio"), baths, home type, status, sqft, lot size, year built, HOA, days on Zillow, keywords, schools, commute time, many rental amenities. Sort: "Homes for You" (default), Newest, Price ↑/↓, Payment ↑/↓, Bedrooms, Bathrooms, Square Feet, Lot Size, and more. `exposedPillEnabled` flags suggest some filters show as top-bar pills.

### 3.3 Rightmove (rightmove.co.uk)
1. **Highlights:** `addedOrReduced` ("Added today", "Added on 05/10/2026", "Reduced on 15/04/2026"). `premiumListing` (8/25), `featuredProperty` (heading "Featured New Home"). `productLabel` spotlight text ("Incentives Available"). Lozenges (`NEW_HOME`). Status strings "Under Offer", "Sold STC", "Let Agreed". Media counts (`numberOfImages`, `numberOfFloorplans`, `numberOfVirtualTours`). Price qualifier and "POA".
2. **Map:** Google Maps via `@vis.gl/react-google-maps` (error strings link to github.com/visgl/react-google-maps), `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `AdvancedMarkerElement`. **Price pins** (`pricePin`: abbreviated sale price, "pcm" suffix for rent). **Cluster pins** with a count ("Cluster with N properties") from a supercluster-style API (`cluster_id`, `point_count_abbreviated`, `getLeaves`). CSS states `visitedPin`, `selectedPin`, a hover z-index boost (1001 vs 1000), and a saved-heart icon inside the pin. **"Search this area"** button at top center after the map moves. Editable drawn areas (feature switch `EDITABLE_AREAS_ENABLED`).
3. **Price filter:** sale = total GBP. Rent defaults to `priceType: "pcm"`. Exact preset values *not verified* (the filter UI chunk was not in the bundles downloaded).
4. **Devices (Playwright, emulated):** map view is a full-screen map with price pins on desktop, phone and tablet, plus a "List view" / "List" button. On phone the filters collapse into an icon button, and "Create alert" becomes an icon. 96 price markers rendered in every run. Firefox and WebKit: same layout.
5. **Filters:** location + radius, price, beds, property types, tenure, must-have, don't-show (incl. auction), furnish types, keywords, bathrooms, move-in-by date, sort. Separate list (`find.html`) and map (`map.html`) routes.

### 3.4 Airbnb (airbnb.com.tr)
1. **Highlights:** badges "Misafirlerin favorisi" (Guest favourite, 24 in results) and "Süper Ev Sahibi" (Superhost). Price shows `originalPrice` vs `discountedPrice` (strike-through pattern). Hover/selected visuals *not verified*.
2. **Map:** Google Maps JS API v3.36 (`google_maps_url` in page config, `client=gme-airbnbinc`, `libraries=places`). `AdvancedMarker` strings present. Search params include map bounds (`ne_lat`, `ne_lng`, `sw_lat`, `sw_lng`) and `search_by_map`. Map markers are **rounded price pills** ("₺8.901"), confirmed by screenshot in all runs. Runtime `google.maps` version was 3.63 (the config URL requests `v=3.36`).
3. **Price filter:** slider ("Fiyat aralığı") with a **histogram** (`priceHistogram` array), min ₺2.500 to max ₺63.000. Subtitle "Tüm ücretler dâhil seyahat fiyatı" = total trip price incl. fees, for `price_filter_num_nights: 5`. So the price depends on dates/nights and currency (TRY).
4. **Devices (Playwright, emulated):** desktop → list on the left, map on the right. Phone → **map first**, list in a bottom sheet. Tablet → **list only**, with a floating "Haritayı göster" (Show map) button. Firefox and WebKit: same desktop layout. A one-time "all fees included" notice covers part of each first load.
5. **Filters:** `clearAllFilterKeys` lists price, room types, bedrooms, beds, bathrooms, guest favourite, instant book, amenities, pets, property type, host languages, neighbourhoods, accessibility features. "All filters" button with a count → modal pattern.

### 3.5 Sahibinden (sahibinden.com)
- **Blocked.** `curl` and WebFetch both got HTTP 403 with a Cloudflare challenge ("Just a moment...").
- Only source: the official iOS app description ("sahibinden.com Emlak"): you can select a region on the map and see listings in that area, and narrow results by criteria.
- Points 1–5 (highlights, map tech, price filter, devices, filter UX): **not verified**. Needs a manual check in a real browser.

### 3.6 OpenRent (openrent.co.uk)
1. **Highlights:** price large and coloured (`fs-4 fw-medium text-primary`), with monthly and weekly variants. A price badge over the photo. "Last updated around N days ago". Badges such as "Furnished", "N Bed", "N Bath". **Hovering a list card highlights the marker** (`mouseover .ltc → searchmappingjs.highLightProperty`).
2. **Map:** **Leaflet 1.5.1** + `leaflet.markercluster` 1.4.0 + `leaflet.fullscreen` + `Leaflet.Editable` (drawing). Tiles: **MapTiler raster** with attribution "© OpenStreetMap, © MapTiler". `L.divIcon` markers. `markerClusterGroup({chunkedLoading:true, maxClusterRadius:60})`.
3. **Price filter:** **per month / per week toggle** ("Show Rent Per Week"). Min/max **preset dropdowns plus a custom value** (`-1` → text input). Options that would make min > max are **disabled**, with a validation message "Min price must be less than max price". GBP.
4. **Devices:** same URL for both UAs. Code shows a mobile map mode with a horizontal card strip (`#property-dataMobile`, `scrollLeft`) and list/map view switching. It hides the attribution while the strip is open (against OSM policy). **Playwright (emulated):** desktop and tablet → filter panel beside the map, list below. Markers are numbered cluster icons inside a radius circle. Phone → **no map on load**; a "Map View" button, list first. Firefox and WebKit: same layout. `L.version` 1.5.1 confirmed at runtime; tiles from api.maptiler.com.
5. **Filters:** price, beds min/max, baths min/max, type (Houses/Flats/Rooms), furnished, available before, min tenancy, students/families/pets/DSS, bills included, parking, garden, fireplace, video tour, exclude enquired. Location radius in km **or commute time in minutes**. Sort: Distance, Price ↑, Price ↓, New. **Filter modal uses temporary state + Apply** (`tempFilters` → `applyTempFilters`) and `resetFilters()`. "Create Email Alert". "N properties found".

### 3.7 Zoopla (zoopla.co.uk)
- `curl` got 403 (Cloudflare). WebFetch returned page text without scripts. Playwright Chromium loaded the map page, and Firefox got 403 ("Just a moment...").
1. **Highlights (from page text):** "Property of the week", "Highlight", "Premium", "Just added", "Reduced", "Chain free", "New home"/"New build", "Available Now", "Pets allowed".
2. **Map:** **Google Maps** (`google.maps` 3.66.7 at runtime, "Map data ©2026 Google"). Map view route `/for-sale/map/property/london/` with "Draw", "Layers" and "List view". Marker style *not verified* (a cookie dialog covered the map).
3. **Price filter:** rent shown as "£2,600 pcm (£600 pw)", i.e. both units. Option values *not verified* (only "Any price" seen).
4. **Devices (Playwright, emulated, Chromium only):** map with a "List view" toggle on desktop, phone and tablet. On phone the filters collapse into a "Filters" button. A cookie dialog covered most of each screenshot (not dismissed). Firefox → blocked (403). WebKit not attempted after the block.
5. **Filters/sort:** radius ("This area only", +0.25 … 40 miles), price, beds, property type. Sort: Recommended, Most recent, Highest price, Lowest price, Most reduced. "Save" / "Create alert".

---

## 4. Comparison table

| Site | Map tech (evidence) | Marker style | Price filter | Filter types (main) | Mobile | List↔map sync |
|---|---|---|---|---|---|---|
| OnTheMarket | Google Maps + @vis.gl/react-google-maps (bundle, runtime) | Plain grey pins, no price (screenshot) | Presets £10k→£25k→£50k→£100k steps, histogram %; rent pcm | Radius, price, beds, type, status incl. under offer, recency, tenure, many flags; draw area | Full-screen map + "List" (emulated) | Not verified |
| Zillow | Google Maps JS v3.65 (script tag, runtime) | Not verified (bot check) | Price ($50k presets to $1M, up to $18M) **or** monthly payment ($200 presets) | 111 defs: price, beds N+/exact, baths, type, status, sqft, year, HOA, schools, commute… | Blocked (403 / Press & Hold) | Map bounds in query state; rest not verified |
| Rightmove | Google Maps + @vis.gl/react-google-maps, mapId (bundle) | **Price pins + count clusters**, visited/selected/hover states | Sale total; rent pcm default | Radius, price, beds, type, tenure, must-have/don't-show, furnished, baths, move-in date | Full-screen map + "List" (emulated) | **Hover + selected + visited** states; "Search this area" |
| Airbnb | Google Maps JS (config v3.36, runtime 3.63) | Rounded price pills (screenshot) | **Slider + histogram**, total for N nights, TRY | Room type, beds/bedrooms/baths, amenities, guest fav., instant book, property type… | Phone: map + list sheet; tablet: list + "Show map" (emulated) | Bounds params + `search_by_map` |
| Sahibinden | Not verified (403) | Not verified | Not verified | Not verified | Not verified | App: select region on map |
| OpenRent | **Leaflet 1.5.1 + markercluster**, MapTiler tiles | divIcon + clusters | **pcm / pw toggle**, presets + custom, invalid options disabled | Price, beds, baths, type, furnished, date, tenancy, pets, bills… radius **or commute** | Phone: map behind "Map View" button (emulated) | **Card hover → marker highlight** |
| Zoopla | Google Maps (runtime 3.66.7) | Not verified | Rent "pcm (pw)" | Radius, price, beds, type; sort incl. "Most reduced" | Map + "List view" toggle (emulated) | Not verified |

---

## 5. Patterns worth copying and things to avoid

**Copy**
- **Price-bubble markers** (Rightmove) with distinct **hover**, **selected** and **visited** styles, and a z-index boost on hover.
- **Card hover → marker highlight** (OpenRent, Rightmove) and **marker click → card highlight + scroll into view** (the mission requirement).
- **Min/max preset dropdowns that disable invalid options**, plus a custom value (OpenRent, Zillow). Short labels: "£X+", "Up to £Y", "£X–£Y" (Zillow formatter).
- **Mode-aware price:** different steps for sale vs rent, with the unit visible ("pcm").
- **Beds as "Any / 1+ / 2+ / 3+ / 4+ / 5+"** (Zillow).
- **Mobile filter modal with temporary state + Apply**, and a Reset (OpenRent). Result count ("N properties found").
- **"Search this area" button** instead of auto-refetch on every pan (Rightmove). Optional for us.
- **One recency/price-change badge + one status tag per card**, not a pile of badges.
- A neutral basemap so markers stand out (the reason to consider CARTO).

**Avoid**
- Hiding the map attribution (OpenRent mobile). It breaks the OSM/CARTO terms.
- Too many badges or paid-placement labels with no meaning in a POC ("Showcase", "Spotlight").
- Proprietary map SDKs that need keys or billing for a POC (Google, Mapbox).
- Filter lists of 100+ options (Zillow): out of scope.
- Fetching tiles in bulk or hard-coding the tile URL.

---

## 6. Proposed filter set and UX for our POC

**Data model** (from `docs/architecture.md`): `id, image, price, address, city, type, bedrooms, status, lat, lng` (+ optional `listedAt` for a "New" badge and `previousPrice` for "Reduced").

| Filter | Control | Behavior |
|---|---|---|
| Location | Text input (city/district/address contains, case-insensitive) | Instant, debounced. Map-area search optional (see questions) |
| Listing status | Segmented control: For sale / For rent (+ checkboxes for Under offer / Sold if the mentor wants them) | Switches the price unit and preset steps |
| Price | Min + Max selects with presets, "No min"/"No max" | Options that make min > max are disabled. Sale steps vs rent steps (per month). One currency |
| Property type | Multi-select chips (Apartment, House, Villa, …) | Empty = all |
| Bedrooms | Single select: Any, Studio, 1+, 2+, 3+, 4+, 5+ | "N+" = `bedrooms >= N` |
| Sort | Select: Newest, Price ↑, Price ↓ | Applied after filtering |

**UX decisions**
- **State:** `filters` (useState), `selectedId`, `hoveredId` (useState). `filteredProperties = useMemo(() => applyFilters(properties, filters), [properties, filters])`. No global store.
- **Desktop/tablet:** horizontal filter bar on top, list on the left, map on the right. Filters apply instantly.
- **Mobile:** full-screen filter modal with temporary state + "Show N results" + "Reset". A floating List/Map toggle. On the map view, the selected marker opens a bottom card.
- **Active-filter chips** under the bar, each removable, plus "Clear all".
- **Empty state:** "No properties match your filters" + a "Clear filters" button. The map stays visible.
- **Result count** always visible.
- **Sync:** card hover → marker hover style; card click → marker selected + `map.flyTo`/`panTo`; marker click → card selected + `scrollIntoView({block:'nearest'})`. Selected and hover use different styles. Clear the selection if the selected item is filtered out.
- **Markers:** `L.divIcon` price bubbles ("₺4,5M" / "£475k" short format). Clustering only if the dataset is large.
- **Map bounds:** fit bounds to `filteredProperties` when filters change (but not on every hover).
- **Accessibility:** cards are buttons/links with focus styles; markers get `title`/`aria-label` with price and address.

---

## 7. Questions for the mentor

Written for a non-technical decision-maker. Each question says why it matters and what we suggest, so a short answer is enough.

1. **Which market should the demo look like: a chosen country's market (₺, $ or £), or the UK (£) like most example sites?** *Why:* it decides the sample listings, the currency and how prices are shown.
2. **Which language should the screens use: English only, or should users be able to choose?** *Why:* one language keeps the demo simple; two means extra work on texts and formats. *Our suggestion:* one language.
3. **How should people choose a location: by typing a city or district, by moving the map ("search this area"), or both?** *Why:* typing is quick to build; searching by map area is more work but feels like the big portals. *Our suggestion:* typing first, map-area search as an extra if time allows.
4. **What should the "listing status" filter mean for us?** The brief asks for filtering by "listing status". The sites we studied use the term for two different things:
   - **Deal type: for sale or for rent?** This changes what the price means. For sale shows a total price (e.g. ₺4,500,000); for rent shows a monthly rent (e.g. ₺25,000/month). On Rightmove, Zoopla and OnTheMarket these are separate searches with different price options.
   - **Availability: can you still get it?** "Available", "under offer" (an offer was accepted but the deal is not done) and "sold / let". Sites usually show this as a small tag on the card (Rightmove: "Under Offer", "Sold STC", "Let Agreed"), sometimes with a tick box like "include under offer / sold".

   *Why:* the choice changes the filter panel, the price filter and the sample data. *Our suggestion:* make for sale / for rent the main filter, and show availability as a tag on each card, with an optional "hide sold" switch.
5. **How big should the demo feel: a few dozen listings or hundreds?** *Why:* hundreds of listings need markers to be grouped on the map, which adds work. *Our suggestion:* 30–50 sample listings.
6. **How important are phones compared with computers?** *Why:* on phones, the sites we studied either hide the map behind a button or show the map first. *Our suggestion:* computer first, with a simple list/map switch on phones.

*Technical choices we will make ourselves unless you prefer otherwise:* React 19 + Vite + TypeScript + Tailwind, OpenStreetMap tiles, and tests for the filter logic.

---

## 8. Limitations (what could not be verified)

- **Device and browser checks are emulated.** Phone/tablet results come from Playwright viewport emulation in headless Chromium; browser results from headless Firefox and WebKit at desktop size. No real phones, tablets, Safari on iOS, or Edge were tested. Phone/tablet were checked in Chromium only.
- Each site was checked once (7 Oct 2026, UK/TR locale). Cookie or notice dialogs partly cover the Airbnb and Zoopla screenshots.
- **Sahibinden:** fully blocked (Cloudflare 403 for curl, WebFetch and Playwright Chromium, title "Bir dakika lütfen..."). Only the App Store description was read; phone, tablet and other browsers not attempted.
- **Zoopla:** blocked for curl and Playwright Firefox (403); WebKit not attempted. Map tech verified in Chromium; marker style not verified.
- **Zillow:** bot check ("Press & Hold") in Playwright Chromium and 403 for iPhone-UA curl. Marker style, phone, tablet and other browsers not verified.
- **Marker shapes:** Airbnb (price pills) and OnTheMarket (plain pins) verified by screenshot only, not from code. Zillow and Zoopla not verified.
- **Rightmove** exact price preset values are not verified.
- Airbnb price range (₺2.500–₺63.000) and histogram reflect one Istanbul query on 2026-10-07 with default dates (5 nights). They change per search.
- Pricing and terms (Google, Mapbox, CARTO) were read on 2026-10-07 and can change. Mapbox token requirement: inferred from the license text (needs an active Mapbox account); the install page did not state it.
- Sites change often and run A/B tests (Rightmove exposes `mvtInfo`). Findings are a snapshot.
- WebFetch answers are summaries from a small model, so Zoopla details have lower confidence than the curl-based findings.

---

## 9. Sources (accessed 2026-10-07)

**Map libraries and tiles**
- https://react-leaflet.js.org/docs/start-installation/
- https://leafletjs.com/
- https://github.com/Leaflet/Leaflet (releases via GitHub API)
- https://www.openstreetmap.org/ (its own page loads Leaflet and MapLibre bundles)
- https://operations.osmfoundation.org/policies/tiles/
- https://wiki.openstreetmap.org/wiki/Blocked_tiles
- https://carto.com/
- https://carto.com/basemaps/apikey/
- https://carto.com/legal/basemap-terms/
- https://docs.carto.com/faqs/carto-basemaps
- https://maplibre.org/
- https://www.mapbox.com/pricing
- https://docs.mapbox.com/mapbox-gl-js/guides/install/
- https://unpkg.com/mapbox-gl@3.32.0/LICENSE.txt
- https://unpkg.com/react-leaflet@5.0.0/LICENSE.md
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://developers.google.com/maps/documentation/javascript/get-api-key
- https://registry.npmjs.org/ (react-leaflet, leaflet, @types/leaflet, react-leaflet-cluster, leaflet.markercluster, maplibre-gl, react-map-gl, mapbox-gl, @vis.gl/react-google-maps, supercluster)

**Example sites**
- https://www.onthemarket.com/for-sale/property/london/ (+ `?view=map-only`, JS chunks under /assets/0.1.3303/)
- https://www.zillow.com/homes/for_sale/ and https://www.zillow.com/austin-tx/
- https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=REGION%5E87490 and …/map.html (JS under media.rightmove.co.uk)
- https://www.airbnb.com.tr/s/Istanbul/homes
- https://www.sahibinden.com/ and https://www.sahibinden.com/satilik-daire (403) and https://apps.apple.com/us/app/-/id530478406
- Playwright runs (7 Oct 2026) used: Rightmove …/map.html, Zillow /austin-tx/, OpenRent /properties-to-rent/london, Airbnb /s/Istanbul/homes, OnTheMarket …/london/?view=map-only, Zoopla /for-sale/map/property/london/, Sahibinden /satilik-daire
- https://www.openrent.co.uk/properties-to-rent/london (JS under staticcdn.openrent.co.uk)
- https://www.zoopla.co.uk/for-sale/property/london/, …/to-rent/property/london/, …/for-sale/map/property/london/
- https://dribbble.com/search/real-estate (listed in notes; not reviewed)
