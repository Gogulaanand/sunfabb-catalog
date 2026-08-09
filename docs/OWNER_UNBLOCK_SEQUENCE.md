# Owner unblock sequence

**Prepared:** 2026-08-09 (Asia/Kolkata)  
**Purpose:** clear the smallest/highest-leverage owner gates first. Estimates are active owner time;
DNS, KYC, accountant, and deployment lead time can run in parallel.

## Completed engineering delivery — no owner action

PRs [#79](https://github.com/Gogulaanand/sunfabb-catalog/pull/79),
[#80](https://github.com/Gogulaanand/sunfabb-catalog/pull/80),
[#81](https://github.com/Gogulaanand/sunfabb-catalog/pull/81), and
[#82](https://github.com/Gogulaanand/sunfabb-catalog/pull/82) were merged sequentially on
2026-08-09 after each branch was refreshed against the preceding merge and its full CI gate passed.
Do not repeat their implementation reviews; continue with the evidence tasks below.

## 1. Close Phase 6.7 email acceptance — 30–60 minutes

The repository records that the Resend domain and backend mail variables were configured during
Phase 3. Confirm they are still current; do not paste secrets into chat.

1. Confirm the verified sender/domain, `EMAIL_FROM`, `APP_BASE_URL`, and optional
   `CONTACT_NOTIFY_EMAIL` in the owner-controlled dashboards.
2. Confirm PR #79's merged backend is deployed, then run verification email, password reset,
   paid-order confirmation, and contact
   acknowledgement/notification against owner-controlled inboxes. Record received content and
   SPF/DKIM results. Shipped/delivered email acceptance waits for Phase 6.6 call sites.

## 2. Close remaining Phase 5 owner evidence — 45–90 minutes

1. Confirm PR #81 is deployed, then ask Codex to rerun only the affected Lighthouse accessibility
   checks against the canonical URL.
2. Confirm Google Search Console ownership, submit/confirm the sitemap, and record ingestion state.
3. Observe one `whatsapp_click` and relevant contact event in GA4 Realtime/DebugView.
4. Paste a representative home, catalogue, and PDP URL into the actual social platforms and retain
   rendered-preview screenshots.
5. Run the priority journey once each on Android Chrome, iPhone Safari, and desktop Chrome. Record
   only observed results; do not substitute emulation for device evidence.

## 3. Complete Phase 4 WhatsApp Business — 2–4 hours

1. Provide/use the dedicated business number and finish the owner-approved profile, hours, away
   message, and response SLA.
2. Build the first 10–20-item manual catalogue using only verified product facts.
3. Approve quick replies for availability, dimensions, set contents, delivery, payment, returns,
   and care.
4. Test PDP/contact CTAs and two-way replies on mobile and desktop; confirm the exact product context
   arrives and GA4 records the click. Never place the number or private account data in repo docs.

## 4. Start the long-lead GST and shipping inputs — 1–2 hours active time each

### GST / Phase 6.5

Send the accountant the checklist in `docs/plans/phase-6.5-gst-invoicing.md`: legal seller name,
GSTIN, registered address/state code, HSN per product, slab/rates, GST-inclusive price decision,
invoice fields, and series prefix. Codex starts 6.5 only after the signed-off values arrive.

### Shiprocket / Phase 6.6

Create/confirm the account and API user, pickup location, flat fee/free threshold, package dimensions,
variant weights, and webhook token. Keep credentials in the dashboard/env only. Codex starts 6.6
after these commercial/package decisions exist; live KYC can continue in parallel.

## 5. Final Phase 6.10 cutover — external lead time, then 2–4 hours active execution

Complete Razorpay and Shiprocket live KYC, approve the Render Starter spend, provide a real low-value
payment method, rotate/confirm production secrets, and execute the ordered checklist in
`docs/plans/phase-6.10-go-live.md`. Phase 6 closes only after the real order → payment → invoice →
shipment → email → refund reconciliation has direct evidence. Do not infer this from code or CI.

## Resume prompt

After clearing any numbered section, tell Codex exactly which section is complete and ask it to
resume from this file. The next session should verify only that section's evidence and downstream
dependencies; it should not re-audit completed Phase 5 implementation.
