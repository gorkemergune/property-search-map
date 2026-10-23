# Claude Code brief: UK map distribution, census choropleth, listing density, city tabs

Open Claude Code at this repository and paste the prompt below. The current repository already has map modes, a canvas heat layer, demo interest data, city tabs, and roughly 300 fictional listings. Inspect the actual current tree first and preserve all existing work.

---

The user shared a screenshot of the UK-wide map. Listings appear as a few isolated points and dense clusters in only a small number of areas. Improve the map and navigation as described below. Do not just change marker styling; fix the data distribution and the geographic layer model.

## Inspect first

Review `src/data/properties.ts`, `src/data/interest.ts`, `src/lib/heat.ts`, `src/components/HeatLayer.tsx`, `src/components/PropertyMap.tsx`, `src/App.tsx`, `src/components/Header.tsx`, `src/index.css`, map tests and listing coordinate tests. Check `git status` and preserve uncommitted work. Keep existing search, marker/card sync, saved homes, shareable filters, viewed history, responsive behavior, and accessibility.

## 1. Make listing locations look geographically distributed

There are now about 300 fictional listings, but the UK zoomed-out view still looks sparse and overly concentrated. Audit all listing coordinates and neighborhood coverage.

- Cover the neighborhoods already supported by the app in every represented city instead of placing most listings in a few central clusters. Add at least 2–3 listings to each intended neighborhood/area where the dataset permits, with a natural spread across the area's real approximate footprint.
- Use plausible neighborhood centroids plus small, bounded deterministic offsets, or explicit coordinates. Do not scatter points randomly over the whole UK or place fictional properties in the sea, parks, or unrelated towns.
- Keep the wide UK view readable: use appropriate clustering/aggregation at low zoom, then reveal individual markers as users zoom in. Avoid markers landing exactly on top of one another. Preserve real listing selection and map/list synchronization.
- Do not imply coverage in a city or neighborhood when there are no listings there. Ensure the data and map show each represented city and intermediate areas at a glance.
- Update coordinate tests to check intended geographic spread, per-city/neighborhood coverage, valid bounds, and stable deterministic locations.

## 2. Replace the misleading blank “Popular areas” layer with a real population choropleth

When **Popular areas** is selected, the land should never become a blank white surface. Render a UK-wide or relevant-area polygon choropleth using real, attributed population-density data, with even the lowest non-water density shown in a very pale yellow. Use a continuous, readable scale from pale yellow through amber/orange to a stronger high-density color. Water stays the basemap color; all UK land polygons should receive a data value or a neutral-but-still-tinted fallback, never pure white.

Important meaning and source requirements:

- Population density is not the same as popularity. Keep the user's “Popular areas” control if useful, but clearly subtitle the map as **Population density (census proxy)** and explain that population density is a proxy for populated areas, not measured property-search interest.
- Use authoritative public data, with source and year visible in the map legend or an accessible info popover. Good starting points:
  - England and Wales population estimates/density from the [ONS population estimates dataset](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) or [ONS population-density indicator](https://www.ons.gov.uk/explore-local-statistics/indicators/population-density).
  - Scotland population/density from [Scotland's Census 2022](https://www.scotlandscensus.gov.uk/2022-reports/scotlands-census-2022-rounded-population-estimates/).
  - Appropriate Northern Ireland official census/statistics data if the map includes Northern Ireland.
  - Polygon boundaries from the [ONS Open Geography Portal](https://geoportal.statistics.gov.uk/) and corresponding official Scottish/Northern Irish boundary sources.
- Verify the data's geography, year, licence, download/API route and join keys. Never join areas by display name alone when official area codes are available.
- Prefer small static, versioned, bundled GeoJSON + official data for this frontend demo if it keeps the map reliable. If using a live API, implement loading, failure/offline fallback, caching, attribution and avoid sending user search data. Do not silently fabricate population values.
- Use a simplified boundary set at appropriate scale (e.g. local authorities/council areas for UK overview, wards or equivalent at city zoom). Avoid bundling unnecessarily huge geometry.

## 3. Make “Listing density” show larger districts/areas, not point blobs

The user wants broader areas and, where possible, district boundaries. Render a polygon-based choropleth over administrative/neighborhood boundaries, with the count of current matching listings assigned to each area.

- Calculate counts from the current filtered result set. Use reliable area codes or a tested point-in-polygon/spatial join; do not assign listings by string heuristics or arbitrary circles.
- At UK-wide zoom, show broader administrative areas; at city zoom, show smaller districts/wards when data supports them. Add clear boundaries, labels at suitable zoom, a count-aware legend, and click/hover details with area name and number of matching homes.
- Show zero-result state clearly; zero-count areas should still have a visible pale tint so the land doesn't turn white. Distinguish zero listings from missing boundary/count data.
- Keep individual listing markers available in a subdued form or provide a clear way to switch back to the normal homes mode. Do not let heat overlays block marker interaction unnecessarily.
- Ensure density areas recompute when filters change, city changes, listings are added, or the map zoom changes.

## 4. Make heat-layer modes unambiguous

Provide clearly discoverable controls to switch among normal homes, population-density/popular areas, and listing density. The two heat modes should each have a distinct title, legend, source/method note and accessible selected state. Persist mode in the share URL only if current URL-state behavior already supports it. Avoid labeling census population as actual search traffic.

## 5. Make the city strip usable on Windows and with mouse/keyboard

The horizontal city strip at the top is hard to discover and Windows users cannot reliably drag-scroll it. Keep the cities visible and add explicit previous/next arrow buttons on either side.

- Each arrow click should move the tab strip by about 2–3 city tabs (or a predictable viewport-sized chunk), with smooth scrolling where reduced-motion settings allow it.
- Disable the previous/next button at the respective ends. Add clear accessible labels and visible focus states.
- Keep the native horizontal scrollbar visible as a secondary way to navigate, and preserve trackpad/touch scrolling. Ensure the selected city tab scrolls into view when selected from another control or restored from a shared URL.
- Handle resizing and first/last tab behavior. Check the layout at desktop, Windows-style mouse interaction, keyboard-only and phone sizes.

## 6. Verify

- Run typecheck, production build and relevant tests. Add/update tests for data spread, polygon count assignment, zero/no-data states, population-source attribution/legend, heat-mode switching and city-strip arrow behavior.
- Inspect the real running app at UK overview and city zooms, with normal markers, Popular areas and Listing density. Test with active filters and no matching results. Inspect desktop and phone layouts, and verify no page errors or white land gaps.
- Do not claim a live data source unless the app actually loads it and attribution/failure behavior are implemented. Report whether values are bundled or fetched live, source/year/geography, and any areas not covered.
- Do not commit unless asked.

---
