# Phase 6 — Full E-Commerce Build Plan

**Status:** **IN PROGRESS.** 6.0 Foundations ✅ (PR #17) and 6.1 customer-auth backend ✅ (PR #18,
security-reviewed) are built; the 6.1 frontend is next. Live milestone status, the 6.1 security-hardening
backlog, and the ready-to-paste frontend handoff prompt are tracked in `HANDOFF.md` → "Phase 6 —
e-commerce (IN PROGRESS)". Decisions C1/C2/C4/C6/C7 are locked as ADRs D32–D37; D38 records the accepted
stateless-session tradeoff (revisit before 6.3).

**Date:** 2026-06-21
**Author:** planning session (`/plan`)
**Supersedes:** the one-line "Phase 6 (future)" stub in `HANDOFF.md` and `docs/PLAN.md` §12.

---

## 0. Scope decisions captured this session

The owner selected the most complete option on every axis. These are now the working assumptions
for this plan (each becomes a formal ADR in `docs/DECISIONS.md` when its milestone starts):

| Axis | Decision | Consequence |
|---|---|---|
| **Customer identity** | **Full customer accounts** (register/login/reset, saved addresses, order history) | New customer-auth subsystem, distinct from the single-admin JWT. Largest PII surface. |
| **Tax** | **GST-registered, itemized** (HSN, CGST/SGST/IGST, compliant invoice) | Tax engine + sequential invoice numbering + PDF. Legal-compliance scope. |
| **Shipping** | **Courier API — Shiprocket** (live rates, label, AWB tracking) | Vendor integration #2, weight data on variants, tracking webhooks. |
| **Payments** | **Razorpay test-mode now, live gated on KYC** | Full Orders+webhook+idempotency built on test keys; go-live is a gated final milestone. |

**Out of scope for Phase 6** (explicitly deferred; note here so the boundary is visible):
discount/coupon engine, gift cards, product reviews/ratings, wishlists, multi-currency,
multi-warehouse inventory, marketplace/multi-vendor, subscriptions, abandoned-cart marketing,
loyalty/points, and a mobile app. Refunds are **in scope but minimal** (admin-triggered full/partial
via Razorpay; no self-service returns portal).

---

## 1. Requirements summary

Turn the read-only catalog into a transactional store where a customer can: create an account,
browse, add variants to a cart, check out with a real shipping address, pay via Razorpay, and
receive an order confirmation + GST invoice + shipment tracking — while the single admin manages
orders, payments, and fulfilment from the existing admin UI.

The build must hold the line on every existing hard rule (`CLAUDE.md` 1–12): Prisma only / no raw
SQL (D4), money as integer paise (D6), soft deletes on catalog rows (D7), DTO + class-validator on
every input (D8), boundary validation not casting (rule 11 / D30), and fail-fast required secrets
(rule 12 / D31). Payments and PII raise the security bar substantially — see §7.

---

## 2. What exists today (grounding)

- **Schema** (`backend/prisma/schema.prisma`): catalog only — `Category`, `Material`, `Color`,
  `Product`, `ProductVariant`, `ProductImage`. **No** `Customer`, `Order`, `OrderItem`, `Address`,
  `Payment`, `Shipment`, `Invoice`, or `Cart` models. `ProductVariant` already has
  `price Int` (paise) and `stock_quantity Int` — the two fields ordering will consume.
- **Backend** (`backend/src/`): modules `categories`, `colors`, `materials`, `products`, `variants`,
  `images`, `admin`, `auth`, `prisma`. Single-admin JWT in `auth/`; secret resolved fail-fast via
  `backend/src/auth/jwt-secret.ts` (`getJwtSecret()`, D31) and consumed by `auth/auth.module.ts` +
  `auth/strategies/jwt.strategy.ts`. Admin password is a bcrypt hash (`ADMIN_PASSWORD_HASH`).
