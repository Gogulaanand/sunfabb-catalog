# Phase 6 backlog

Deliberately deferred scope from milestones 6.5-6.10.
Nothing here blocks go-live; revisit after real customer traction.
Each item notes why it was deferred and where it came from.

## Shipping (from 6.6)

- **Live Shiprocket rate quotes at checkout** - owner chose a flat/free-threshold rule for the pilot; live rates add a vendor API to the money path (latency, caching, failure modes).
- **Manual courier selection in admin** - auto-assign is fine at pilot volume.
- **Serviceability hard-block** - the pincode check (if built) is fail-open; blocking checkout on a vendor response needs reliability data first.
- **COD (cash on delivery)** - payment + RTO risk complexity; prepaid-only for the pilot.
- **Return/RTO automation, self-service returns portal** - handled manually via the admin status control and Shiprocket dashboard.
- **Per-variant package dimensions, multi-package shipments, pickup scheduling UI.**

## Payments / refunds (from 6.10)

- **In-app refund endpoint + admin UI** (`POST /admin/orders/:id/refund`) - owner refunds via the Razorpay dashboard; webhook sync keeps the app truthful. Build when refund volume makes the dashboard round-trip annoying.
- **Automatic restock on refund** - restocking is a physical-goods decision; kept manual.

## GST / invoicing (from 6.5)

- **GstRate admin CRUD UI** - rates change rarely; seed script/Prisma Studio suffices.
- **Invoice PDF archival (Cloudinary)** - PDFs are regenerated on demand from frozen order data; archive only if the accountant requires immutable copies.
- **Credit notes for refunds** - accountant to advise when refunds start happening.
- **Per-line shipping-tax apportionment** - shipping is taxed at the highest goods rate in the order (documented simplification, accountant-flagged).
- **E-invoicing / IRN integration** - only if turnover crosses the mandate threshold (accountant to confirm).

## Email (from 6.7)

- **Retry queue / outbox for failed sends** - failures are logged; at pilot volume a manual resend beats infrastructure.
- **Delivery/open tracking, marketing + abandoned-cart emails** - GROWTH Wave 2+ territory.

## Security / compliance (parked with awareness)

- **DPDP erasure endpoint + written retention policy (decision C5)** - anonymize `Customer`, retain order/invoice with PII stripped. **Should-do-soon** once real customer PII accumulates; not a pure backlog item.
- **Render keep-alive retirement** - once on Render Starter the ping is redundant; remove the workflow or keep as belt-and-braces.

## Pre-existing deferrals (from the Phase 6 master plan §0)

Coupons/discounts, gift cards, reviews/ratings, wishlists, multi-currency, multi-warehouse, marketplace, subscriptions, loyalty, mobile app.

## Unrelated but tracked

- **`home.sunfabb.com`** broken deployment + expired wildcard cert (old personal homepage, Vercel project `website`) - separate from the catalog.
