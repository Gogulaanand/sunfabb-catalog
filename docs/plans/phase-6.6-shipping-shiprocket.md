# Phase 6.6 - Shipping (Shiprocket)

**Status:** ready to build once the owner has a Shiprocket account.
**Branch:** `feature/6.6-shiprocket-shipping`.
**Recommended order:** after 6.5 (GST) so shipping charges are taxed automatically, and after 6.7 (email) so shipped/delivered emails go live; both orderings degrade gracefully (see §6).
This document is self-contained: an executor should be able to deliver the phase end-to-end from this file plus the cited source files.

---

## 1. Objective

Charge a simple flat/free-threshold shipping fee at checkout, and fulfil paid orders through Shiprocket: admin creates a shipment (AWB + label) from the order detail screen, a tracking webhook keeps order status in sync, and the customer sees courier + tracking link.
Live courier rate quotes at checkout are deliberately **out of scope** (owner decision - backlog).

## 2. Owner inputs required (collect before starting)

- [ ] Shiprocket account (start on the free/sandbox tier; live KYC is a 6.10 concern).
- [ ] Shiprocket **API user** email + password (created under Settings → API in the dashboard; distinct from the dashboard login).
- [ ] Pickup location configured in the Shiprocket dashboard (name it and note it - shipment creation references it).
- [ ] Package weight per variant in grams (schema column `ProductVariant.weight_grams` exists, currently null) and a default package dimension (L×W×H cm) to use for all shipments.
- [ ] Chosen flat shipping rate and free-shipping threshold in ₹ (e.g. flat ₹79, free above ₹999).
- [ ] A random webhook token (generate one) → `SHIPROCKET_WEBHOOK_TOKEN`, entered both in the Shiprocket webhook settings and Render env.

## 3. Current state (grounding - do not re-derive)

- Schema is ready: `Shipment` model (`order_id unique`, `shiprocket_order_id`, `awb_code`, `courier_name`, `label_url`, `tracking_url`, `status`, `shipped_at`, `delivered_at`) and `ProductVariant.weight_grams Int?` in `backend/prisma/schema.prisma`. `WebhookEvent` ledger already has `provider` enum value `SHIPROCKET`.
- `backend/src/orders/order-pricing.ts` → `priceCart()` has the placeholder `shippingPaise = 0` (line ~102); it is the single totals authority for quote + order creation.
- `backend/src/orders/order-status.ts` → transitions: `PAID → PROCESSING → SHIPPED → DELIVERED`, enforced by `assertTransition()`; the admin status endpoint (`PATCH /admin/orders/:id/status` in `backend/src/admin/orders/admin-orders.controller.ts`) already drives `PAID → PROCESSING`.
- Reference implementation for webhooks: `backend/src/webhooks/webhooks.controller.ts` + `webhooks.service.ts` (raw-body handling, signature check, `WebhookEvent` dedupe, idempotent handlers). Copy these patterns for the Shiprocket route.
- Email hooks: if Phase 6.7 is merged, `EmailService.sendOrderShipped(to, orderNumber, courierName, trackingUrl)` and `sendOrderDelivered(to, orderNumber)` exist and never throw; if 6.7 is not merged, add stub methods to `backend/src/email/email.service.ts` following its existing stub pattern.
- Admin UI: order detail screen exists from 6.8 (`frontend/app/admin` orders section) with a status control fed by server-computed `allowed_next_statuses`; frontend validates admin responses with zod.
- Constraints: Prisma only (D4), paise (D6), DTOs (D8), zod boundary (rule 11), fail-fast secrets (rule 12), Jest unit with mocks + Playwright-against-live-server for DB-backed flows (D28).

## 4. Locked design decisions

- **D-6.6-1 Flat/free shipping rule** (owner decision): `computeShipping(subtotalPaise)` = 0 when `subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE`, else `SHIPPING_FLAT_PAISE`. Config via env; no rate API on the money path.
- **D-6.6-2 Admin-triggered fulfilment**, not auto-on-PAID: the owner packs manually at pilot scale, so shipment creation is an explicit button on an order in `PROCESSING`.
- **D-6.6-3 Courier auto-assign:** use Shiprocket's recommended courier (or `courier_id` omitted → auto). Manual courier selection → backlog.
- **D-6.6-4 Thin HTTP client, no SDK:** native `fetch` wrapper; base URL from env so tests point at a stub.
- **D-6.6-5 Ship action → order `SHIPPED`** immediately after AWB assignment (label exists, parcel is leaving); the tracking webhook later sets `DELIVERED` and fills `delivered_at`. Intermediate Shiprocket statuses update `Shipment.status` only, never move an order backwards.
- **D-6.6-6 Serviceability check is a stretch goal** (fail-open, non-blocking; see §7 step 6). First candidate to cut if the phase runs long.

## 5. Shiprocket API surface used (v1, base `https://apiv2.shiprocket.in`)