- **Frontend** (`frontend/app/`): `(storefront)` route group (home, catalog, product detail) with its
  own layout; `admin` route group with deny-by-default middleware + server-only `lib/admin-api.ts`;
  storefront fetches validated with zod at the boundary in `frontend/lib/api.ts` (D30).
- **Infra:** backend on Render free tier (`sunfabb-backend`, sleeps after 15 min idle, 30–60s cold
  start — D25/HANDOFF), frontend on Vercel (`sunfabb-storefront`, apex `sunfabb.com`), DB on Neon
  (SSL required, `?sslmode=require`). Cloudinary for images.
- **Testing constraints that shape this plan:**
  - **D28** — Prisma 7's wasm query compiler cannot load under Jest/ts-jest (CJS). Any DB-backed test
    that boots `AppModule` through Nest's `TestingModule` hits a dynamic-import wall. **DB-backed e2e
    must run via Playwright against a live `node dist/src/main.js` server** (the Phase 5.7 pattern in
    `.github/workflows/ci.yml`), not Jest. Unit tests mock the generated client (`__mocks__/prisma-client`).
  - **D29** — `PrismaPg` SSL must stay conditional on `sslmode=require`; the CI Postgres service
    container speaks no TLS.
  - **D17** — Prisma can't `orderBy` a scalar aggregate of a to-many relation in this version; app-code
    sort is the accepted workaround. Relevant if order lists sort by computed totals.

---

## 3. Data model additions

All new models follow existing conventions: `uuid` string PKs, `snake_case` columns, integer-paise
money, `created_at`/`updated_at`. **One migration per milestone**, never a single mega-migration, so
each is reviewable and reversible. No raw SQL (D4).

### 3.1 New models (proposed)

```
Customer
  id              uuid pk
  email           string unique
  password_hash   string                 ← argon2id or bcrypt (see Decision C7)
  full_name       string?
  phone           string?
  email_verified  boolean default false
  is_active       boolean default true   ← soft-disable; erasure handled separately (Decision C5)
  created_at, updated_at

Address                                   ← reusable shipping/billing addresses
  id            uuid pk
  customer_id   fk → Customer
  full_name, phone, line1, line2?, city, state, pincode, country (default "India")
  is_default    boolean default false
  created_at, updated_at

EmailToken                                ← email verification + password reset (one table, typed)
  id          uuid pk
  customer_id fk → Customer
  token_hash  string                      ← store a hash, never the raw token
  type        enum(VERIFY_EMAIL, PASSWORD_RESET)
  expires_at  datetime
  used_at     datetime?
  created_at

Cart                                       ← server cart for logged-in customers (Decision C1)
  id          uuid pk
  customer_id fk → Customer unique
  updated_at

CartItem
  id          uuid pk
  cart_id     fk → Cart
  variant_id  fk → ProductVariant
  quantity    int                          ← price is NEVER stored here; re-read at checkout
  @@unique([cart_id, variant_id])

Order
  id                uuid pk
  order_number      string unique          ← human-facing, e.g. SF-2026-000123 (Decision C2)
  customer_id       fk → Customer
  status            enum OrderStatus        ← see §3.2 state machine
  email             string                  ← snapshot at order time
  subtotal_paise    int
  shipping_paise    int default 0
  tax_paise         int default 0           ← sum of per-item CGST+SGST+IGST
  discount_paise    int default 0           ← reserved (coupons out of scope; keeps totals math whole)
  total_paise       int                     ← subtotal + shipping + tax − discount
  currency          string default "INR"
  shipping_address  json                    ← denormalized snapshot, not an FK (addresses can change)
  billing_address   json?
  razorpay_order_id string? unique
  razorpay_payment_id string?
  invoice_number    string? unique          ← sequential per FY (Decision C3)
  placed_at         datetime?               ← set when payment confirmed
  created_at, updated_at

OrderItem                                   ← FROZEN snapshot of what was bought
  id              uuid pk
  order_id        fk → Order
  variant_id      fk → ProductVariant       ← reference kept, but all display fields snapshotted:
  product_name    string
  variant_label   string                    ← e.g. "King · Indigo · 100% Cotton"
  sku             string
  hsn_code        string?
  unit_price_paise int
  quantity        int
  tax_rate_bps    int                       ← basis points, e.g. 500 = 5%
  cgst_paise, sgst_paise, igst_paise int default 0
  line_total_paise int

Payment                                     ← payment attempt/result record
  id                  uuid pk
  order_id            fk → Order
  razorpay_payment_id string? unique
  razorpay_order_id   string?
  amount_paise        int
  status              enum(CREATED, AUTHORIZED, CAPTURED, FAILED, REFUNDED, PARTIALLY_REFUNDED)
  method              string?               ← upi/card/netbanking, from Razorpay
  refunded_paise      int default 0
  created_at, updated_at

WebhookEvent                                ← idempotency ledger for ALL inbound webhooks
  id           uuid pk
  provider     enum(RAZORPAY, SHIPROCKET)
  event_id     string                       ← provider's event id
  event_type   string
  payload      json
  processed_at datetime?
  @@unique([provider, event_id])            ← dedupe key; the "rite of passage" (docs/PLAN.md §12)

Shipment
  id                 uuid pk
  order_id           fk → Order unique
  shiprocket_order_id string?
  awb_code           string?
  courier_name       string?
  label_url          string?
  tracking_url       string?
  status             string?                ← mirrors Shiprocket status
  shipped_at, delivered_at  datetime?
  created_at, updated_at
```

