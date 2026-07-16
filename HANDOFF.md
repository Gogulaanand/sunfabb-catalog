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

## Current focus - two streams

Work is running on two parallel, non-blocking streams:

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

### Stream B - unblocked (Growth Wave 0 SEO)

This stream needs no vendor accounts and can start immediately on a separate branch.
The sitemap and JSON-LD components read live DB data, so even the 3 products already live on
sunfabb.com give them something real to serve.

Full plan: **`docs/GROWTH.md`** (Phase 7 of the build plan).

Immediate Wave 0 scope (pure-code, no external accounts):
- `app/robots.ts`, `app/sitemap.ts` (read live product `updated_at` - small backend field exposure
  needed first)
- `metadataBase`, `title.template`, site-wide OG/Twitter defaults in `app/layout.tsx`
- Product/catalog/home `generateMetadata` with OG images via Cloudinary transform
- JSON-LD components: `Organization`, `Product`+`Offer`, `BreadcrumbList`, `ItemList`
- `robots: { index: false }` on cart/checkout/account pages
- GA4 via `@next/third-parties`

Trust pages (`/about`, `/contact`, `/privacy-policy`, `/terms`, `/shipping-policy`,
`/returns-policy`, `/faq`) are deferred until the owner supplies business inputs (entity name,
GSTIN display preference, contact channels, return window, shipping coverage).
These are prerequisites for Razorpay live mode and Google Merchant Center anyway, so Wave 0 ships
without them.

**Next unblocked app milestone after Wave 0:** 6.8 admin order-management UI (order list/detail +
status transitions via the existing `transition()` guard) - no vendor account needed.

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
  Upgrade to Render Starter ($7/mo) at Wave 2 go-live (Phase 6.10); consider pulling it forward to
  Wave 0 since $7/mo buys crawlability immediately.
- **`home.sunfabb.com`** (old personal homepage, Vercel project `website`) has a broken deployment
  and an expired wildcard cert (`*.sunfabb.com`, expired June 2021).
  Unrelated to the catalog - needs separate attention.
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
- _(2026-07-16)_ **Docs roadmap refresh** (this PR).
  HANDOFF/PLAN/GROWTH/WORKFLOW/CLAUDE.md updated to reflect merged state; Growth Wave 0 formalized
  as Phase 7; two-stream focus documented (D42).
