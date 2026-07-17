# HANDOFF.md

High-level project state.
Read alongside `CLAUDE.md` and `docs/WORKFLOW.md`.

Fine-grained "where we left off in the current session" notes live in `.session-state.md`
on the active developer's machine (gitignored).
This file only tracks **phase-level** state that anyone cloning the repo should see.

---

## One-paragraph summary

We're building a home-textiles product catalog (bedspreads, towels, napkins, table linen) for the
India market, INR only.
It's a deliberate full-stack learning project for a frontend engineer: a **separate NestJS backend +
Next.js frontend + PostgreSQL/Prisma** monorepo, chosen specifically to maximize backend learning
depth.
Catalog is small (20-30 products, won't exceed ~100), so scale is a non-issue - optimize for clean
patterns and learning.

---

## Where we are

- **Phases 0-5** done and merged (scaffold, catalog backend, auth, storefront, admin UI, deploy,
  hardening, Playwright e2e, audit fixes).
- **Phase 6 e-commerce:** 6.0-6.4 done and merged (schema foundations, customer accounts, cart,
  checkout & orders, Razorpay payments); C9 (abandoned-checkout expiry) closed.
  See milestone table below.
- **Live URLs:** frontend `https://sunfabb.com` (Vercel project `sunfabb-storefront`), backend
  `https://sunfabb-backend.onrender.com` (Render, free tier).
- **Database:** Neon.
  Schema includes the full Phase 6 e-commerce models (Customer, Address, EmailToken, Cart/CartItem,
  Order/OrderItem, Payment, WebhookEvent, Shipment).

---

## Current focus

### Stream A - vendor-gated milestones (6.5/6.6/6.7)

These are ready to build the moment the owner supplies the required vendor accounts/inputs.
Nothing else blocks them.

| Milestone | What it needs from the owner |
|-----------|------------------------------|
| **6.5 GST invoicing** - HSN, CGST/SGST/IGST, sequential invoice numbers, PDF | GSTIN + HSN codes + rates from your accountant |
| **6.6 Shiprocket** - serviceability/rates, AWB/label, tracking webhook | Create a Shiprocket sandbox account |
| **6.7 Resend email** - replace the `EmailService` stub, transactional flows | Create a Resend account + verify a sending domain on `sunfabb.com` |

Also needed before any of these: **Razorpay test-mode account** (free, instant - KYC only gates
*live* keys) with `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` added to
`backend/.env` and the Render dashboard.
When registering the webhook endpoint subscribe to **four** events: `payment.captured`,
`order.paid`, `payment.failed`, `order.expired`.

### Stream B - next unblocked milestone: 6.8 admin order-management UI

Growth Wave 0 SEO is **done** (PR #26, merged 2026-07-17).
The next unblocked app milestone is **6.8 admin order-management UI** (order list/detail + status
transitions via the existing `transition()` guard) - no vendor account needed.

### UX improvement plan (parallel track)

`docs/UX_IMPROVEMENT_PLAN.md` - six phases (A-F) improving perceived performance and introducing
an Apple-like design language.
Phase A (`feature/perf-nav-instant`) merged as PR #30.
Phase B (`feature/motion-foundations`) merged as PR #31.
Phase C (`feature/home-redesign`) merged as PR #32.
Phase D (`feature/catalog-redesign`) in review - see PR for details.
Phases E-F are ready to execute one session at a time.

Full growth plan: **`docs/GROWTH.md`** (Phase 7).
Wave 1 (trust pages + content engine) gates on owner providing business inputs - see GROWTH.md §3.3.

---

## Parallel track - catalog content

3 designs are live on sunfabb.com (8569, 4219, 8525).
~47 more are in the image-generation pipeline tracked locally in
`tools/image-pipeline/CATALOG_PROGRESS.md` (kept uncommitted at the owner's request; gitignored).
This track is fully non-blocking for app development - it feeds Cloudinary/admin uploads
independently whenever designs are ready.

---

## Open blockers / reminders

- **Local admin password is a dev placeholder.**
  Before deploying anything new to Render, regenerate a fresh strong password + bcrypt hash and set
  `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` directly as Render env vars - never in a file.
  `backend/.env` is gitignored and was never committed.
- **Render free tier sleeps** and causes 24s cold starts on `/catalog`.
  Upgrade to Render Starter ($7/mo) at Wave 2 go-live (Phase 6.10); keep-alive pings every 10 min
  to mitigate (BACKEND_URL secret now set, PR #28 fixed the timeout).
- **`home.sunfabb.com`** (old personal homepage, Vercel project `website`) has a broken deployment
  and an expired wildcard cert (`*.sunfabb.com`, expired June 2021).
  Unrelated to the catalog - needs separate attention.
- **Wave 1 gate:** trust pages (`/about`, `/contact`, `/privacy-policy`, `/terms`,
  `/shipping-policy`, `/returns-policy`, `/faq`) need owner business inputs before Claude can draft
  them (legal entity name, GSTIN display, contact channels, return window, shipping coverage).
  These are also prerequisites for Razorpay live mode and Google Merchant Center.
- **6.1 security hardening backlog** - none block current work, revisit at 6.8/6.9:
  - L3: gate sensitive actions on `email_verified` before order placement - still an open decision.
  - L4: CORS allowlist if Vercel preview deploys need to call the API.
  - Info-4: `npm audit` - transitive advisories in `hono`/`multer`/`platform-express`.

---

## Phase 6 milestone table

Full scope decisions: **`.omc/plans/2026-06-21-phase6-ecommerce.md`**.
ADRs locked: **D32-D41** in `docs/DECISIONS.md`.

| # | Milestone | Status |
|---|-----------|--------|
| 6.0 | Foundations - schema (10 models incl. `WebhookEvent` idempotency ledger), migration, ADRs D32-D37, `.env.example` | ✅ done - PR #17 |
| 6.1 | Customer accounts & auth - separate `customer-jwt` principal, addresses CRUD (IDOR-safe), email-token verify/reset, throttler, security-reviewed | ✅ done - PRs #18/#19 |
| 6.2 | Cart - server `Cart`/`CartItem` + Zustand guest store, merge-on-login, price re-read | ✅ done - PR #20 |
| 6.3 | Checkout & orders - totals engine, `Order`/`OrderItem` snapshots, stock reserve/release, state machine | ✅ done - PR #21 |
| 6.4 | Razorpay payments - Orders API, dual HMAC verify, webhook + idempotency; C9 abandoned-checkout expiry (D40, D41) | ✅ done - PRs #22/#23 |
| 6.5 | GST invoicing - HSN, CGST/SGST/IGST, sequential invoice numbers, PDF | ⬜ todo - needs accountant inputs |
| 6.6 | Shipping (Shiprocket) - serviceability/rates, AWB/label, tracking webhook | ⬜ todo - needs Shiprocket account |
| 6.7 | Email (Resend) - replace `EmailService` stub, verified domain | ⬜ todo - needs Resend domain verify |
| 6.8 | Admin order management UI | ⬜ todo - unblocked |
| 6.9 | Hardening & Playwright e2e (full purchase, cross-principal test) | ⬜ todo |
| 6.10 | Go-live (gated on Razorpay + Shiprocket KYC, Render Starter upgrade) | ⬜ todo |

---

## Phase milestone log

Append-only.
Update only at phase boundaries or feature merges.

- _(2026-05-24)_ **Phases 0-3 done.** Monorepo scaffold (NestJS, Next.js, Prisma 7, Neon, GitHub
  Actions CI); catalog backend (categories/materials/colors/products public API with filter/sort/
  pagination); JWT admin auth + Cloudinary upload; Next.js storefront (home, catalog, product
  detail).
  PRs #1-#3.
- _(2026-06-20)_ **Phase 4 done.** Admin UI (login, CRUD for all catalog entities, Chakra UI v3,
  design tokens, image upload via Cloudinary).
  Golden path verified against live Neon DB.
- _(2026-06-20)_ **Phase 5.5 done.** Storefront restyled to Ethos & Hearth Stitch mockups; mobile
  QA pass (hamburger nav, collapsible filter sidebar - D23); Phase 5 deploy to Render + Vercel,
  domain swap to sunfabb.com (D24-D26, PR #7); Playwright e2e + CI hardening Phase 5.7 (D27-D29).
- _(2026-06-21)_ **Audit PR #16 done.** Storefront API contract drift (D30) + JWT_SECRET fallback
  (D31) found and fixed.
- _(2026-06-25)_ **Phase 6.1 frontend done** (PR #19).
  `(shop)/account` route group; register/login/forgot-password/reset-password/verify-email; account
  dashboard (profile + address CRUD + order-history placeholder); deny-by-default `/account/**`
  middleware.
  Browser-verified golden path.
- _(2026-07-03)_ **Phase 6.2/6.3 done** (PRs #20/#21).
  Server cart with Zustand guest store and merge-on-login; checkout totals engine, order snapshots,
  stock reservation, state machine.
- _(2026-07-10)_ **Phase 6.4 done - Razorpay payments** (PR #22).
  Backend `payments/` (Razorpay SDK wrapper, dual HMAC, idempotent confirm/fail) + `webhooks/`
  (raw-body verified, `WebhookEvent`-deduped).
  Frontend `CheckoutClient` opens hosted Checkout via `next/script`.
  215 backend tests + 165 frontend tests green.
  `security-reviewer` + `code-reviewer` pass caught and fixed the `payment.failed`-terminal oversell
  bug before shipping (D40).
- _(2026-07-10)_ **C9 closed - abandoned-checkout expiry** (PR #23).
  `OrderExpiryService` with hourly `@Cron` sweep; `POST /admin/expiry/orders` admin endpoint;
  `order.expired` handler in `WebhooksService`; `releaseByOrderId` promoted to public on
  `PaymentsService` (D41).
- _(2026-07-14)_ **Variant-aware product gallery** (PR #24).
  Product detail page now filters images by selected variant; gallery updates on variant switch.
- _(2026-07-16)_ **Docs roadmap refresh** (PR #25).
  HANDOFF/PLAN/GROWTH/WORKFLOW/CLAUDE.md updated to reflect merged state; Growth Wave 0 formalized
  as Phase 7; two-stream focus documented (D42).
- _(2026-07-17)_ **UX Phase A - perceived performance** (PR #30 - pending merge).
  `AbortSignal.timeout(8000)` on all backend fetches; `/catalog` restructured to Suspense-stream
  (shell renders in <100ms, grid streams in behind a skeleton); `loading.tsx`/`error.tsx`/
  `not-found.tsx` added to all storefront routes; `NEXT_PUBLIC_API_URL` env reconciliation
  (renamed from `NEXT_PUBLIC_BACKEND_URL`); fail-fast on missing var in production.
  Backend `compression()` was already present.
  24 test files, 216 tests green; `next build` clean (31 pages).
- _(2026-07-17)_ **UX Phase B - motion foundations** (PR #31, merged).
  `motion` v12 installed; motion tokens (`--ease-out-expo`, `--ease-in-out-soft`, 150/250/450ms
  durations) added to `globals.css @theme`; motion primitives (`Reveal`, `StaggerGroup`/
  `StaggerItem`, `MotionProvider`) created in `components/motion/`; `MotionProvider`
  (`MotionConfig reducedMotion="user"`) mounted in storefront layout for global
  prefers-reduced-motion support.
  `ProductCard` extracted into `components/product/product-card.tsx` (hover scale 1.03, press
  0.98, ease-out-expo 450ms) - replaces three inline copies in home, catalog, and product detail.
  `Header` client component replaces the static inline header: scroll-aware (compact h-14 +
  stronger blur after 24px); `<details>` mobile menu replaced with `AnimatePresence` slide-in
  overlay panel (backdrop fade, body scroll lock, Esc close, focus trap).
  Consistent `focus-visible:ring-2 ring-primary ring-offset-2` on all tiles, nav links,
  pagination, VariantSelector size/material/color/add-to-cart buttons.
  Build clean (31 pages), 24 test files, 216 tests green, lint clean, storefront chunks 4-16 kB
  (no bloat).
- _(2026-07-17)_ **UX Phase C - home page redesign** (PR pending).
  `HeroSection` client component (`components/home/hero-section.tsx`): full-bleed viewport-height
  hero, Ken Burns scale animation on image (skipped under prefers-reduced-motion via MotionProvider),
  bottom-to-top gradient scrim, oversized Playfair headline at `clamp(2.5rem, 5vw+1rem, 5.5rem)`,
  staggered load reveal for headline/copy/CTA (delays 0/0.12/0.24s).
  Unsplash URL kept as placeholder with TODO comment - blocked on Cloudinary brand asset.
  Curated Collections: editorial tile layout - full-width feature banner (first category, `3/1`
  aspect desktop, `3/2` mobile) + portrait tiles below; overlay caption with gradient scrim; image
  scale + caption lift on hover; subtitle added to section heading.
  Featured Pieces: section header `Reveal` + subtitle tuned; `StaggerGroup`/`StaggerItem`/
  `ProductCard` retained from Phase B.
  Whitespace: sections raised to `py-14 md:py-24 lg:py-32` (56/96/128px).
  Build clean (31 pages), 24 test files, 216 tests green, lint clean.
- _(2026-07-17)_ **UX Phase D - catalog page redesign** (PR pending).
  Grid stagger: `StaggerGroup`/`StaggerItem` wrap the product grid with a `key` derived from filter
  params, so cards stagger-in on initial load AND replay on every filter/sort/page change.
  `CatalogPendingGrid` replaced CSS `opacity-50` with `motion.div animate={{ opacity: 0.4 }}`
  for a smooth fade-through during `useTransition`.
  Filters sidebar: custom styled checkboxes (hidden native input + branded box + CheckIcon SVG),
  animated color swatches (`whileHover scale:1.12`, `whileTap scale:0.92`), animated active-filter
  count badge (`AnimatePresence` scale+fade). Mobile `<details>` disclosure replaced with an
  `AnimatePresence` bottom-sheet drawer (backdrop fade at 0.25s, panel slide-up at 0.35s
  ease-out-expo, body scroll lock, Esc key close, close-on-backdrop tap, `role="dialog"` a11y).
  Result count: extracted to `CatalogResultCount` client component; count number animates
  with `AnimatePresence mode="wait"` `key={showing-total}` (fade up/down on change).
  Pagination: CSS hover/press states (`hover:bg-surface-container`, `active:scale-95`,
  `transition-all duration-150`); active page gets `scale-105 shadow-sm`.
  Empty state: `CatalogEmptyState` component - search-with-X SVG icon, "No products found" title,
  context-aware copy, "Clear all filters" `<Link href="/catalog">` button (only shown when filters
  are active).
  All constraints: no Chakra/Emotion on storefront routes; Ethos & Hearth tokens preserved;
  URL-param filter behavior unchanged (SEO safe); reduced-motion via `MotionProvider` in layout.
  Build clean (31 pages), lint clean, 24 test files, 216/217 tests green.
- _(2026-07-17)_ **Growth Wave 0 SEO shipped** (PR #26 + PR #28).
  `robots.ts`, `sitemap.ts` (live data, `updated_at`), `metadataBase`/`title.template`/OG/Twitter
  defaults, product `generateMetadata` (Cloudinary 1200x630 OG image, canonical), catalog
  `generateMetadata` (category-aware, canonical strips filter params), `noindex` on
  cart/checkout/account, four JSON-LD components (`Organization`+`WebSite`, `Product`+`Offer`,
  `BreadcrumbList`, `ItemList`) with XSS-safe `safeJsonLd()`, security headers in `next.config.ts`,
  `public/llms.txt`, semantic HTML on product pages, GA4 via `@next/third-parties`.
  Vercel env vars set: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` (G-PXJJRTCMXW).
  `BACKEND_URL` GitHub secret set.
  Google Search Console verified + sitemap submitted.
  Bing Webmaster Tools imported from Search Console.
  209/209 tests green.
