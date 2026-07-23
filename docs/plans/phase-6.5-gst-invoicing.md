# Phase 6.5 - GST invoicing

**Status:** ready to build once accountant inputs arrive.
**Branch:** `feature/6.5-gst-invoicing`.
**Recommended order:** after 6.7 (email), before 6.6 (shipping) - the tax engine is written shipping-aware so 6.6 slots in with zero rework.
This document is self-contained: an executor should be able to deliver the phase end-to-end from this file plus the cited source files.

---

## 1. Objective

Compute itemized GST (CGST/SGST vs IGST) on every order, assign gap-free sequential invoice numbers per financial year on payment confirmation, and serve a compliant invoice PDF to both admin and customer.
The mechanism is configurable; the legal determinations (HSN codes, rates, layout) come from the owner's accountant and are never hardcoded.

## 2. Owner inputs required (accountant checklist - collect before starting)

- [ ] GSTIN.
- [ ] Seller legal name + registered address (as it must appear on invoices).
- [ ] Seller GST state code (2-digit, e.g. `33` for Tamil Nadu) → `SELLER_STATE_CODE`.
- [ ] HSN code for each product (schema column `Product.hsn_code` already exists, currently null).
- [ ] GST rate per HSN, **including the textile price-slab rule** (commonly 5% for sale value ≤ ₹1000 per piece and 12% above - accountant must confirm current law; do not assume).
- [ ] Confirmation that catalog display prices are **GST-inclusive** (recommended default - standard Indian B2C; checkout totals then never exceed the displayed price).
- [ ] Sign-off on the invoice field list in §8 (or corrections to it).
- [ ] Invoice series prefix preference (default `SF`).

## 3. Current state (grounding - do not re-derive)

- Schema (`backend/prisma/schema.prisma`) is already prepared: `Product.hsn_code String?`, `Order.invoice_number String? @unique`, `Order.tax_paise Int @default(0)`, `OrderItem.hsn_code / tax_rate_bps / cgst_paise / sgst_paise / igst_paise` (all default 0).
- `backend/src/orders/order-pricing.ts` → `priceCart()` is the **single totals authority** (used by `/checkout/quote` and order creation) and has an explicit placeholder `taxPaise = 0` (line ~103). Each `PricedLine` already carries `hsnCode`.
- `backend/src/payments/payments.service.ts` → `confirmPaid()` flips `PENDING_PAYMENT → PAID` **exactly once** via a conditional `updateMany`; both the client `/payments/verify` path and the webhook path converge there. This is the idempotent hook point for invoice numbering.
- `backend/src/orders/order-status.ts` → `assertTransition()` state machine (no change needed here).
- Customer routes are token-scoped: `GET /me/orders/:orderNumber` in `backend/src/orders/orders.controller.ts` returns 404 on cross-customer access (IDOR pattern to mirror).
- Admin routes live in `backend/src/admin/orders/admin-orders.controller.ts` (`@Controller('admin/orders')`, admin JWT guard).
- Address model stores `state` as free text; checkout snapshots the shipping address as JSON onto `Order.shipping_address`.
- Constraints: Prisma only (D4), integer paise (D6), DTOs + class-validator (D8), zod at every new frontend boundary (rule 11/D30), fail-fast required secrets (rule 12/D31), unit tests via Jest with mocked Prisma, DB-backed e2e via Playwright against a live server (D28).

## 4. Locked design decisions

- **D-6.5-1 Rate source is a lookup table** (mirrors the Material/Color lookup rule): new `GstRate` model keyed by `hsn_code`, seeded from accountant input. No admin CRUD UI now (manage via seed script/Prisma Studio; UI → backlog).
- **D-6.5-2 Prices are GST-inclusive** (pending owner confirmation in §2): tax is back-calculated from the inclusive line total, `total_paise` still equals `subtotal + shipping + tax` where `subtotal` is redefined as the **taxable value** (see §5 math). Display price never changes at checkout.
- **D-6.5-3 Slab support:** one optional per-unit-price threshold per HSN row covers the textile slab reality without a rules engine.
- **D-6.5-4 Invoice number** = `{INVOICE_SERIES_PREFIX}/{FY}/{6-digit seq}`, e.g. `SF/2026-27/000042`; FY = Indian financial year (Apr 1 to Mar 31). Gap-free per FY via a counter row incremented inside the `confirmPaid()` transaction.
- **D-6.5-5 PDF via `pdfkit`** (pure JS; no headless browser - Render free tier cannot afford one). Generated on demand from frozen `OrderItem` data; not stored (archival → backlog).
- **D-6.5-6 State normalization:** checkout shipping address `state` must be a value from a static Indian state list mapped to GST state codes. Frontend uses a dropdown; backend validates with `@IsIn`. Existing free-text addresses are validated when used at checkout, not migrated.

## 5. Tax math (implement exactly; unit-test exhaustively)

New pure module `backend/src/orders/gst.ts` (same style as `order-pricing.ts` - pure functions, no Nest deps, trivially unit-testable).