| Purpose | Endpoint |
|---|---|
| Login (token, ~10-day expiry) | `POST /v1/external/auth/login` `{email, password}` → `{token}` |
| Create order | `POST /v1/external/orders/create/adhoc` |
| Assign AWB | `POST /v1/external/courier/assign/awb` `{shipment_id}` |
| Generate label | `POST /v1/external/courier/generate/label` `{shipment_id: [id]}` |
| Serviceability (stretch) | `GET /v1/external/courier/serviceability/?pickup_postcode=&delivery_postcode=&weight=&cod=0` |

Consult current Shiprocket API docs during implementation for exact request/response fields; validate responses with zod-style shape checks (rule 11 applies to third-party payloads too - the backend must not blindly trust vendor JSON).

## 6. Cross-phase interactions

- **6.5 (GST):** if merged, `computeGst()` taxes `shippingPaise` automatically (it takes shipping as a taxable input); nothing to do here. If 6.5 is NOT merged, shipping ships untaxed (`tax_paise` stays 0) and 6.5 picks it up later.
- **6.7 (email):** if merged, call the real shipped/delivered emails; else add stubs (§3). Email calls are always fire-and-forget, never awaited into the error path of the webhook or ship endpoint response... they ARE awaited (the methods never throw) but wrapped so failures only log.

## 7. Backend tasks

New module `backend/src/shipping/` (Controller → Service → DTO), plus small edits elsewhere.

1. `shipping-config.ts` - fail-fast getters for the required env vars (prod), mirroring `backend/src/auth/jwt-secret.ts`.
2. `shipping-cost.ts` - pure `computeShipping(subtotalPaise, config)` per D-6.6-1; wire into `priceCart()` replacing the `shippingPaise = 0` placeholder (pass the config in; keep `priceCart` pure).
3. `shiprocket.client.ts` - fetch wrapper:
   - Token cache in memory with expiry timestamp; login lazily on first call; on any 401, re-login once and retry the request once.
   - `AbortSignal.timeout(5000)` on every call; errors surface as typed exceptions (`ShiprocketError`) with safe messages (never leak credentials).
   - Base URL from `SHIPROCKET_BASE_URL` (default the real API) so unit tests and e2e stubs can override.
4. `shipping.service.ts` - `shipOrder(orderId)`:
   - Load order + items + variants; require status `PROCESSING` (else 400 via `assertTransition` semantics) and no existing `Shipment` row with a `shiprocket_order_id` (else 409 - idempotency against double-click).
   - Require `weight_grams` on every variant; 400 listing the offending SKUs otherwise (actionable for the admin).
   - Create Shiprocket order (order number, shipping address snapshot from `Order.shipping_address`, line items, total weight = Σ item weight × qty, default dimensions from env/config, payment method `Prepaid`).
   - Assign AWB, generate label.
   - Persist `Shipment` (upsert on `order_id`): `shiprocket_order_id`, `awb_code`, `courier_name`, `label_url`, `tracking_url` (`https://shiprocket.co/tracking/{awb}` or the response URL), `status`, `shipped_at = now()`.
   - Transition order `PROCESSING → SHIPPED` via the shared guard; send `sendOrderShipped` (failure only logs).
   - Partial-failure handling: if AWB/label fails after order creation, persist what succeeded on `Shipment`, return 502 with a clear message; a retry of `shipOrder` must resume (order already created → skip creation, retry AWB/label) rather than duplicate. Key this off which `Shipment` fields are already populated.
5. Admin endpoint: `POST /admin/orders/:id/ship` (admin JWT guard, same registration pattern as `admin-orders.controller.ts`) → returns the updated shipment + order status.
6. **Stretch - serviceability:** `GET /shipping/serviceability?pincode=` (public, throttled) called from the checkout page; 2s timeout; on vendor error/timeout return `{serviceable: true, estimated: false}` (fail-open - a pilot must not lose sales to a vendor blip). Cut this first if needed.
7. Tracking webhook: `POST /webhooks/shiprocket` in the existing `webhooks` module:
   - Auth: compare the token header (Shiprocket sends the configured token, typically in `x-api-key`) against `SHIPROCKET_WEBHOOK_TOKEN` with a constant-time compare (`crypto.timingSafeEqual`); mismatch → 401, no body processing.
   - Dedupe via `WebhookEvent` (`provider: SHIPROCKET`; Shiprocket has no event id, so derive `event_id` as a hash of `awb + current_status + status_time` fields - deterministic for replays).
   - Map payload → `Shipment.status` (store the raw Shiprocket status string); on a "Delivered" status set `delivered_at` and transition `SHIPPED → DELIVERED` + `sendOrderDelivered`; on RTO/undelivered statuses just record on `Shipment` (admin handles manually; order stays `SHIPPED`).
   - Unknown AWB → 200 with a logged warning (never 5xx a vendor webhook for our own data gaps; they retry).
   - Idempotent: replayed payload → no state change, no duplicate email.
