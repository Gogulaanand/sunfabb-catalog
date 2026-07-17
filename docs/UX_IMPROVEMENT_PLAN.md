# Sunfabb Storefront: Performance Fix + Apple-like UX Redesign (Phased)

Status: approved plan, not started.
Run one phase per Claude session.
Each phase ends deployable (branch, PR, CI green).

## Context

Two problems, one plan.

**1. Nav clicks take 20-30s.**
Root cause confirmed by code inspection and live testing:
the backend on Render free tier sleeps after 15 min idle and takes 30-60s to cold-start (measured warm: 0.36s, semi-cold: 1.8s).
Every nav link points to `/catalog?category=...`, which is fully dynamic SSR (`app/(storefront)/catalog/page.tsx:60` reads `searchParams`) and awaits 4 backend fetches before returning any HTML.
There is **zero** `loading.tsx` / `error.tsx` / `not-found.tsx` in the entire `app/` tree, so the browser freezes on the old page for the whole wait.
`lib/api.ts` has no fetch timeout, so a cold backend blocks the render indefinitely.
The existing keep-alive workflow (`.github/workflows/keep-alive.yml`) is a silent no-op because the `BACKEND_URL` repo secret was never set.

**2. UI is plain, zero motion.**
No animation library, no scroll reveals, no page/gallery transitions, no reduced-motion handling.
Product-card markup is duplicated inline in 3 places.
Mobile nav is an unanimated native `<details>` disclosure.
Live-site issues spotted: home hero image (hardcoded Unsplash URL) renders as a gray block, a test category "E2E Category 540209" is visible in prod, the Towels tile uses an off-brand spa photo, and one product shows a placeholder thread-spool image.

**Decisions made (with owner):**

- Cold start: free GitHub Actions keep-alive ping (set the `BACKEND_URL` secret), not a paid Render upgrade.
- Design: fresh Apple-like direction (big type, whitespace, restrained fluid motion) on top of the existing "Ethos & Hearth" tokens (terracotta `#973100`, Playfair Display + Inter) in `frontend/app/globals.css`.
- Motion stack: **Motion for React** (`motion` npm package, framer-motion successor). No Chakra/Emotion on storefront routes (standing decision, keep it).

**Conventions:** branch per phase (`feature/<name>`), PR to main, CI green, tests updated per phase.

---

## Phase A - Make it fast (perceived + real)

Branch: `feature/perf-nav-instant`

1. **Keep-alive:** owner sets the `BACKEND_URL` repo secret to `https://sunfabb-backend.onrender.com` (`gh secret set BACKEND_URL`); verify the next scheduled run actually curls `/categories`.
2. **Fetch timeout:** add `AbortSignal.timeout(8000)` to `fetchAndParse` in `frontend/lib/api.ts:125-134` so a cold backend fails fast into the existing `.catch()` fallbacks instead of hanging.
3. **Stream `/catalog`:** restructure `app/(storefront)/catalog/page.tsx` so the shell (breadcrumb, h1, subcopy, filter sidebar skeleton) renders immediately and the product grid + filter data live in an `async` child wrapped in `<Suspense fallback=<CatalogGridSkeleton/>>`.
   Keep it dynamic SSR (URL-param filters + SEO metadata stay server-rendered); streaming removes the blocking wait.
   Full ISR of filter permutations was considered and rejected (unbounded searchParams combinations).
4. **Route-level fallbacks:** add `loading.tsx` for `(storefront)/`, `(storefront)/catalog/`, `(storefront)/catalog/[slug]/` (skeleton cards matching real layout to avoid CLS); add branded `error.tsx` and `not-found.tsx` at the storefront group level.
5. **Env reconciliation:** rename to one canonical var.
   Code reads `NEXT_PUBLIC_API_URL` (`lib/api.ts:3`, `lib/admin-api.ts:6`, `lib/customer-api.ts:5`, `app/api/admin/login/route.ts:3`); env files define `NEXT_PUBLIC_BACKEND_URL`.
   Pick `NEXT_PUBLIC_API_URL`, fix `.env.local` / `.env.example`, confirm the Vercel dashboard value, and fail fast if unset in production (hard rule 12).
6. **Backend quick win:** add `compression()` to the NestJS bootstrap (carried over from the pending web-vitals plan, T1).

**Verify:** `npm run build` (both apps), vitest, then live: click every nav item with a DevTools performance trace; skeleton must appear <100ms after click; curl timings recorded before/after; confirm keep-alive workflow run is green in Actions.

**Exit:** nav feels instant even against a cold backend (skeleton streams in, grid follows); no more indefinite hangs.

---

## Phase B - Design-system foundations + motion primitives

Branch: `feature/motion-foundations`

1. `npm install motion` in `frontend/`.
2. **Motion tokens** in `globals.css` `@theme`: `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1)`, durations 150ms (micro), 250ms (standard), 450ms (reveals).
   Apple-like = fast, decisive, no bounce/overshoot.
3. **Motion primitives** in `frontend/components/motion/` (all `"use client"` leaves; pages stay Server Components):
   - `Reveal` - `whileInView` fade + 12px translate-y, once, viewport margin `-80px`.
   - `StaggerGroup` / `StaggerItem` - staggered children (60-80ms) for grids.
   - `MotionProvider` - `MotionConfig reducedMotion="user"` mounted once in `app/(storefront)/layout.tsx` (global prefers-reduced-motion respect).