Definitions per line (all integer paise, rates in basis points, `rate` looked up by `hsn_code` with the slab threshold applied against **unit price**):

```
inclusiveLine = unit_price_paise * quantity                  # what priceCart computes today
taxable      = round(inclusiveLine * 10000 / (10000 + rate)) # half-up
lineTax      = inclusiveLine - taxable                        # exact, no drift
```

- Intra-state (`shipping state code == SELLER_STATE_CODE`): `cgst = floor(lineTax / 2)`, `sgst = lineTax - cgst` (deterministic odd-paise assignment; document it).
- Inter-state: `igst = lineTax`.
- **Shipping is a taxable input:** GST treats delivery as part of a composite supply taxed at the goods rate. `computeGst()` takes `shippingPaise` and taxes it at the **highest goods rate in the order** (simple, defensible pilot rule - flag for accountant sign-off; alternative apportionment → backlog). While 6.6 is unbuilt, shipping is 0 and this term is inert.
- Missing rate row or missing `hsn_code` on any product in the cart → `BadRequestException` with an actionable message naming the product. An order must never be placed with silently-untaxed lines.
- Totals contract after integration: `Order.subtotal_paise` = Σ taxable, `Order.tax_paise` = Σ lineTax + shippingTax, `Order.total_paise` = subtotal + shipping + tax = Σ inclusiveLine + shippingPaise. The customer-facing total equals the displayed prices.

## 6. Schema / migration (one migration)

```prisma
model GstRate {
  id                       String   @id @default(uuid())
  hsn_code                 String   @unique
  rate_bps                 Int                  // rate below threshold, or flat rate when no threshold
  threshold_paise          Int?                 // per-unit price threshold (e.g. 100000 = ₹1000)
  rate_above_threshold_bps Int?                 // required iff threshold_paise set
  created_at               DateTime @default(now())
  updated_at               DateTime @updatedAt
}

model InvoiceCounter {
  fy         String @id        // e.g. "2026-27"
  last_value Int    @default(0)
}
```

Extend `backend/prisma/seed.ts` with placeholder `GstRate` rows clearly marked as needing accountant values (or a dedicated `seed-gst.ts`; keep the main seed idempotent).

## 7. Backend tasks

1. `backend/src/orders/gst.ts` - `resolveRate(rateRow, unitPricePaise)`, `computeGst(lines, shippingPaise, destinationStateCode, sellerStateCode)` per §5, plus `currentFinancialYear(date)` helper (Apr-Mar).
2. `backend/src/orders/india-states.ts` - static `INDIAN_STATES` const: name → 2-digit GST state code (all states + UTs). Export the name list for DTO validation and the frontend.
3. Wire into `priceCart()` (`order-pricing.ts`): it (or a thin wrapper - keep `priceCart` pure by passing rate rows in) now needs the `GstRate` rows and the destination state.
   - `/checkout/quote` and order creation load rates via Prisma for the cart's distinct HSN codes and pass them in.
   - Quote before an address is chosen: if the quote endpoint has no destination state yet, compute tax with the **intra-state assumption** and label it an estimate; the order-creation recompute with the real shipping address is authoritative. Check `checkout.service.ts` / the quote DTO for whether an address accompanies the quote and prefer the real state when present.
4. Order creation (`orders.service.ts`): persist per-line `tax_rate_bps`, `cgst/sgst/igst_paise`, and order-level `tax_paise`; snapshot already carries `hsn_code`.
5. Address/state validation: add `@IsIn(INDIAN_STATE_NAMES)` to the address DTO(s) used at checkout (`backend/src/addresses/dto/`, and the checkout address DTO if separate).
6. Invoice numbering in `payments.service.ts` `confirmPaid()`:
   - Inside the existing transaction, after the conditional `PENDING_PAYMENT → PAID` update succeeds (i.e. this call is the one that flipped it), increment `InvoiceCounter` for `currentFinancialYear()` (`upsert` then `update: {last_value: {increment: 1}}` reading the result inside the tx) and set `Order.invoice_number`.
   - Because only the winning `confirmPaid()` performs the flip, a re-delivered webhook can never consume a second number. Assign only if `invoice_number` is null (belt and braces).
7. New module `backend/src/invoices/` (Controller → Service pattern):
   - `invoices.service.ts` - `generatePdf(orderId): Promise<Buffer>` using `pdfkit` (`npm i pdfkit @types/pdfkit`), reading the order + frozen items + payment. Layout per §8.
   - Admin route: `GET /admin/orders/:id/invoice` (register under the existing admin orders controller or a sibling controller with the same guard) → `application/pdf`, `Content-Disposition: attachment; filename="<invoice_number with / replaced by ->.pdf"`.
   - Customer route: `GET /me/orders/:orderNumber/invoice` (customer JWT, query scoped by `customer_id` from the token; cross-customer → 404, mirroring `orders.controller.ts`).
   - Both return 404 while `invoice_number` is null (unpaid orders have no invoice).
