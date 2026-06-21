# Investigation: reported navigation slowness on the live site (sunfabb.com)

Status: **findings + fixes shipped (PR #9), one fix pending merge (PR #6), one item still open**
Mode: Direct investigation against the live deployed site (chrome-devtools MCP), per explicit
request to measure rather than infer.

## 0. What was measured (this session)

All traces captured against **https://sunfabb.com** (live Vercel + Render free tier), Chrome
DevTools MCP, mobile viewport emulation (390×844×3, touch), **Slow 4G network + 4x CPU throttling**
— a closer approximation of a real mobile visitor than the unthrottled-localhost baseline in
`.omc/plans/2026-06-21-phase-web-vitals-optimization.md` §0. Raw trace files saved under
`.omc/research/2026-06-21-nav-slowness/`.

| Page | LCP | TTFB | Load delay | Render delay | CLS |
|---|---|---|---|---|---|
| `/` | 687 ms | 41 ms | 558 ms | 86 ms | 0.00 |
| `/catalog` | 688 ms | 33 ms | 593 ms | 61 ms | 0.00 |
| `/catalog/heritage-linen-bedspread` | 704 ms | 43 ms | 607 ms | 54 ms | 0.00 |

All three pages show the same shape: TTFB is fine, "load delay" (time between TTFB and the LCP
resource actually starting to load) dominates. Under throttling this phase is mostly the
document+CSS+font critical chain (see §1), not application code.

**Interaction trace** (catalog → product → back, `reload: false`): INP **21 ms** — the click
handler itself is fast, confirming the complaint isn't about click responsiveness. The real signal
was in network requests fired during that one round trip (see §2).

## 1. LCP findings (home / catalog / product detail)

- **Hero image lacks `fetchpriority="high"`** despite the `priority` prop already being set on
  `next/image` (`frontend/app/(storefront)/page.tsx`). `LCPDiscovery` insight: "fetchpriority=high
  should be applied to the image preload request: **FAILED**." Estimated savings reported as "none"
  by the tool itself (the image is already fast to fetch — see why below), so this is a
  correctness/best-practice gap rather than a measured bottleneck right now. Not fixed this session;
  flag for a future pass if `priority` continues not to propagate `fetchpriority` in this Next.js
  16.2.6 / Turbopack build.
- **Critical path under throttling**: document (~600ms, Slow-4G-bound) → render-blocking CSS chunk
  → self-hosted font woff2, critical path latency 658ms. No `preconnect` tags existed for the image
  origins. **This is already fixed in PR #6** (`frontend/app/layout.tsx` preconnects to
  `res.cloudinary.com` and `images.unsplash.com`), which is ready to merge — see §4.
- None of this is a regression or a new bug: it's expected behavior for an unthrottled-localhost
  baseline (Section 0 of the original Web Vitals plan) not holding up once you add a realistic
  mobile network. The original plan's L1–L3 items already anticipated this and are covered by PR #6.

## 2. The real finding: prefetch storm hitting `no-store` RSC payloads

This is the actual, previously-unidentified root cause of "feels slow after first load / between
sections," and it's distinct from anything in the original Web Vitals plan.

**Observation:** one interaction trace — click from `/catalog` into `heritage-linen-bedspread`, then
navigate back — produced **14 background network requests**, even though the user only clicked
once:

```
4x /catalog/heritage-linen-bedspread?_rsc=...   (the one actually clicked, prefetched repeatedly)
2x /catalog/embroidered-napkin-set?_rsc=...      (never clicked — adjacent grid card)
2x /catalog/linen-table-runner?_rsc=...          (never clicked — adjacent grid card)
5x /?_rsc=...                                    (never clicked — header logo + breadcrumb links)
2x /catalog?category=bedspreads&_rsc=...         (never clicked — breadcrumb category link)
```

**Cause, confirmed via response headers:**
- Every `<Link>` in the storefront (`app/(storefront)/**`) uses Next.js App Router's *default*
  viewport-triggered prefetch — confirmed via grep, zero occurrences of `prefetch={false}` anywhere
  in the storefront. With ~7 product cards visible in the catalog grid plus header/breadcrumb links,
  each one schedules its own background prefetch as soon as it scrolls into view.
