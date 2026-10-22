# Claude Code brief: property filters and listing summaries

Use the following prompt in Claude Code from the repository root.

---

## Prompt

We have an existing React + TypeScript + Vite property search app for the UK, using mock listing data. Implement the improvements below in the existing architecture. First inspect the codebase and preserve its design, accessibility patterns, and current behavior. Do not replace the app or introduce a backend/service without explaining why it is needed.

### 1. Listing detail: useful “About this home” summary

The listing detail drawer already has an “About this home” section, but its description is currently generic demo copy. Improve it into a concise, scannable, AI-summary-style overview based only on known structured listing fields.

- Add a short heading such as “At a glance” or “AI-style summary” and a 2–4 sentence summary.
- Summarize relevant facts such as sale/rent, price, bedrooms, bathrooms, floor area, furnishing, EPC rating, garden/parking, pet policy, student suitability, bills, availability, tenure, new-build and lease/service-charge data when available.
- Never infer or invent facts. Omit unknown details instead of presenting them as true. Keep all facts consistent with the listing fields.
- Since the current listings are local mock data and there is no AI backend, implement this as deterministic template-based copy and label it transparently (for example, “Listing summary”), not as a real AI-generated result. Keep the design open to a future server-side AI integration without adding API keys or exposing secrets in the browser.
- Retain the fictional/demo data notice. Avoid repetitive wording across listings and ensure empty optional fields do not create awkward sentences.
- Add appropriate unit/price formatting and accessible semantics.

### 2. Rental filters

Extend the existing rental filters with useful UK-specific choices, shown only when “Rent” is selected:

- Pet policy: any, pets allowed, pets not allowed. Treat unknown policy as unknown; it must not match either explicit policy filter.
- Student-friendly / student house.
- Suitable for sharers / housemates.
- HMO licensed (only when the listing explicitly says so).
- Short-term lets accepted.
- Deposit amount or deposit weeks, when available.
- Included bills: represent internet, water, electricity, and gas separately when listing data supports it; do not equate “all bills included” with one bill type.
- Workspace / home office.
- Accessibility: step-free access, lift, and accessible bathroom as distinct factual fields.

### 3. Sale filters

Extend sale filters with useful UK-specific choices, shown only when “Buy” is selected:

- Chain-free.
- Leasehold details: remaining lease years, service charge, and ground rent; enable useful min/max filters or clear threshold presets.
- Outdoor space type: private garden, shared garden, balcony, terrace (keep existing garden filter compatible or replace it cleanly).
- Parking type: allocated space, garage, permit/street parking where known (keep existing parking filter compatible).
- New build / completion timing if the listing has reliable data.

### 4. Data and filter behavior

- Add well-typed optional fields to the existing `Property` model and mock listing rows. Keep rental-only and sale-only fields clearly scoped.
- Ensure filters work end to end: filter state, `applyFilters`, `updateFilters`, reset, active chips/removal, filter drawer, toolbar/popovers if applicable, and result counts.
- Switching between Buy, Rent, and Any should clear only context-specific choices using the existing conventions.
- Keep unknown data distinct from false/zero. A listing with missing HMO, student, pet, accessibility, utility, lease, chain, or deposit data must not be advertised as a positive or negative fact.
- Seed the demo data with a varied mix so each new filter has plausible matching and non-matching examples. Keep all listing facts explicitly fictional and avoid implying real addresses or verified property claims.
- Update English labels and descriptions in the centralized i18n module. Keep labels concise and plain-language.
- Keep the UI compact and usable on mobile; group advanced filters into clear sections and avoid overwhelming the default search view.

### 5. Completion

- Review the implementation against existing architecture and conventions.
- Run the existing typecheck/build and relevant tests, fixing any failures caused by the changes.
- Summarize what changed, how the listing summary avoids inventing facts, and any fields that remain optional because real listing data would be required.

---