### 3.2 Order status state machine

```
PENDING_PAYMENT ──pay ok──► PAID ──admin──► PROCESSING ──ship──► SHIPPED ──► DELIVERED
       │                      │
       ├─pay fail/timeout─► PAYMENT_FAILED        └─admin refund─► REFUNDED / PARTIALLY_REFUNDED
       └─customer/admin──► CANCELLED
```

Transitions are enforced in the service layer (a single `transition(order, next)` guard), not by
trusting the client. Stock is decremented on entry to `PAID`, released on `PAYMENT_FAILED`/`CANCELLED`.

### 3.3 Changes to existing models

- `ProductVariant`: add `weight_grams Int?` (Shiprocket rate/serviceability needs weight) and
  `hsn_code String?` (or put `hsn_code` on `Product`/`Category` — Decision C4). Additive, nullable —
  no backfill required, existing rows stay valid.
- No change to money representation — `price Int` paise is reused directly (D6).

---

## 4. API surface (new)

All public-write/customer endpoints get DTOs + class-validator (D8); all customer-scoped reads
filter by `customer_id` from the **token**, never from the request body/param (IDOR defense, §7).

```
Customer auth (cookie JWT, SEPARATE secret/guard from admin — Decision C6)
  POST   /auth/customer/register
  POST   /auth/customer/login
  POST   /auth/customer/logout
  POST   /auth/customer/verify-email
  POST   /auth/customer/forgot-password
  POST   /auth/customer/reset-password
  GET    /auth/customer/me

Addresses (customer-guarded)
  GET/POST/PATCH/DELETE  /me/addresses[/:id]

Cart (customer-guarded)
  GET    /me/cart
  POST   /me/cart/items          { variantId, quantity }
  PATCH  /me/cart/items/:id      { quantity }
  DELETE /me/cart/items/:id

Checkout / Orders (customer-guarded)
  POST   /checkout/quote         ← server recomputes subtotal+shipping+GST, returns a priced quote
  POST   /orders                 ← creates Order(PENDING_PAYMENT) + Razorpay order, returns rzp params
  POST   /payments/verify        ← client callback: verify signature, optimistic confirm
  GET    /me/orders              ← list (own only)
  GET    /me/orders/:orderNumber ← detail + tracking (own only)

Shipping
  POST   /shipping/serviceability ← {pincode, weight} → courier options + rates (Shiprocket)

Webhooks (no auth guard; verified by signature, raw body)
  POST   /webhooks/razorpay      ← payment.captured / order.paid / refund.* — source of truth
  POST   /webhooks/shiprocket    ← tracking status updates

Admin (existing admin JWT)
  GET    /admin/orders           ← list/filter/paginate
  GET    /admin/orders/:id
  PATCH  /admin/orders/:id/status
  POST   /admin/orders/:id/refund        ← Razorpay refund (full/partial)
  POST   /admin/orders/:id/ship          ← create Shiprocket shipment, get AWB/label
  POST   /admin/orders/:id/resend-email
  GET    /admin/orders/:id/invoice       ← GST invoice PDF
```

