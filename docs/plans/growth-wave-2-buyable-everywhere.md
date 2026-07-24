# Growth Wave 2 - Be buyable everywhere

**Parent plan:** `docs/GROWTH.md` (§3.6 Google Shopping, §3.8 Meta catalog, §3.9 WhatsApp, §3.10 ONDC, §3.11 email/retention, §3.13 conversion events + reporting).
**Gate:** Phase 6.10 go-live complete (live payments, shipping, invoices, emails) + Wave 1 trust pages live.
**Branches:** `feature/growth-wave2-feeds` (feeds + events), `feature/growth-wave2-retention` (newsletter + email flows); owner-led channel setups ride a tracking issue.
This document is self-contained: an executor should be able to deliver the wave end-to-end from this file plus the cited source files.

---

## 1. Objective

Put the now-transactional catalog everywhere Indian buyers look: Google Shopping free listings, Meta/Pinterest catalogs, WhatsApp, and (as an experiment) ONDC - all fed by self-updating feed endpoints - plus the retention layer (conversion events, newsletter, post-purchase and abandoned-cart emails) that Wave 3 ads will need.

## 2. Owner inputs required

- [ ] Phase 6.10 sign-off (live payments + shipping working; this wave sends real buyers).
- [ ] Google Merchant Center account: create, verify `sunfabb.com`, business info + phone verification, shipping settings (mirror the 6.6 flat/free rule), return policy, accept free-listings terms (Claude prepares a click-by-click checklist; ~1-2 hours).
- [ ] Meta Commerce Manager: create catalog under the Wave 1 Business Suite; Pinterest catalog activation.
- [ ] WhatsApp Business: dedicated phone number, app setup, catalog import (manual; small catalog).
- [ ] ONDC: pick a Seller Network Participant (Mystore/SellerApp/eSamudaay), complete GST/PAN/bank KYC; Claude prepares the product-data export in their template.
- [ ] GA4: confirm Claude may add e-commerce events (measurement ID already live: `G-PXJJRTCMXW`).
- [ ] Decision: newsletter sender identity (reuses the 6.7 Resend domain).

## 3. Current state (grounding - do not re-derive)

