# Phase 6.10 - Go-live

**Status:** gated on 6.5/6.6/6.7 merged, Razorpay live KYC, Shiprocket live KYC, and trust pages.
**Branch:** `feature/6.10-go-live` (for the code task); the cutover checklist is executed via a tracking issue/PR description with evidence.
This document is self-contained.

---

## 1. Objective

Take sunfabb.com from test-mode to a production store: one small code task (refund webhook sync + security-backlog sweep), then an ordered, evidence-backed cutover checklist ending with a real ₹ transaction reconciled end-to-end.

## 2. Owner inputs required

- [ ] Razorpay live KYC approved (registered business; requires the trust pages in §4 step 1).
- [ ] Shiprocket live KYC approved + live pickup address confirmed.
- [ ] Razorpay **live** `KEY_ID` / `KEY_SECRET` and a fresh live `WEBHOOK_SECRET`.
- [ ] Shiprocket live API user credentials.
- [ ] Willingness to spend: Render Starter ($7/mo).
- [ ] Business inputs for trust pages if not already done (legal entity name, GSTIN display, contact channels, return window, shipping coverage) - see `docs/GROWTH.md` §3.3.
- [ ] A real payment method for the reconciliation drill (small amount, later refunded).

## 3. Code task - refund webhook sync + pre-live security sweep

Owner decision: refunds are issued manually in the Razorpay dashboard; the app only **syncs** state via webhooks. Full in-app refund UI → backlog.

1. **Refund webhooks** in `backend/src/webhooks/webhooks.service.ts` (follow the existing handler + `WebhookEvent` ledger patterns exactly):
   - Handle `refund.created` and `refund.processed` (entity: `refund`, carries `payment_id` and `amount`).
   - Update the matching `Payment` row: `refunded_paise += amount` (idempotent via the ledger - a replayed event must not double-add), `status` → `REFUNDED` when `refunded_paise >= amount_paise` else `PARTIALLY_REFUNDED`.
   - Transition the order via `assertTransition` (`backend/src/orders/order-status.ts`): full refund → `REFUNDED`, partial → `PARTIALLY_REFUNDED`; both are legal from `PAID`/`PROCESSING`/`SHIPPED`/`DELIVERED`, and `PARTIALLY_REFUNDED → REFUNDED` is legal.
   - Refunds do NOT restock inventory automatically (owner restocks via admin if the item actually returns; note in the runbook).
   - Unknown `payment_id` → 200 + logged warning (never 5xx a vendor webhook).
   - Unit tests: full refund, two partials summing to full, replay no-op, unknown payment, transition from each legal status, illegal transition surfaces loudly in logs but returns 200.
2. **Security sweep** (L3 verified-customer order gating and L4 exact CORS allowlist were already implemented in 6.9, PR #39 - verify they still hold, do not rebuild):
   - Confirm the `email_verified` gate rejects unverified customers at order placement (existing 6.9 test should cover it).
   - Confirm the CORS allowlist matches exactly the production frontend origin(s) after any env changes.
   - `npm audit` both apps; upgrade or document accepted advisories (Info-4 from the 6.1 backlog).
   - Re-run a `security-reviewer`-style pass over the 6.5/6.6/6.7 diffs (webhook auth, IDOR on invoice route, vendor-response validation).
3. **Optional (5-line) checkout kill switch:** `CHECKOUT_ENABLED=false` env → `POST /orders` returns 503 with a friendly message; frontend shows a "checkout temporarily unavailable" banner. Cheap insurance for incident response; skip if time-pressed and document the fallback (invalidate Razorpay keys = checkout fails safe).

## 4. Cutover checklist (ordered; record evidence per step in the tracking issue)

| # | Step | Who |
|---|------|-----|
| 1 | **Trust pages live:** `/about`, `/contact`, `/privacy-policy`, `/terms`, `/shipping-policy`, `/returns-policy`, `/faq` (Razorpay live approval requires them; GROWTH Wave 1) | Owner inputs → Claude drafts |
| 2 | **Razorpay live:** KYC approved; live keys set in Render dashboard only (never a file/repo); webhook re-registered on live mode to `https://sunfabb-backend.onrender.com/webhooks/razorpay` subscribing to **six** events: `payment.captured`, `order.paid`, `payment.failed`, `order.expired`, `refund.created`, `refund.processed` | Owner + Claude |
| 3 | **Shiprocket live:** live creds in Render; pickup location verified; webhook URL + token configured in the live dashboard | Owner + Claude |
| 4 | **Render Starter upgrade** (no sleep → no 24s cold start on webhooks/checkout); keep the keep-alive ping as belt-and-braces or retire it (tracked in backlog) | Owner |
| 5 | **Rotate admin credentials:** fresh strong password → new bcrypt hash → `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` in Render (open blocker in `HANDOFF.md`); rotate `JWT_SECRET`/`CUSTOMER_JWT_SECRET` too (cheap, invalidates all sessions once) | Owner + Claude |
| 6 | **Env audit:** every required var from 6.5/6.6/6.7 docs present in Render with live values; boot log clean (fail-fast passed); `backend/.env.example` current; GST seed (`GstRate`) populated with accountant-confirmed rates in prod DB | Claude |
| 7 | **Reconciliation drill (the go/no-go gate):** one real ₹ order end-to-end - place → pay (real UPI/card, small amount) → order `PAID` via live webhook → invoice number + PDF correct → ship via admin (real Shiprocket order) → tracking webhook updates status → confirmation/shipped emails received → then refund from the Razorpay dashboard → order syncs to `REFUNDED`. Screenshot/log evidence for each hop | Owner + Claude |
| 8 | **Monitoring & alerts:** UptimeRobot (or similar free tier) on `https://sunfabb.com/catalog` and a backend health endpoint; Render deploy/health notifications on; GA4 purchase event verified firing in the drill | Claude |
| 9 | **Runbook committed** (`docs/RUNBOOK.md`): stuck `PENDING_PAYMENT` (expiry sweep exists - `POST /admin/expiry/orders`), webhook replay via Razorpay dashboard re-send, missed Shiprocket webhook → manual status update via admin UI, refund procedure (dashboard + auto-sync), restock-after-return procedure, Neon backup/restore pointers, incident kill switch (§3.3) | Claude |
| 10 | **Rollback plan documented:** swap back to test keys in Render (checkout keeps working in test mode), or flip the kill switch; both are env-only changes, no deploy | Claude |

## 5. Explicitly NOT part of go-live

Marketing/announcement (GROWTH Wave 2+), Google Merchant Center / Meta catalog feeds (Wave 2, gated on this phase), coupons, COD, multi-courier selection - see `docs/plans/PHASE6-BACKLOG.md` and `docs/GROWTH.md`.

## 6. Acceptance criteria

1. Refund webhook unit tests green; replayed refund events are no-ops; partial → full refund progression correct.
2. L3/L4 protections (shipped in 6.9) re-verified on the live config; `npm audit` findings resolved or accepted with rationale.
3. Cutover checklist executed in order with evidence; the reconciliation drill (step 7) passed on live keys including the refund sync.
4. `docs/RUNBOOK.md` exists and covers the six scenarios in step 9.
5. `HANDOFF.md` milestone table marks 6.10 done; Phase 6 closed.

## 7. Verification commands

```bash
cd backend && npm run lint && npx tsc --noEmit && npm run test
cd frontend && npm run lint && npx tsc --noEmit && npm run test && npm run build
npm audit --prefix backend; npm audit --prefix frontend
```

Plus the full Playwright e2e suite against a live server (D28) before flipping keys, and the manual drill in §4 step 7.