Proposed new backend modules (mirror Controller→Service→DTO, `CLAUDE.md` 9):
`customer-auth/`, `customers/`, `addresses/`, `cart/`, `checkout/`, `orders/`, `payments/`,
`webhooks/`, `shipping/`, `invoices/`, `email/`, and `admin/orders/`.

---

## 5. Milestones

Sequenced so the critical revenue path (account → cart → checkout → pay) is reachable early, the
"rite of passage" (webhooks + idempotency) lands mid-plan, and the externally-gated pieces (GST
invoice format, Shiprocket live, Razorpay live) come last. Each milestone is its own
`feature/phase6.x-*` branch, PR to `main`, CI green before merge (D16).

| # | Milestone | Core deliverable | External gate |
|---|---|---|---|
| **6.0** | Foundations | Full schema migration (§3), env/secret plan (§6), ADRs for C1–C10, vendor sandbox accounts | Razorpay/Shiprocket/Resend sandbox sign-up |
| **6.1** | Customer accounts & auth | register/login/verify/reset, Address CRUD, separate customer guard + middleware, `@nestjs/throttler` on auth routes, IDOR-safe queries | — |
| **6.2** | Cart | server `Cart`/`CartItem`, Zustand client store, merge-on-login, price never trusted from client | — |
| **6.3** | Checkout & orders | totals engine (subtotal+shipping placeholder+GST), `Order`/`OrderItem` snapshots, stock reservation + release, state machine | — |
| **6.4** | Razorpay payments (test) | Orders API, hosted Checkout, signature verify (callback **and** webhook), `WebhookEvent` idempotency ledger, stock confirm/release | Razorpay **test** keys |
| **6.5** | GST invoicing | HSN per item, CGST/SGST/IGST (intra vs inter-state), sequential invoice numbering, compliant PDF, store + deliver | Accountant sign-off on format/rates |
| **6.6** | Shipping (Shiprocket) | serviceability+rates at checkout, create shipment on `PAID`, AWB/label, tracking webhook → status sync | Shiprocket account (sandbox→live KYC) |
| **6.7** | Email (Resend) | verified sending domain, order-confirmation/shipping/auth emails, failure-resilient (never fails a webhook) | Resend domain DNS verify |
| **6.8** | Admin order management | order list/detail, status update, refund, ship, resend, invoice — in existing admin UI | — |
| **6.9** | Hardening & e2e | Playwright full-purchase e2e (live server, D28), `security-reviewer` pass, abuse/rate tests, pending-order cleanup job, observability/runbook | — |
| **6.10** | Go-live (gated) | live Razorpay + Shiprocket keys, reconciliation, test→live cutover checklist, monitoring, Render plan decision | **Razorpay + Shiprocket KYC**, Render Starter |

Estimated relative size (not a deadline — D-no-timeline): 6.1, 6.3, 6.4 are the largest; 6.0, 6.2,
6.7, 6.8 medium; 6.5, 6.6, 6.10 gated and partly out of the owner's hands.

---

## 6. Configuration & secrets

Every required secret below must **fail-fast at boot** (rule 12 / D31) via the
`getJwtSecret()`-style single-source pattern in `backend/src/auth/jwt-secret.ts`; never a fallback
default. Optional/non-security config may keep a default.