- `/catalog/[slug]` had **no `generateStaticParams`**. Despite its data fetch using
  `next: { revalidate: 30 }` (a *Data Cache* hint), the page itself was fully dynamic (`ƒ` in the
  build output), so every RSC prefetch response came back:
  ```
  cache-control: private, no-cache, no-store, max-age=0, must-revalidate
  x-vercel-cache: MISS
  ```
  — i.e. every single speculative prefetch, not just real navigations, forced a fresh server render.
  Confirmed locally (`next start` + curl with `RSC`/`Next-Router-Prefetch` headers): two consecutive
  requests for the same product both came back `no-store`/uncached.

**Why this explains the complaint specifically:** the first page load has no competing traffic, so
it isn't affected. Every subsequent navigation happens while the *previous* page's grid is still
mid-flight on several speculative prefetches — on a bandwidth-constrained mobile connection (and a
free-tier backend with its own latency, see §3), those uninvited fetches compete with and queue
ahead of the fetch the user is actually waiting on. That matches "feels slow after first load, when
moving between sections" precisely.

**Fix shipped in PR #9** (`feature/nav-slowness-fixes`, CI green, ready to merge):
- Added `generateStaticParams` to `frontend/app/(storefront)/catalog/[slug]/page.tsx`, fetching all
  product slugs at build time (`getProducts({ limit: 100 })` — safe per D14, catalog is capped at
  ~100 products). This converts the route from `ƒ` (dynamic) to `●` (SSG with ISR), activating the
  `revalidate = 30` that was already set but inert without static params.
- **Verified, not inferred:** rebuilt, ran `next start` locally, sent two identical prefetch-style
  requests for the same product. Before the fix both came back `no-store`. After the fix:
  `x-nextjs-cache: HIT`, `Cache-Control: s-maxage=30, stale-while-revalidate=...` on the second
  request. Repeat prefetches of the same product (the common case — most users browsing the catalog
  page revisit nearby cards) now serve from cache instead of re-rendering and re-hitting the backend.

**Left out of scope (not fixed, documented as a deliberate decision):**
- `/catalog` itself reads `searchParams` directly, which forces dynamic rendering — it cannot be
  ISR'd the same way without restructuring filters to be client-side-only. Its underlying data
  fetches (`getCategories`/`getMaterials`/`getColors`/`getProducts`) already have Data Cache
  `revalidate` hints, so the *data* layer is cached even though the *route* (and therefore its RSC
  prefetch payload) is not. Smaller residual impact than the product-detail fix; revisit if traces
  after this fix still show `/catalog` prefetches as a hot spot.
- Did not disable `prefetch` on any `<Link>`. Disabling it would lose the "feels instant" benefit of
  prefetching entirely; making the *target* cacheable (this fix) is the correct lever, not turning
  prefetch off.

## 3. Backend (Render) latency — confirmed warm, cold-start unverified this session

`curl` against `https://sunfabb-backend.onrender.com/categories`, 3 consecutive requests:
1.76s, then 0.36s, then 0.32s. The backend was not in a cold/sleeping state during this session (no
15-minute idle window was available to trigger one), so **the documented 30–60s free-tier cold start
(D-level risk from the original Web Vitals plan, T2) remains real and unmitigated** — PR #6 ships the
keep-alive workflow (`.github/workflows/keep-alive.yml`) but it needs a `BACKEND_URL` repository
secret set before it does anything (confirmed via `gh secret list` — **no secrets are currently set
on this repo**; the workflow's own skip-logic means it's a silent no-op until this is set).
**Action needed after merging PR #6:** set the `BACKEND_URL` secret to
`https://sunfabb-backend.onrender.com`.

## 4. Decision: PR #6 vs. this session's findings

