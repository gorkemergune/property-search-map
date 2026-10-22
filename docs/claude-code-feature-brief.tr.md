# Claude Code brief: renter fit, map heat layers, shareable searches, saved homes

Run Claude Code from the repository root and give it this prompt. Inspect the current working tree first; preserve existing uncommitted work and build on the current implementation.

---

We are extending an existing React + TypeScript + Vite UK property search app. Implement the features below in the current architecture and visual style. Start by inspecting the current models, filter state, quick filters, map, listing detail, results toolbar, and browser storage patterns. Do not replace the app or discard uncommitted changes.

## 1. Rental suitability filters

Add clearly worded rental filters for:

- Newly married / newlywed-friendly accommodation.
- Student-friendly accommodation.
- Employment/income requirements: salaried employment accepted/required, stable income required, civil servant accepted/required, teacher accepted/required.

Design these as **listing requirements or landlord preferences**, not as a request for sensitive user data. The app must never ask a visitor for marital status, employer, occupation, salary, or proof of income just to search. Prefer listing-side fields such as `newlywedFriendly`, `studentsWelcome`, `requiresStableIncome`, `salariedApplicantsAccepted`, `civilServantsAccepted`, `teachersAccepted`, and distinguish “required” from “accepted” where meaningful. If these concepts overlap, choose the smallest accurate model and explain the labels in plain language.

- Keep them rental-only and make each filter optional.
- Unknown listing information must stay unknown and must not match a positive/negative filter as if verified.
- Clearly label demo values as fictional. Never imply actual landlord screening or legal eligibility.
- Add matching data, filter chips/removal, reset/context-switch behavior, result count updates, and concise labels in the centralized i18n file.
- Add tests for each filter and for unknown/false semantics.

## 2. Two selectable map heat layers

Add two separate, user-selectable map modes/layers:

1. **Popular areas** — show where people are interested in living/searching (demand/popularity).
2. **Listing density** — show where matching homes are concentrated (supply/listing count).

Make each available as a clear button or toggle, allowing the user to switch between them and return to normal markers. The heatmap must reflect the current search filters and current result set where appropriate.

- Inspect the existing Leaflet/react-leaflet dependencies and map architecture before choosing an approach. Avoid adding a large dependency if a small Canvas/Leaflet layer is sufficient.
- Use different, accessible legends/colors and a clear label so popularity is not confused with listing count.
- Do not claim to know real user popularity from mock data. For this demo, label the popularity layer as **demo/illustrative interest** and use explicitly fictional seeded interest weights, or implement a clearly explained proxy. Keep the data contract ready for real aggregated, privacy-safe search analytics later.
- Listing density should be calculated from the current filtered listings, not hard-coded. Handle zero results and layer toggles cleanly.
- Include the selected map mode in shareable search state (see below) if it represents a meaningful user preference.
- Test toggling, filtered results, legend accessibility and mobile map controls.

## 3. Shareable filtered-search links

Allow users to share a URL that recreates the current search and filter state.

- Serialize supported filters and selected map layer into URL query parameters; restore them on page load and browser back/forward navigation.
- Use stable, compact, human-readable parameters; omit defaults and malformed/unknown values. Do not include private user information.
- Include a visible **Share search** action that copies the URL and gives accessible success/failure feedback. Use the Clipboard API with a graceful fallback.
- Ensure city, rent/buy context, price ranges, bedroom/type/features and new filters survive a copy/open round trip.
- Avoid resetting unrelated state when URL parameters change. Keep state and URL synchronized without update loops.
- Add tests for encode/decode, invalid values, clipboard feedback where practical, and browser history changes.

## 4. Saved homes (“basket”) with comparison notes

Add a saved-homes page/panel where users can collect listings and evaluate them side by side.

- Add a save/unsave control on cards, map previews and listing details. Make its state accessible and visible everywhere.
- Persist saved listing IDs in local storage so the basket survives reloads on the same browser. Handle unavailable/corrupt storage gracefully.
- Add a saved homes entry point with a count, empty state, removal, and a clear-all action.
- Let users add a private note or simple personal rating to each saved home (for example pros/cons or 1–5 stars). Store this only locally; do not put notes in URLs or send them to analytics.
- Provide a compact comparison view for saved homes: price, period, bedrooms, bathrooms, area, EPC, location and relevant rental/sale terms. Make it horizontally usable on mobile.
- Saved homes should remain available when filters change. Clearly handle a saved listing that is currently outside the active result set.
- Add tests for persistence, corrupted storage, save/remove, notes/ratings, and counts.

## 5. Recently viewed labels

Remember which listings the visitor has opened and show a subtle **Previously viewed** badge next to those listings on the home/results page.

- Record a listing as viewed only when the user opens its detail view, not on a card hover or map pan.
- Persist a bounded set of recent listing IDs in local storage; handle storage errors. Keep this separate from saved homes.
- Show the label on cards and relevant result rows, including after reload. Make the badge visually quiet and accessible.
- Do not expose viewing history to other users, include it in share links, or transmit it to an external service.
- Add a way to clear browsing history, and tests for recording, persistence, clear and badge rendering.

## 6. Product and implementation requirements

- Keep the search page clear: group advanced suitability filters, avoid crowding the main search, and use quick filters for only the most common choices.
- Preserve responsive behavior, keyboard navigation, focus handling, map/list synchronization, and existing filter chips/reset behavior.
- Use existing types, formatters, i18n and component conventions. Add no API keys or client-side secrets.
- Ensure heat layers, saved homes, viewed badges, and URL state interact correctly rather than becoming isolated demos.
- For mock data, use explicit fictional values and clear disclosure. Do not generate factual-seeming personal or landlord criteria from listing IDs.
- Review any legal or discrimination-sensitive wording. Keep search criteria focused on stated listing terms and make clear the app does not determine legal eligibility.

## 7. Verify and report

- Run typecheck, production build, and relevant tests. Exercise desktop and phone workflows in a browser if available.
- Verify: suitability filters; each map layer and filtered heat; share link open/round trip; save and compare homes; note/rating persistence; previously-viewed badge and history clear; reset and context switching.
- Do not commit unless explicitly asked.
- Finish with a concise report of implemented behavior, verification results, and limitations—especially that popularity data is illustrative until real privacy-safe analytics exist.

---
