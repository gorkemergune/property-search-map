# Claude Code follow-up: visible filters, full listing facts, credible demo data

Run Claude Code from the repository root and give it this prompt. The current working tree already contains a broad first implementation; inspect and continue it instead of re-creating or overwriting it.

---

The user says the new filters still do not appear locally, the “About → Listing summary” should show more of the listing's features, and the mock data has UK-specific inconsistencies. They want distinctive, useful filters that help sell the product. Please finish this in the existing working tree.

## 1. Diagnose why filters are not visible

Start by inspecting `git status`, the current branch, `src/components/FilterPanel.tsx`, `src/components/Toolbar.tsx`, `src/components/FilterDrawer.tsx`, and `src/App.tsx`.

- The working tree may already contain uncommitted implementation. Preserve it and inspect the actual render path before editing.
- Verify the filters in the browser at desktop and mobile widths. The advanced filters may be hidden in “All filters” or gated behind Buy/Rent. Make that discoverable: ensure the filter drawer opens, give it clear sections, show relevant rental/sale filters when their context is selected, and add an obvious entry point from the search UI.
- Add useful quick-filter chips/presets near the results toolbar for distinctive user needs, for example **Student homes**, **Pet-friendly**, **Sharers**, **Bills included**, **Chain-free**, and **Accessible**. Presets must use the same underlying filter state, show active states, compose predictably with other filters, and be removable/resettable. Only show presets that make sense for the selected Buy/Rent context.
- Confirm selection updates actual results, map markers, result counts, active chips, and reset. Check narrow/mobile layout too.
- If this is a stale local dev server or a different branch/worktree issue rather than a code issue, report the exact cause and the concrete command/action needed. Do not claim the filters are visible without opening/inspecting the running app.

## 2. Make the listing summary comprehensive and readable

The current “Listing summary” is too thin for the user's intent. Redesign the existing About section as a useful property overview that exposes **all recorded property features** without becoming one dense paragraph.

- Keep a short, natural 2–3 sentence overview at the top, then add a clear “Property details” or “Features” area with compact labeled rows/chips grouped into: home basics, comfort/features, rental terms (rentals), ownership/costs (sales), and access/transport (only when data exists).
- Include every applicable known field: price and period, beds, baths, area, furnishing, EPC, outdoor space, parking, pet policy, student/sharer suitability, HMO status, short lets, deposit, separately listed included bills, home office, accessibility features, availability, tenure, lease length, service charge, ground rent, chain status, new-build/off-plan, and completion date.
- Do not invent facts. Missing values should be omitted or explicitly shown as “Not stated” only if that helps users distinguish missing data; never phrase unknown as No. Keep the existing demo-data disclosure and clearly say the summary is generated from the listing's recorded details, not by AI.
- Use existing formatters and concise, plain language. Ensure layout works in the detail drawer on phones.

## 3. Fix the mock data, don't just hide the problems

Inspect `src/data/properties.ts` and existing data tests. Replace arbitrary, price/ID-derived facts with coherent, visibly fictional listing data that can plausibly support the filters.

- Audit every city and listing period for plausible relative price bands, bedrooms, furnishing and feature combinations. Correct extreme values such as multi-million-pound ordinary two-bedroom flats and £6k+ monthly rents for ordinary regional homes. Keep cities and addresses marked fictional as they are now.
- Correct country-specific tenure: Scottish homes must not be marked leasehold; use Scotland-appropriate ownership labels/modeling. Do not generate UK leasehold-only costs for Scottish properties.
- Keep field values internally consistent: HMO status only on plausible multi-occupant rentals; sharers/student suitability should fit the dwelling; deposits obey the applicable mock assumptions/cap; lease terms/costs only on English/Welsh leasehold homes; outdoor/parking facts must agree with existing garden/parking flags; bills, furnishing, availability, new-build and completion details must be coherent with listing type/status.
- Avoid deterministic pseudo-random field generation based only on listing ID for claims that appear factual. Prefer explicit fixture records or a small, readable set of fictional listing profiles. Ensure filters each have meaningful positive, negative, and unknown examples.
- Keep “unknown” distinct from false and zero. Never fill unavailable real-world data with invented certainty. Since these are mock listings, mark generated facts as fictional demo facts in the product's disclosure.
- Update data tests to enforce the country and cross-field rules and remove tests that merely validate the old artificial generation scheme.

## 4. Verify the complete experience

- Run UI tests (`App.test.tsx`, `SearchBox.test.tsx`), all relevant tests, typecheck, and production build. The prior report said the two UI tests could not run because a node_modules file read timed out; investigate the actual cause, and use a local non-synced checkout or reinstall dependencies if needed. Report any test that remains unrun.
- Exercise representative workflows: Rent → student/pet/sharer preset → detail summary; Rent → no pets / bills / accessibility; Buy → chain-free / lease / outdoor space; switch contexts; clear filters; mobile drawer.
- Finish with a concise report listing changed files/features, commands and results, any remaining caveats, and whether the visible local app was actually inspected.
- Do not commit unless the user explicitly asks.

---