PR #6 (`feature/phase5.5.1-web-vitals-optimization`) implements T1 (backend `compression()`), T2
(keep-alive workflow), L1/L2 (hero image `sizes`+preconnect), and I1 (pending-state UI during
catalog filter transitions, via `CatalogTransitionContext`/`CatalogPendingGrid` — these turned out to
also be the scaffolding the nav-slowness fix's commit message references, since they were already
wrapping the catalog grid). None of it touches the prefetch/caching issue in §2 — **the navigation
slowness is a distinct, new issue, not something PR #6 was going to fix.**

**Decision:** merge both.
- PR #6 was retargeted from its stale base (`feature/phase5.5-storefront-restyle`, already merged
  per D24) to `main`, conflicts resolved (the only real conflicts were `docs/DECISIONS.md`
  duplicate-numbering — PR #6's own decision renumbered D24→D27 to avoid colliding with D24–D26,
  which exist on the not-yet-merged `feature/phase5-deploy`/PR #8 — and additive code in
  `main.ts`/`package.json` that merged cleanly). CI green, `mergeable: MERGEABLE`. **Left for the repo
  owner to merge**, per instruction.
- PR #9 (this session's fix + Speed Insights) is independent of PR #6 and based on current `main`.
  CI green. **Also left for the repo owner to merge.**

No fixed merge order is required between #6, #8, and #9 — they touch non-overlapping files except
`docs/DECISIONS.md` (#6 and #8 both append; whichever merges second will need the D-number
renumbering note in #6's D27 entry double-checked against whatever #8's D24–D26 actually land as).

## 5. Other findings (not perf, worth flagging)

- **Leftover test data is live in production**: the catalog includes a "Royal Cotton Bedspread"
  entry with no image (🧵 placeholder) — this is the test product created during the Phase 4
  verification session (`HANDOFF.md`, "Test data left in the dev DB... left in place per request").
  It went live with the Phase 5 deploy since the dev DB became the prod DB. Not a performance issue,
  but worth a quick admin-UI deactivation pass since it's currently visible to real visitors.
- `embroidered-napkin-set`'s broken thumbnail image (404 from a seeded Unsplash URL, per D23) is
  also still live — same category of issue, pre-existing and already documented, not re-investigated
  this session.

## 6. Vercel Speed Insights — added, not yet confirmed collecting

`@vercel/speed-insights` installed and wired into `frontend/app/layout.tsx` (PR #9). This gives
real-user field LCP/INP/CLS/TTFB going forward — CrUX returned `n/a` for this domain in every trace
this session, meaning there is currently zero field data, only lab traces.

**Not yet confirmed**: data only starts flowing once this PR is merged and deployed, and the Vercel
dashboard's Speed Insights tab needs a real visit or two before showing anything. **Action needed
after merging PR #9:** check the Speed Insights tab in the `sunfabb-storefront` Vercel project a
day or two after merge.

## 7. Acceptance criteria

- [x] Live mobile-throttled traces captured for `/`, `/catalog`, and `/catalog/[slug]` (first time
      the product page has been measured live).
- [x] Dedicated interaction trace (not just navigation traces) for catalog→product→back.
- [x] Root cause identified and measured, not inferred (network request headers, before/after cache
      status).
- [x] Fix implemented and verified with a before/after check (`x-nextjs-cache: MISS`→`HIT`).
- [x] Decision made and acted on for PR #6 (rebase + ready to merge, not abandoned).
- [x] Speed Insights added.
- [ ] Speed Insights confirmed collecting data — depends on merge + real traffic, can't verify in
      this session.
- [ ] `BACKEND_URL` secret set so PR #6's keep-alive workflow actually runs once merged.
- [ ] Re-trace `/`, `/catalog`, `/catalog/[slug]` live after both PRs merge and deploy, to confirm
      the prefetch-storm fix holds in production (Vercel's real edge cache, not just local
      `next start`) and quantify the LCP/load-delay improvement from PR #6's preconnect+hero fixes.

## Changelog

- 2026-06-21: Initial investigation — live mobile-throttled traces (home/catalog/product-detail),
  interaction trace revealing the prefetch storm, root cause confirmed via response headers, fix
  implemented and verified locally (PR #9), PR #6 rebased and made mergeable, Speed Insights added.