8. Email attachment (only if 6.7 is merged): in the post-`confirmPaid` email call site, generate the PDF and pass it as `invoicePdf` to `sendOrderConfirmation`. Wrap generation in try/catch - a PDF failure must not fail the webhook (send without attachment instead). If 6.7 is not merged yet, skip this step and note it in the PR.

## 8. Invoice PDF required fields (accountant to confirm)

Header: "TAX INVOICE", seller legal name, address, GSTIN, invoice number, invoice date (the `PAID` timestamp / `placed_at`).
Buyer: customer name, billing address (fall back to shipping), shipping address, destination state + code.
Lines: description (product + variant label), HSN, quantity, unit taxable value, taxable amount, rate %, CGST/SGST or IGST amount per line.
Footer: totals row (taxable, tax split by type, shipping, grand total), amount rounded per rules, "Whether tax is payable under reverse charge: No".
Keep layout code in one file so accountant-requested changes are cheap.

## 9. Frontend tasks

- **Admin product form:** expose `hsn_code` (check `frontend/app/admin` product form; add the field + zod schema if missing).
- **Admin order detail:** "Download invoice (PDF)" button when `invoice_number` present (fetch via the admin API client with auth, save blob).
- **Customer order detail** (`/account/orders/[orderNumber]`): same download button via `/me/orders/:orderNumber/invoice`.
- **Checkout + order summary:** show "Includes GST ₹x.xx" (from `taxPaise`) under the total; totals displayed to the customer do not change (inclusive pricing).
- **Address forms:** state field becomes a dropdown fed by the shared state list (hardcode the list in a frontend const mirroring `india-states.ts`; a tiny duplication of a static legal list is acceptable - add a comment cross-referencing the backend file).
- Extend zod boundary schemas for any new/changed response fields (rule 11 - no `as` casts).

## 10. Env & config

| Var | Required | Fail-fast | Notes |
|---|---|---|---|
| `SELLER_GSTIN` | prod yes | yes | printed on invoices |
| `SELLER_STATE_CODE` | prod yes | yes | drives intra vs inter-state split |
| `SELLER_LEGAL_NAME` / `SELLER_ADDRESS` | prod yes | yes | invoice header (or a single JSON var; pick one and document) |
| `INVOICE_SERIES_PREFIX` | no | no | default `SF` |

Follow the `getJwtSecret()` fail-fast pattern; update `backend/.env.example`, Render, CI env block.

## 11. Security notes

- Customer invoice route is IDOR-tested (customer A requesting customer B's order number → 404).
- Admin invoice route rejects customer JWTs (existing guard separation; add the explicit test).
- No PII beyond what the invoice legally requires; PDFs are generated on demand and never written to disk.

## 12. Test plan

Unit (Jest, mocked Prisma):
- Rate resolution: flat rate; slab below/at/above threshold (boundary: unit price exactly `threshold_paise` - lock ≤ vs < per accountant and test it).
- Inclusive back-calc: `taxable + lineTax = inclusiveLine` for adversarial values (1 paise, primes, large qty); rounding half-up.
- Intra vs inter-state split; odd-paise goes to CGST.
- Shipping tax at highest goods rate; zero shipping → zero shipping tax.
- Missing HSN / missing rate row → 400 naming the product.
- Totals reconcile: order-level sums equal Σ line values.
- FY helper: dates in Jan-Mar map to the previous FY start.
- Invoice numbering: `confirmPaid` winner assigns number; loser (already PAID) does not; number format correct; counter increments by exactly 1.
- Invoice PDF: generate for a fixture order, extract text (e.g. `pdf-parse` as a dev dep), assert GSTIN, invoice number, HSN, CGST/SGST presence for intra-state fixture and IGST for inter-state.
- IDOR: cross-customer invoice fetch → 404.

Playwright (against live server, D28): full test-mode purchase → order becomes PAID → admin downloads invoice (response 200, `content-type: application/pdf`) → customer downloads own invoice → second customer gets 404.

## 13. Acceptance criteria

1. Intra-state order shows CGST+SGST, inter-state shows IGST; all totals reconcile in paise and match displayed (inclusive) prices.
2. Invoice numbers are sequential and gap-free per FY; a replayed payment webhook consumes no extra number.
3. Admin and owning customer can download the PDF; non-owners cannot; unpaid orders 404.
4. Order placement fails loudly (400) if any cart product lacks an HSN or rate row.
5. Lint, type-check, unit tests, and the Playwright job green in both apps.

## 14. Out of scope (→ PHASE6-BACKLOG.md)

GstRate admin CRUD UI, invoice PDF archival to Cloudinary, credit notes for refunds, per-line shipping-tax apportionment, e-invoicing/IRN (not required below turnover threshold - accountant to confirm).

## 15. Verification commands

```bash
cd backend && npm run lint && npx tsc --noEmit && npm run test
cd backend && npx prisma migrate dev            # migration applies cleanly
cd frontend && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Plus the Playwright e2e job and a manual invoice PDF eyeball against the accountant's field list.