| Var | Required | Notes |
|---|---|---|
| `CUSTOMER_JWT_SECRET` | yes | distinct from `JWT_SECRET`; customer ≠ admin principal |
| `CUSTOMER_JWT_EXPIRES_IN` | no (default `7d`) | |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | yes | test keys for 6.4–6.9; live keys gated to 6.10 |
| `RAZORPAY_WEBHOOK_SECRET` | yes | separate from API key; used for `X-Razorpay-Signature` |
| `RESEND_API_KEY` / `EMAIL_FROM` | yes (6.7) | `EMAIL_FROM` on a verified domain |
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` | yes (6.6) | token cached + refreshed (~10-day expiry) |
| `SHIPROCKET_WEBHOOK_TOKEN` | yes (6.6) | validates inbound tracking webhooks |
| `SELLER_GSTIN` / `SELLER_STATE_CODE` | yes (6.5) | drives intra- vs inter-state GST split |
| `INVOICE_SERIES_PREFIX` | no | e.g. `SF` |
| `APP_BASE_URL` | yes | for email links, Razorpay callback, webhook registration |

Add each to the Render dashboard env (never a file) and to the CI env block in
`.github/workflows/ci.yml` for any job that boots `start:prod` (the e2e job already needs this per
D31). Document the full set in `backend/.env.example`.

---

## 7. Security (payments + PII)

This is the section the request flagged. Treated as acceptance-gating, not advisory.

### 7.1 Payments
- **PCI scope:** use Razorpay **hosted Checkout** (their JS collects card/UPI) so **card data never
  touches our server or DB** → keeps us at PCI-DSS **SAQ-A**. Never accept, log, or store PAN/CVV.
  Document this explicitly; it is the single biggest compliance simplifier.
- **Server is the price authority:** `/checkout/quote` and `/orders` recompute subtotal, shipping,
  and tax from the DB every time. The client never sends an amount we trust. Razorpay order amount is
  set server-side from the recomputed total.
- **Dual signature verification:** verify the callback signature
  `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)` on `/payments/verify`, and
  independently verify `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` on
  `/webhooks/razorpay`. A tampered signature ⇒ 400, order stays `PENDING_PAYMENT`.
- **Webhook = source of truth.** The client callback is optimistic UX only. Order→`PAID`, stock
  decrement, invoice, fulfilment, and email are driven by the verified webhook. Handle the race where
  webhook arrives before/after the callback — both paths converge idempotently.
- **Idempotency ledger:** `WebhookEvent (@@unique[provider, event_id])` + idempotent payment-id
  handling. Re-delivered webhooks (Razorpay retries) must be no-ops, never double-decrement stock or
  double-email. This is the explicit "webhooks + idempotency" rite of passage in `docs/PLAN.md` §12.
- **Raw body for HMAC:** NestJS globally JSON-parses bodies; the webhook route needs the **raw**
  buffer for signature verification (re-serialized JSON breaks the HMAC). Configure `rawBody` for the
  webhook routes in `main.ts`. *(Real NestJS gotcha — flag for the executor.)*

### 7.2 Customer auth & PII
- **Separate principal:** customer auth is a distinct domain from the single admin (D10 is about admin
  roles, not actor types — adding customers does **not** introduce an admin role system). A customer
  token must never satisfy an admin guard and vice-versa: different secret, cookie name, guard,
  strategy. **Verify with a test** that a customer JWT is rejected by every `/admin/**` route.
- **Password storage:** argon2id (preferred) or bcrypt cost ≥ 12 (Decision C7). Never reversible.
- **Reset/verify tokens:** random ≥ 32 bytes, **stored hashed** (`EmailToken.token_hash`), single-use
  (`used_at`), short TTL. Reset response is identical whether or not the email exists (no account
  enumeration).
- **Rate limiting:** `@nestjs/throttler` on register/login/forgot-password/verify and on
  `/orders`/`/payments/verify`. Login lockout/backoff on repeated failures.
- **Cookie auth:** httpOnly + Secure + SameSite (mirror the admin cookie pattern). Because auth is
  cookie-based, add CSRF protection (SameSite=Strict/Lax + a CSRF token on state-changing POSTs) — a
  decision to confirm (C8).
- **IDOR / BOLA (OWASP A01):** every `/me/*` and order query is scoped by the token's `customer_id`.
  Requesting `/me/orders/SF-...` belonging to another customer ⇒ 404 (not 403, to avoid confirming
  existence). **Explicit test per resource.**
- **Validation at both boundaries:** DTOs + class-validator server-side (D8); zod at the Next.js fetch
  boundary for every new response shape (rule 11 / D30) — do not reintroduce `as` casts.
- **Data minimization & retention:** store only what fulfilment needs. **DPDP Act 2023** (India) gives
  customers erasure rights, which collides with soft-delete-only (D7) and with GST's multi-year
  record-retention requirement. Resolution (Decision C5): on account deletion, **anonymize the
  `Customer` and keep the `Order`/invoice** (legally required tax record) with PII stripped/tokenized,
  rather than hard-deleting orders. Document a retention policy.
- **Secrets:** all of §6 fail-fast; none in the repo or frontend bundle. Razorpay `KEY_SECRET` and
  webhook secret are backend-only.
- **Logging:** log order/payment state transitions and webhook receipts (with event id) for audit;
  never log secrets, full PII, or card data (there is none).

### 7.3 Process
- A dedicated **`security-reviewer` agent pass** is an acceptance gate for 6.1 (auth) and 6.4
  (payments) before their PRs merge — author and review in separate passes (OMC verification rule).

---

## 8. Testing strategy

Respects D28 (no DB-backed tests through Nest's `TestingModule` under Jest) and D9 (tests per module).

- **Unit (Jest, mocked Prisma — `__mocks__/prisma-client`):** totals/GST math (intra vs inter-state,
  rounding in paise), order state-machine transitions, Razorpay signature verify, webhook idempotency
  dedupe, stock decrement/release, IDOR scoping helpers, password hashing/token logic. These are
  many, fast, and the highest-value unit surface.
- **Integration / DB-backed:** via **Playwright against a live `node dist/src/main.js`** + a real
  Postgres (extend the Phase 5.7 job in `.github/workflows/ci.yml`), **not** Jest e2e (D28). Covers:
  full purchase flow, webhook delivery (craft signed payloads / Razorpay test webhooks), order
  appears in admin, invoice generated.
- **External vendors:** mock Razorpay/Shiprocket/Resend SDKs in unit tests; use **sandbox/test keys**
  in e2e. Razorpay test cards + test-mode webhook simulation.
- **Security tests as first-class:** tampered-signature → 400 + no state change; replayed webhook →
  single effect; customer-A cannot read customer-B's order; admin route rejects a customer token;
  amount tampering on the client is ignored (server recompute wins).
- **CI:** keep `migrate deploy` from-scratch check (D-existing). Add the new env block (§6) to any
  `start:prod`-booting job.

---

## 9. Critical decisions still to make

These are open and should be resolved at each milestone's ADR (recommended default in **bold**).

- **C1 — Cart persistence.** Client-only (Zustand) / server-only / **hybrid: Zustand client + server
  `Cart` for logged-in, merge on login**. Hybrid is the realistic e-commerce pattern and matches the
  "accounts now" choice.
- **C2 — Order number scheme.** **`SF-{FY}-{zero-padded sequence}`**, generated server-side, unique,
  no gaps required (unlike invoices).
- **C3 — Invoice numbering.** GST requires a **unique, sequential, gap-free series per financial
  year**. Needs a dedicated sequence (DB sequence or a guarded counter row in a transaction). **Per-FY
  counter row updated inside the order-confirmation transaction.**
- **C4 — Where HSN lives.** On `Product`, `Category`, or `ProductVariant`. **On `Product`** (a design
  has one HSN; variants share it) — revisit if variants ever differ.
- **C5 — PII erasure vs retention (DPDP vs GST vs D7).** **Anonymize customer, retain order/invoice
  with PII stripped.** Needs a written retention policy and an erasure endpoint/runbook.
- **C6 — Customer session mechanism.** **Mirror the admin httpOnly-cookie JWT** with a separate
  secret/guard (consistency + learning continuity) rather than adopting Auth.js/NextAuth.
- **C7 — Password hash.** **argon2id**, fall back to bcrypt(≥12) if argon2 native build is awkward on
  Render.
- **C8 — CSRF strategy** for cookie auth. **SameSite=Lax + double-submit CSRF token** on POST/PATCH/
  DELETE.
- **C9 — Pending-order cleanup.** Abandoned `PENDING_PAYMENT` orders must release reserved stock.
  Needs a scheduled job (`@nestjs/schedule`) — but **Render free tier sleeps**, so a cron may not fire
  reliably. **Options:** Render Cron Job (paid), Vercel Cron hitting a guarded backend endpoint, or
  reconcile lazily on next read. Decide at 6.9. Ties into C-Render-plan.
- **C10 — GST rates & invoice format.** Exact HSN codes, textile slab rates (rate is configurable per
  HSN; **do not hardcode — confirm current rates with the owner's accountant**), and the legal invoice
  layout are a **compliance decision the owner must confirm**; the plan builds the mechanism, not the
  legal determination.

---

## 10. Blockers & external dependencies

| Blocker | Blocks | Mitigation / status |
|---|---|---|
| Razorpay **live** KYC (registered business) | 6.10 go-live only | Build 6.4–6.9 on **test keys** — not blocking. Live keys gated. |
| Shiprocket account + (live) KYC; limited sandbox | 6.6 (live), 6.10 | Build against sandbox; treat live as gated like Razorpay. |
| GST: GSTIN, HSN codes, correct rates, invoice format | 6.5 | Owner + accountant must supply. Plan builds configurable mechanism. |
| Resend verified sending domain (DNS on `sunfabb.com`) | 6.7 | Owner controls DNS via Vercel — low risk; add records. |
| **Render free tier sleep** (30–60s cold start; no reliable always-on cron) | webhook latency, C9 cleanup job, payment first-byte | Razorpay/Shiprocket retry webhooks, so cold start is tolerable but reconciliation must be robust. **Recommend Render Starter ($7/mo, no sleep) for production payments** — already foreshadowed in HANDOFF's host decision. |
| **DPDP Act 2023** obligations once storing PII | 6.1 onward | Retention/erasure policy (C5), data minimization, security §7. |
| Prisma 7 + Jest wasm wall (D28) | test design | Already resolved by Playwright-against-live-server approach (§8). |
| PR #6 (Web Vitals + keep-alive) still not on `main` (HANDOFF) | indirectly 6.10 perf | Land before go-live so cold starts are mitigated. |

---

## 11. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Client tampers with price/amount | High (bots probe) | Critical | Server recomputes all totals; Razorpay amount set server-side; never trust client amount. |
| Webhook replay double-processes (double stock decrement / double email) | Medium | High | `WebhookEvent` unique idempotency ledger + idempotent payment-id handling; tests for replay. |
| Customer reads another customer's order (IDOR) | Medium | High | Token-scoped queries only; 404 on cross-account; per-resource test. |
| Customer token accepted by admin route (privilege escalation) | Low | Critical | Separate secret/guard; explicit rejection test on every `/admin/**`. |
| Oversell on concurrent checkout | Low (scale ≤100, low traffic — D14) | Medium | Conditional decrement in a transaction (`updateMany where stock_quantity >= qty`); reserve→confirm→release. |
| GST computed wrong (legal/financial) | Medium | High | Configurable rates, accountant sign-off (C10), unit tests for intra/inter-state + paise rounding, sequential gap-free invoice numbers. |
| Razorpay signature/raw-body mishandled in NestJS | Medium | High | Configure `rawBody` for webhook route; verify against the documented HMAC; test tampered + valid. |
| Cold-start drops/delays a webhook | Medium | Medium | Providers retry; idempotent handlers converge; recommend Render Starter for prod. |
| Abandoned pending orders lock stock | Medium | Low/Med | Cleanup job (C9) or lazy reconcile-on-read. |
| Scope creep into refunds/returns/coupons | Medium | Med | Explicit out-of-scope list (§0); refunds minimal/admin-only. |
| Reintroducing `as` casts / hand-maintained types on the new endpoints | Medium | Med (repeat of D30) | zod at the boundary (rule 11) for every new response; shared fixtures mirroring real payloads. |

---

## 12. Acceptance criteria (testable)

A milestone is done only when its slice below passes (Playwright-against-live for DB-backed cases per
D28; Jest-unit for logic; `npm run lint && npx tsc --noEmit && npm run test` green both apps):

1. **Accounts (6.1):** register→verify→login→reset works; a customer JWT is **rejected by every
   `/admin/**` route** (test); login is rate-limited; reset reveals nothing about account existence;
   `GET /me/*` returns only the caller's data.
2. **Cart (6.2):** add/update/remove persists for a logged-in customer; an anonymous client cart
   **merges** into the server cart on login; cart never determines price (price re-read at quote).
3. **Checkout (6.3):** `/checkout/quote` returns `subtotal + shipping + tax = total` recomputed
   server-side; an order freezes `OrderItem` snapshots (editing/soft-deleting the product afterward
   does not change the placed order); invalid address/empty cart ⇒ 400.
4. **Payments (6.4):** happy path → order `PAID` exactly once via webhook; a **tampered callback or
   webhook signature ⇒ 400 and order stays `PENDING_PAYMENT`**; a **replayed webhook is a no-op**
   (stock decremented once, one email); payment failure releases reserved stock.
5. **GST (6.5):** intra-state order shows CGST+SGST, inter-state shows IGST, totals reconcile in paise;
   invoice numbers are **sequential and gap-free**; invoice PDF carries the GST-required fields.
6. **Shipping (6.6):** serviceability returns rates for a valid pincode; on `PAID`, a shipment + AWB is
   created; a Shiprocket tracking webhook updates order status idempotently.
7. **Email (6.7):** order confirmation + shipping emails send from the verified domain; an email send
   failure **does not fail** the payment webhook (logged for retry).
8. **Admin (6.8):** admin can list/filter orders, view payment + shipment, change status, issue a
   refund (reflected via Razorpay + `refund.*` webhook), and download the invoice.
9. **Hardening (6.9):** Playwright e2e drives the full account→cart→pay→confirm flow on a live server;
   `security-reviewer` pass on auth + payments has no unresolved high/critical findings.
10. **Go-live (6.10):** documented test→live cutover checklist executed; live keys set in Render only;
    one real ₹ transaction reconciled end-to-end (order, payment, invoice, shipment, email).

---

## 13. Verification steps (per milestone, before PR merge — D16)

- `cd backend && npm run lint && npx tsc --noEmit && npm run test` → all green.
- `cd frontend && npm run lint && npx tsc --noEmit && npm run test` → all green.
- New migration applies cleanly from scratch (`prisma migrate deploy` against a fresh Postgres — the
  existing CI check).
- DB-backed behaviour exercised by the Playwright-against-live-server job (D28), not Jest e2e.
- Security-gated milestones (6.1, 6.4): separate-pass `security-reviewer` review attached to the PR.
- Update `docs/DECISIONS.md` with the milestone's ADRs (C1–C10 as resolved) and tick the milestone in
  `HANDOFF.md`'s roadmap.

---

## 14. How to execute this plan

This document is `pending approval`. To proceed, approve a **single milestone at a time** (start with
**6.0 Foundations** — schema migration + ADRs + vendor sandbox accounts), then hand that milestone to
execution (`/team` or `/ralph`, or a direct `executor` task). Do **not** execute the whole phase in
one pass — each milestone is a branch + PR + green CI checkpoint per D16, and several later milestones
are gated on external KYC/compliance inputs (§10) that aren't ready yet.

**Recommended first action on approval:** resolve decisions C1, C2, C4, C6, C7 (all internal, no
external input needed), then build 6.0's migration.