4. **Extract `ProductCard`** (`frontend/components/product/product-card.tsx`) deduplicating the 3 inline copies in `app/(storefront)/page.tsx`, `catalog/page.tsx`, `catalog/[slug]/page.tsx`.
   Define hover/press choreography once: image scale 1.03 @450ms ease-out-expo, card press scale 0.98, price/name micro-fade.
5. **Focus states:** consistent `focus-visible:ring-2 ring-primary ring-offset-2` on all tiles, nav links, pagination, VariantSelector buttons (currently only ProductGallery/CatalogFilters have them).
6. **Header polish:** scroll-aware header (client component): compact height + stronger blur/hairline border after ~24px scroll; replace the `<details>` mobile menu with an `AnimatePresence` overlay panel (backdrop fade, panel slide, body scroll lock, Esc/overlay close, focus trap).

**Verify:** build + vitest; keyboard-only walkthrough; toggle `prefers-reduced-motion` in DevTools and confirm animations collapse to fades/none; bundle-size check (confirm no storefront bloat from motion).

**Exit:** shared card + motion vocabulary exists; header/nav feels modern; nothing else redesigned yet.

---

## Phase C - Home page redesign

Branch: `feature/home-redesign`

1. **Hero rebuild** (`app/(storefront)/page.tsx`): replace the broken hardcoded Unsplash URL with a real brand image on Cloudinary (owner to pick/upload; flag as blocker if none exists).
   Full-bleed image, oversized Playfair headline (fluid `clamp()` display size), copy + CTA reveal on load with slight stagger, subtle slow Ken-Burns-style scale on the image (skipped under reduced motion).
2. **Curated Collections:** editorial tiles (larger, asymmetric or 2x2 with one feature tile), `Reveal` on scroll, hover image scale + caption lift.
3. **Featured Pieces:** use `ProductCard` + `StaggerGroup`; section headers get scroll reveals.
4. Whitespace pass: section padding up to 96-128px desktop, consistent max-width rhythm.

**Verify:** build; visual QA desktop + mobile; LCP trace (hero must stay `priority`, LCP < 2.5s); CLS 0.

**Exit:** home page looks and moves like the new direction end to end.

---

## Phase D - Catalog page redesign

Branch: `feature/catalog-redesign`

1. Grid uses `ProductCard` with stagger-in on load and on filter change.
   Replace the 50% opacity dim in `CatalogPendingGrid` with fade-through + subtle stagger via `AnimatePresence`.
2. **Filters:** restyle sidebar (label-caps headings, refined checkboxes/swatches, animated count badge); on mobile, move filters into an animated bottom sheet/drawer.
3. Result count + pagination polish (animated number, hover/press states on page links).
4. Empty state: designed component (icon/illustration + copy + "clear filters" action) instead of plain text.

**Verify:** build + vitest; filter/sort/paginate flows; URL-param behavior unchanged (SEO); reduced-motion check.

**Exit:** catalog is the polished core shopping surface.

---

## Phase E - Product detail redesign

Branch: `feature/pdp-redesign`

1. **Gallery** (`ProductGallery.tsx`): crossfade/slide between images with `AnimatePresence` (preserve the existing excellent a11y semantics and swipe), thumbnail active-state animation.
2. **VariantSelector:** micro-interactions on the existing state machine - swatch select spring-scale, add-to-cart button morphs through idle/loading/added states (width/label/checkmark transitions).
3. Layout: sticky buy column on desktop, refined type hierarchy, spec table styling, care-instructions disclosure with animated expand.
4. "Complete the Look" uses `ProductCard` + reveals.

**Verify:** build + vitest; full purchase-path smoke (variant select, add to cart) on preview; keyboard + screen-reader spot check on gallery; reduced-motion.

**Exit:** PDP matches the new design language; conversion path untouched functionally.

---

## Phase F - Polish, transitions, QA sweep

Branch: `feature/ux-polish-qa`

1. Cross-page transition: Next.js View Transitions API (or subtle template-level fade) - evaluate against Next 16 support, keep it removable.
2. Branded `not-found.tsx` / `error.tsx` content pass (Phase A shipped functional versions).
3. Site-wide QA: every page desktop + mobile screenshots, Lighthouse (perf >= 90, a11y >= 95), full keyboard pass, reduced-motion pass, cross-check against Phase A timings for perf regressions from motion.
4. Update `HANDOFF.md` and write a `phases/briefing/` note per repo convention.

**Exit:** whole storefront coherent, fast, animated, accessible.

---

## Flagged side items (not in these phases, do not lose)

- **Prod data cleanup:** delete/deactivate "E2E Category 540209" and the placeholder-image product ("Royal Cotton Bedspread") via admin; investigate how E2E test data reached prod DB and prevent recurrence.
- **Towels category tile** uses an off-brand spa stock photo; needs a real brand asset (admin/content task).
- **Hero brand asset:** Phase C is blocked on one good hero image (Cloudinary upload).

## Verification approach (every phase)

1. `npm run build && npm run lint && npx vitest run` in `frontend/` (plus backend tests when backend touched).
2. Live check on the Vercel preview deploy: screenshots desktop + mobile, nav timing, console/network errors.
3. Reduced-motion and keyboard checks for any phase that adds motion.
4. PR to `main`, CI green before merge.
