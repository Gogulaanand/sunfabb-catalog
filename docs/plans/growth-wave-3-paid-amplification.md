# Growth Wave 3 - Pay to amplify what converts

**Parent plan:** `docs/GROWTH.md` (§3.12 ads, §3.10 marketplace expansion, §3.8 UGC loop).
**Gate (all must be true, verified with evidence, not vibes):** Wave 2 live; GA4 `purchase` events verified end-to-end; Merchant Center variants approved; trust pages live; organic/social shows a baseline conversion (at least a handful of tracked purchases so ads have a funnel to amplify).
**Branch:** `feature/growth-wave3-pixel` (the only real code); everything else is owner-led with Claude-prepared assets.
This document is self-contained.

---

## 1. Objective

Spend money only where the data says it converts: Performance Max on the existing Merchant feed first, Meta retargeting second, cold prospecting last - with a pre-agreed kill-switch, a weekly ROAS line in the automated report, and a review/UGC loop that compounds trust for free.

## 2. Owner inputs required

- [ ] Monthly ad budget ceiling and the kill-switch rule signed off (recommended default: pause any campaign under 1x ROAS after 14 days; scale nothing until retargeting shows ≥2.5x).
- [ ] Google Ads account created + linked to Merchant Center and GA4; billing configured.
- [ ] Meta Ads account + Pixel created in Business Suite; billing configured.
- [ ] Decision: Amazon/Flipkart listing test this wave or defer (recommended: defer unless organic has plateaued; if yes, pick 3-5 hero SKUs).
- [ ] Approval cadence for ad creative (reuses the Wave 1 social engine output).

## 3. Current state (grounding - do not re-derive)

- Wave 2 delivered: `GET /feeds/google-merchant.xml` + `GET /feeds/meta-catalog.csv` (self-updating, `backend/src/feeds/`), GA4 e-commerce funnel via `frontend/lib/analytics.ts` (`view_item` → `add_to_cart` → `begin_checkout` → `purchase`), weekly automated report in `docs/reports/`, post-purchase review-request email.
- GA4 measurement ID env: `NEXT_PUBLIC_GA_MEASUREMENT_ID` (Vercel); analytics helper no-ops when unset.
- Privacy policy (Wave 1) is DPDP-aware; the consent notice covers analytics - adding an ads pixel requires a consent-layer check (see §5.1.3).
- Storefront is Next.js App Router; third-party scripts load via `@next/third-parties` in `frontend/app/layout.tsx`.

## 4. Locked design decisions

- **D-W3-1 Sequence is fixed:** PMax (Shopping) → Meta catalog retargeting → cold prospecting. Never run cold traffic before retargeting proves ROAS.
- **D-W3-2 Meta Pixel client-side first; Conversions API (CAPI) only if/when iOS signal loss visibly hurts** (measurable gap between Pixel purchases and GA4/DB purchases). CAPI is a server-side integration with real maintenance cost - do not build it speculatively (→ backlog trigger condition documented).
- **D-W3-3 UTM conventions are mandatory** on every paid and owned link: `utm_source` (google/meta/newsletter/whatsapp), `utm_medium` (cpc/paid_social/email/social), `utm_campaign` (kebab-case). One conventions table in this doc is the source of truth; the Wave 1 scheduler and Wave 2 emails adopt it.
- **D-W3-4 Marketplace tests are listing experiments, not integrations:** 3-5 hero SKUs, manual listing from a Claude-prepared export, 90-day review. No marketplace API code.

## 5. Workstreams

### 5.1 Measurement layer completion (the only code)