- Backend: NestJS with full commerce modules (`backend/src/orders/`, `payments/`, `checkout/`, `webhooks/`, `email/`); public catalog API with zod-validated frontend consumption in `frontend/lib/api.ts`.
- Variant data has everything feeds need: `sku`, `price` (integer paise, GST-inclusive display per 6.5), `stock_quantity`, size/material/color relations, `Product.hsn_code`, Cloudinary image URLs, DB `updated_at`.
- Wave 0 shipped `ProductSchema` JSON-LD (Merchant Center cross-checks feeds against on-page structured data - already satisfied).
- Email: `backend/src/email/` is real post-6.7 (Resend transport, template functions in `backend/src/email/templates/`, never-throw contract); `EmailToken` model already implements hashed single-use tokens (reuse for double opt-in).
- Abandoned-checkout sweep exists: `OrderExpiryService` (hourly `@Cron`) expires stale `PENDING_PAYMENT` orders and releases stock (PR #23) - the abandoned-cart email extends this existing hook.
- GA4 is mounted via `@next/third-parties` in `frontend/app/layout.tsx`; **no e-commerce events fire yet** (deferred from Wave 0).
- Cart state: server cart + Zustand guest store (`frontend/` cart components, Phase 6.2); checkout client at `frontend/app/(storefront)/checkout/`.
- Constraints: Prisma only (D4), paise (D6), DTOs (D8), zod boundary (rule 11), fail-fast secrets (rule 12), tests per module (D9), Playwright for DB-backed e2e (D28).

## 4. Locked design decisions

- **D-W2-1 Feeds are backend endpoints reading the live DB** - `GET /feeds/google-merchant.xml` and `GET /feeds/meta-catalog.csv` - so they are permanently self-updating (Merchant Center/Meta fetch daily). No cron, no file generation, no manual re-uploads ever.
- **D-W2-2 One item per variant**; `item_group_id` = product id; `mpn` = SKU with `brand: Sunfabb` and `identifier_exists: no` (house-brand textiles have no GTINs).
- **D-W2-3 Feeds are public but obscure-path-free**: they are plain GET endpoints (feed URLs are secrets-free by design; Merchant Center cannot send auth). Rate-limit with the existing throttler; serve with a short cache header (e.g. `Cache-Control: public, max-age=900`).
- **D-W2-4 Pinterest ingests the Meta CSV format family** - one shared feed builder, two serializers max; do not build a third format unless Pinterest rejects the CSV.
- **D-W2-5 Newsletter = `Subscriber` table + double opt-in reusing the `EmailToken` pattern**; broadcasts sent via Resend from a small admin-triggered endpoint, not a marketing SaaS.
- **D-W2-6 Abandoned-cart email hooks the existing expiry sweep** (one email per expired order, throttled to one per customer per 7 days); no separate cart-watching infrastructure.
- **D-W2-7 GA4 events client-side via `sendGAEvent`** (`@next/third-parties`), fired at the natural UI points; `purchase` fires on the order-confirmation view after `/payments/verify` succeeds, deduped by order number in `sessionStorage`. Server-side measurement protocol → backlog (Wave 3 CAPI work may revisit).

## 5. Workstreams

### 5.1 Google Merchant feed (code)

1. New backend module `backend/src/feeds/` (Controller → Service; no DTO needed for GET-only, but validate query params if any).
2. `GET /feeds/google-merchant.xml`: RSS 2.0/Atom per Google spec; per variant: `g:id` (SKU), `title` ("<Product> - <Size> <Color> <Material>"), `description`, `link` (product URL + variant params), `g:image_link` (Cloudinary primary, transformed to spec size), `g:price` "1250.00 INR" GST-inclusive (matches PDP exactly - India requirement), `g:availability` from `stock_quantity`, `g:brand` Sunfabb, `g:mpn` SKU, `g:identifier_exists` no, `g:item_group_id`, `g:condition` new, `g:google_product_category` (Home & Garden > Linens & Bedding subtree per category mapping const), `g:shipping` mirroring the 6.6 flat/free rule (India requires shipping info).
3. Exclude soft-deleted/inactive products and variants; zero-stock variants stay listed as `out_of_stock`.
4. Unit tests: XML validates against fixtures, paise → "1250.00 INR" formatting, inactive exclusion, availability mapping, escaping of `&`/`<` in names.
5. Owner checklist doc section: MC account, scheduled fetch of the feed URL, shipping + returns config in MC (values from 6.6/Wave 1), free-listings opt-in.

### 5.2 Meta / Pinterest catalog feed (code)

1. `GET /feeds/meta-catalog.csv` from the same feed builder: Meta CSV columns (`id`, `title`, `description`, `availability`, `condition`, `price`, `link`, `image_link`, `brand`, `item_group_id`, `size`, `color`, `material`).
2. CSV escaping tested (commas/quotes in product names).
3. Owner: connect in Commerce Manager (scheduled fetch), enable IG product tagging; claim + connect in Pinterest.
4. From this point, the Wave 1 social calendar tags products in posts.

### 5.3 Conversion events (code - the Wave 3 gate)

1. Frontend GA4 e-commerce events via `sendGAEvent`: `view_item_list` (catalog grid), `view_item` (PDP), `add_to_cart` (VariantSelector success), `begin_checkout` (checkout entry), `purchase` (order-confirmation state; value = `total_paise / 100`, currency INR, items from the order; dedupe per D-W2-7).
2. A tiny typed helper (`frontend/lib/analytics.ts`) so event shapes are consistent and unit-testable; no-op when the measurement ID env is absent (dev).
3. Vitest: helper emits correct payloads; purchase dedupe works.
4. Manual: verify each event in GA4 DebugView on a test-mode purchase; mark the funnel (view → cart → checkout → purchase) visible in GA4 before declaring Wave 3 unblocked.

### 5.4 Newsletter + retention emails (code)

1. Prisma: `Subscriber { id, email unique, confirmed_at?, unsubscribed_at?, created_at }` (one migration); double opt-in via `EmailToken`-style hashed token (new type value or a parallel small table - follow the existing pattern in `backend/prisma/schema.prisma`).
2. Endpoints: `POST /newsletter/subscribe` (throttled, always-200 to avoid enumeration), `GET /newsletter/confirm?token=`, `GET /newsletter/unsubscribe?token=` (one-click, List-Unsubscribe header on broadcasts).
3. Frontend: footer signup component + soft inline CTA on guide pages (no popover nagging - brand call).
4. Post-purchase flow additions (call sites in the existing order-confirmation email path): review-request email T+7 days after `DELIVERED` (needs a tiny scheduled check piggybacking the existing `@Cron` service) linking to the GBP review URL (Branch A) or a feedback mailto (Branch B); care-guide email matched to the purchased category (links the Wave 1 guides).
5. Abandoned-cart email: in `OrderExpiryService`, when expiring a `PENDING_PAYMENT` order, send one "complete your purchase" email with the cart contents and a checkout link (throttle per D-W2-6; unsubscribe honored).
6. Monthly newsletter: generated by the content engine as a draft, sent via a guarded admin endpoint `POST /admin/newsletter/send` after owner approval; recipients = confirmed, not-unsubscribed subscribers, batched to respect Resend rate limits.
7. Tests: opt-in/confirm/unsubscribe flows (unit), enumeration-safe responses, expiry-sweep email throttle, broadcast batching; all email sends inherit the never-throw contract.

### 5.5 WhatsApp Business (owner-led)

Owner sets up the app with the checklist Claude prepares: profile, manual catalog import (small catalog), quick replies from the FAQ.
Code change: floating "Chat on WhatsApp" button (click-to-chat deep link with a prefilled message) on PDP + contact page, styled to the design system, `rel="noopener"`.
API tier / shared inbox → backlog until volume justifies it.

### 5.6 ONDC experiment (owner-led)

Owner completes SNP onboarding; Claude generates the product export matching the chosen SNP's template from live data (one-off script in `tools/`, rerunnable).
Logistics rides the existing Shiprocket account.
Time-boxed: review at 90 days - first order or drop it (decision recorded in `docs/DECISIONS.md`).

### 5.7 Weekly automated report (code, small)

Scheduled GitHub Action (weekly cron) or Claude scheduled agent pulling Search Console API + GA4 Data API into a dated markdown report committed to `docs/reports/` (or emailed): impressions, clicks, top queries, sessions by channel, AI-referral segment, conversion counts, MC approved-product count (manual paste until the Content API is worth it → backlog).
Owner grants API access once.

## 6. Env & config

| Var | Where | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Vercel | already set | events no-op without it |
| Search Console + GA4 API credentials | GitHub Actions secrets | for §5.7 | service-account JSON, least privilege |

No new backend secrets; feeds are public by design (D-W2-3).

## 7. Test plan

- Backend unit: feed serialization (XML + CSV) against fixtures, exclusion rules, price formatting, escaping; newsletter flows; abandoned-cart throttle; review-request scheduling.
- Frontend: analytics helper payloads + dedupe; signup component states.
- Playwright: subscribe → confirm → unsubscribe against a live server; feed endpoints return 200 with correct content types; purchase event fires on the confirmation page (assert dataLayer/gtag call via page hooks).
- Manual: Merchant Center feed fetch succeeds and variants approve; GA4 DebugView funnel; WhatsApp share + click-to-chat.

## 8. Acceptance criteria / KPIs (from GROWTH §3.6-3.13)

1. 100% of active variants approved in Merchant Center; free-listing clicks visible in MC reports.
2. IG product tagging live on new posts; Pinterest catalog ingesting.
3. GA4 shows the full e-commerce funnel including `purchase` (this is the Wave 3 gate - record it explicitly).
4. Newsletter live with double opt-in; abandoned-cart email sending; review-request flow firing post-delivery.
5. WhatsApp click-to-chat live; ONDC listed on one SNP (or a recorded decision not to).
6. First weekly report generated without human touch.

## 9. Out of scope (→ backlog / Wave 3)

Paid ads and Meta Pixel/CAPI (Wave 3), Amazon/Flipkart, WhatsApp Business API tier, MC Content API automation, server-side GA4 measurement protocol, popover email capture.

## 10. Verification commands

```bash
cd backend && npm run lint && npx tsc --noEmit && npm run test
cd frontend && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Plus the Playwright suite, a Merchant Center test fetch, and a GA4 DebugView walkthrough of one test purchase.