8. Data mapper: customer order detail (`GET /me/orders/:orderNumber`) and admin order detail already include shipment fields per the 6.8 mapping; verify `awb_code`/`courier_name`/`tracking_url`/`label_url` are exposed (admin gets `label_url`; customer response must NOT include `label_url`, only tracking).

## 8. Frontend tasks

- **Admin variant form:** expose `weight_grams` (number input, grams) + zod schema.
- **Admin order detail - Ship panel:**
  - Order in `PROCESSING` without shipment: "Create shipment" button; on 400-missing-weights show the SKU list from the error.
  - After shipping: show courier, AWB, label link (opens PDF), tracking link; status timeline reflects `SHIPPED`/`DELIVERED` (already driven by order status from 6.8).
  - Optimistic-free: just refetch on success (pilot scale; matches existing admin patterns).
- **Customer order detail:** courier name + tracking link once shipped; delivered date once delivered.
- **Checkout:** shipping line now shows the real fee ("FREE" above threshold; show the threshold nudge "Add ₹x for free shipping" only if trivial - optional polish, skip if noisy).
- Extend zod schemas for every changed response (rule 11).

## 9. Env & config

| Var | Required | Fail-fast | Notes |
|---|---|---|---|
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` | prod yes | yes | API user creds |
| `SHIPROCKET_WEBHOOK_TOKEN` | prod yes | yes | constant-time compared |
| `SHIPROCKET_BASE_URL` | no | no | default real API; overridden in tests |
| `SHIPROCKET_PICKUP_LOCATION` | prod yes | yes | must match dashboard pickup name |
| `SHIPPING_FLAT_PAISE` | yes | yes | e.g. `7900` |
| `FREE_SHIPPING_THRESHOLD_PAISE` | yes | yes | e.g. `99900`; set huge to disable free shipping |
| `SHIP_PACKAGE_DIMENSIONS_CM` | no | no | default e.g. `30x25x5` |

Update `backend/.env.example`, Render, CI env block.

## 10. Security notes

- Webhook token via constant-time compare; 401 before touching the body.
- Ship endpoint is admin-JWT only; add the explicit customer-token-rejected test (existing pattern).
- Never expose `label_url` or Shiprocket ids to customers; never log Shiprocket credentials or the token.
- Vendor responses validated at the boundary (rule 11) - malformed vendor JSON → 502, not a crash or silent bad write.

## 11. Test plan

Unit (Jest, mocked fetch/Prisma):
- `computeShipping`: below threshold → flat; at threshold → free (lock >= and test the boundary); above → free.
- Token cache: reused within expiry; 401 → one re-login + retry; second 401 → error.
- `shipOrder`: happy path persists all Shipment fields + transitions + email; wrong status → 400; existing shipment → 409; missing weights → 400 listing SKUs; AWB failure after order creation → 502 and retry resumes without duplicate Shiprocket order.
- Webhook: bad token → 401 no processing; valid delivered payload → `delivered_at` + transition + email; replay → no-op (ledger); unknown AWB → 200 + warn; non-delivered status updates Shipment only.
- Status never regresses (delivered order receiving an "In Transit" replay stays `DELIVERED`).

Playwright (against live server, D28):
- Point `SHIPROCKET_BASE_URL` at a local stub server (a tiny express/hono fixture in `e2e/` returning canned Shiprocket responses) so CI needs no vendor account: paid order → admin marks `PROCESSING` → ships → AWB visible → craft a signed webhook POST → order `DELIVERED`, customer page shows tracking.
- Manual QA checklist (documented in the PR, run against the real sandbox once): real token login, one test shipment created and cancelled in the Shiprocket dashboard, webhook received end-to-end via the deployed backend.

## 12. Acceptance criteria

1. Checkout charges the configured flat fee below the threshold and ₹0 at/above it; totals reconcile (and are taxed if 6.5 is live).
2. Admin ships a `PROCESSING` order in one click: AWB + label link + tracking link appear; order becomes `SHIPPED`; customer sees tracking.
3. A Shiprocket "Delivered" webhook sets `DELIVERED` + `delivered_at` idempotently; replays and bad tokens are inert.
4. Double-ship, wrong-status, and missing-weight attempts fail with actionable 4xx errors and no vendor-side duplicates.
5. Lint, type-check, unit tests, Playwright job green in both apps.

## 13. Out of scope (→ PHASE6-BACKLOG.md)

Live rate quotes at checkout, manual courier selection, COD, return/RTO automation, multi-package shipments, per-variant dimensions, pickup scheduling UI.

## 14. Verification commands

```bash
cd backend && npm run lint && npx tsc --noEmit && npm run test
cd frontend && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Plus the Playwright job with the Shiprocket stub, and the manual sandbox checklist in §11.