1. **Meta Pixel** via `@next/third-parties`-compatible loading (or a guarded `Script` component): fire standard events mirroring the GA4 helper (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` with value/currency/content_ids = SKUs) from the same call sites in `frontend/lib/analytics.ts` - one helper, two sinks, so the funnels can never drift apart.
2. Pixel ID env `NEXT_PUBLIC_META_PIXEL_ID`; no-op when absent (dev + pre-consent).
3. **Consent check:** confirm the existing notice covers advertising cookies under DPDP; if not, extend it to a two-category notice (analytics/ads) gating the Pixel. Keep it a simple banner - no CMP platform at this scale.
4. Vitest: dual-sink helper emits both payloads; absent-ID no-op; purchase dedupe shared with GA4.
5. Add a weekly spend/ROAS line to the Wave 2 report (manual paste of spend until an Ads API pull is justified → backlog).

### 5.2 Google Performance Max (owner-led, Claude-prepared)

1. Claude prepares: campaign structure doc (one PMax campaign, all products, no segmentation at this catalog size), asset group copy (headlines/descriptions in brand voice), and the negative-brand decision (own brand terms are cheap - leave included initially).
2. Owner launches at ₹500-1,000/day; 4-6 week learning window; **no target-ROAS bidding until ≥30 conversions** - maximize-conversion-value until then.
3. Weekly: read the report line; act only per the kill-switch rule (D-W3-1/§2).

### 5.3 Meta retargeting (owner-led, Claude-prepared)

1. Audiences (created in Ads Manager from Pixel data): product viewers 14d, add-to-cart 7d, checkout abandoners 7d; exclude purchasers 30d.
2. Catalog ads (DPA) from the Wave 2 Meta feed; creative falls out of the catalog + the Wave 1 social frames - no new production.
3. Launch retargeting only (₹300-500/day); cold prospecting (interest audiences) unlocks after retargeting holds ≥2.5x for a month.

### 5.4 Review + UGC engine (compounds everything)

1. Wave 2's post-delivery review-request email points at GBP (Branch A) or a testimonial capture; Claude drafts a monthly testimonial roundup into the social calendar.
2. UGC ask added to the delivered email: "tag @sunfabb for a feature" - reposts fill the calendar for free.
3. On-site reviews (product review model + moderation) remain **out of scope** (backlog) - testimonials + GBP reviews are enough at pilot scale.

### 5.5 Marketplace test (optional, owner decision)

If green-lit (§2): Claude exports 3-5 hero SKUs in Amazon/Flipkart listing templates (script in `tools/`, like the ONDC export); owner lists manually; margins tracked against commission; 90-day keep/kill review recorded in `docs/DECISIONS.md`.

## 6. Env & config

| Var | Where | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Vercel | for §5.1 | no-op when absent |

Ad accounts, billing, budgets: owner-only, never in the repo.

## 7. Test plan

- Vitest: dual-sink analytics helper (GA4 + Pixel payloads, no-op paths, shared dedupe).
- Manual: Meta Events Manager test events show all four standard events on a test purchase; GA4 vs Pixel purchase counts reconcile over a week (this doubles as the D-W3-2 CAPI trigger baseline).
- `next build` clean; lint/type-check/tests green.

## 8. Acceptance criteria / KPIs

1. Pixel events verified in Events Manager; consent notice covers ads.
2. PMax live within budget; kill-switch rule documented and followed (evidence in the weekly report).
3. Retargeting ROAS ≥2.5x before any cold spend; blended ROAS target owner-set (typical D2C textile floor 2.5-3x on retargeting).
4. Weekly report carries spend/ROAS; quarterly channel scorecard (double-down / fix / kill per touchpoint) produced.
5. UGC/testimonial content appearing in the monthly calendar without extra owner effort.

## 9. Out of scope (→ backlog with trigger conditions)

- Conversions API: build when Pixel-vs-GA4 purchase gap exceeds ~20% for a month (D-W3-2).
- Google Ads API / automated spend reporting: when weekly manual paste becomes annoying.
- On-site product reviews: when order volume makes testimonials feel thin.
- Full Amazon/Flipkart catalog: only after the hero-SKU test proves margin-positive.

## 10. Verification commands

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Plus Meta Events Manager test-event verification and one reconciled week of GA4-vs-Pixel purchase counts.
