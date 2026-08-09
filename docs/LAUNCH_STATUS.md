# Sunfabb launch status

Canonical operational status for the production-ready MVP plan.

**Last verified:** 2026-08-09 (Asia/Kolkata)

Read this file first for launch status. `tools/image-pipeline/CATALOG_PROGRESS.md` is the
authoritative tracker for catalogue production and local image-pipeline work. The relevant phase
plan is authoritative for implementation scope and acceptance gates. `HANDOFF.md`, older growth
plans, and historical pipeline notes provide context but must not override these sources.

## Launch position

The recommended first release is a lead-generation catalogue with WhatsApp as the primary
conversion path. Transactional commerce remains disabled for launch purposes until the production
operations and go-live gates are complete.

The repository is not launch-ready yet. Phase 5’s deterministic engineering validation merged in
PR #78. The August 9 production crawl and Lighthouse evidence is recorded in PR #81, which also
fixes three live accessibility findings. The launch gate remains blocked on merge/deploy follow-up,
Phase 4 WhatsApp business setup, and the owner/manual evidence listed below.

## Current catalogue truth

- **41 numbered production designs** are published and active.
- The five non-production demo identifiers (`UNKNOWN-PLAID1`, `UNKNOWN-PLAID2`,
  `UNKNOWN-PLAID3`, `UNKNOWN-STRIPE1`, and `UNKNOWN-STRIPE2`) are absent from the public release.
- The deployed exact-five Prisma operation found no matching product, name, or SKU rows and failed
  closed without mutation. The live public products response contains none of the identifiers,
  each backend detail route returns 404, and the catalogue/sitemap contain none of them.
- Local swatches are reference assets and intentionally unpublished.
- The complete numbered-design list, release stages, and safety gates live in
  `tools/image-pipeline/CATALOG_PROGRESS.md`.

## 166-grid pilot

- Eleven candidates are classified; one source position is omitted as a duplicate.
- Nine authorized candidates have complete 5/5 local asset sets.
- `SC-166F-R1C3` and `SC-166F-R2C1` remain parked at 4/5 for repeat-scale fidelity.
- Owner QA, import, approval, and publication remain pending for the pilot batch.
- Fibre, commercial names, prices, stock, sellable variant sizes, material lookup values, and
  publication approval must be supplied or verified before publication. Missing values remain
  blocked; no defaults may be inferred.

## Phase status

| Phase | Status | Dependency / next gate |
|---|---|---|
| 0 - Establish one launch truth | Complete | Canonical launch truth and issues #46-#64 established |
| 1 - Customer safety and reliability | Complete with owner-accepted infrastructure deviations | PRs #66-#69; Render Free retained with backend-only HeyOnCall mitigation, email-only alerts, and JWT rotation deferred pending a concrete security concern |
| 2 - Public hygiene and catalogue truth | Complete for the current public release | Public release contains the 41 numbered designs and excludes the five known demo identifiers; broader copy/taxonomy/image work remains owner-deferred |
| 3 - Trust and conversion foundation | Closed for the current lead-generation release by owner decision on 2026-08-08; transactional gates deferred | Keep the public support channels and working policies; before full e-commerce, confirm legal seller/grievance identity, final policy review, owned imagery, and live contact-flow proof |
| 4 - WhatsApp Business MVP | Not started | Requires a real WhatsApp Business number and verified product facts |
| 5 - Catalogue MVP release validation | Public contract verified; owner/manual gates remain | PR #81 merge/deploy + production accessibility rerun; Phase 4 WhatsApp, device, Search Console, GA4 event, and platform-preview evidence |
| 6 - Transactional commerce completion | Partially unblocked; vendor/owner acceptance remains | PR #79 email code (draft), PR #80 refund sync, PR #82 security patch; 6.5 GST and 6.6 Shiprocket inputs still blocked |
| Image catalogue expansion | Parallel, non-blocking | Owner QA and commercial metadata; preserve fail-closed pipeline gates |

## Phase 5 verified implementation state

The merged Phase 5 work contains commits `7b16d6a`, `9d566d8`, and `8d14c19`. The
frontend suite passes **50 files / 350 tests**, lint and TypeScript pass, the lead-generation
production build generates 84 static pages, and the Phase 5 release-contract spec passes **2/2**
against the built local app. Local mobile `390×844` and desktop `1280×800` browser journeys pass,
including filter keyboard focus/Tab trapping and disposable 503 recovery behavior.

The August 9 production audit additionally passed 59/59 sitemap routes, 44/44 internal targets,
42/42 social-preview assets, robots/sitemap/canonical/metadata/recursive JSON-LD checks, and 12
distinct cold/warm Lighthouse runs. GA4 configuration and script presence were observed, but event
delivery was not. PR #81 fixes the muted-text contrast, catalogue heading-order, and unnamed-sort
control findings; its five CI checks pass. Production accessibility closure awaits merge/deploy and
a targeted rerun.

Do not repeat the completed code audit when resuming the WhatsApp action. Remaining gates are real
WhatsApp profile/catalogue/quick replies and two-way journeys, real Android/iPhone/desktop QA,
Search Console ownership/ingestion, platform-rendered social previews, and deployed GA4
Realtime/DebugView conversion evidence.

## Phase 6 active delivery snapshot

- Draft PR #79 (`feature/6.7-resend-email`, `379d46d`) closes the remaining deterministic paid-order
  email content and failure-isolation gap. All five CI checks pass. Existing launch evidence records
  a verified Resend domain and configured mail variables; reconfirm current values and complete
  owner-inbox delivery evidence before marking 6.7 complete.
- Ready PR #80 (`feature/6.10-refund-webhooks`, `afb5c3d`) implements idempotent partial/full refund
  synchronization with no inventory mutation. All five CI checks pass. This is not live cutover proof.
- Ready PR #82 (`fix/next-16.3-security`, `0b3a608`) is an intentionally separate Next/Sharp
  security patch and audit note. All five CI checks pass.
- Phase 6.5 remains blocked on accountant-approved seller/GST/HSN/rate/invoice facts. Phase 6.6
  remains blocked on Shiprocket account/API, pickup, package weight/dimensions, and shipping-rule
  decisions. The lowest-effort owner sequence is `docs/OWNER_UNBLOCK_SEQUENCE.md`.

### Phase 3 implementation evidence

The isolated Phase 3 branch implements the code portion of the trust and conversion foundation:

- `/about`, `/shipping-policy`, `/returns-policy`, `/privacy-policy`, and `/terms` are linked from
  the footer and sitemap. The owner supplied public contact channels on 2026-08-08: phone,
  WhatsApp, email, business hours, public contact address, and Google Maps location.
- The policy pages contain a conservative working draft for India delivery, returns/refunds,
  privacy, and terms. The draft assumptions (including a seven-calendar-day change-of-mind return
  request window, preferred 48-hour damage report, and five-to-seven-business-day refund initiation)
  are explicitly presented as working terms and require final owner, accountant, and Indian legal
  review before they are treated as final terms. The supplied email and phone channels are the
  current catalogue-release support and grievance intake; no legal entity or appointed officer is
  inferred from them.
- Product pages now show the same working dispatch, serviceable-PIN, returns, payment-posture, and
  business-contact summary, with the full policy pages linked from the site footer.
- The site does not publish the billing-only tax identifier as general storefront copy. Backend
  billing configuration remains reserved for the Phase 6.5 invoice implementation; no GST invoice
  behavior is claimed by this Phase 3 change.
- Contact channels, social profiles, LocalBusiness data, and PDP trust claims fail closed when the
  corresponding owner-verified value is unavailable.
- The public storefront has a reversible `NEXT_PUBLIC_HIDE_TEST_IMAGES` switch. When enabled, the
  frontend filters seeded Unsplash URLs from category imagery, product cards, PDP galleries, and
  product structured data without changing database rows or admin visibility.
- The contact route validates backend success/error payloads at the frontend boundary, and the
  backend stores submissions independently of best-effort email delivery.
- Resend transport, transactional templates, contact acknowledgement, owner notification, and
  safe operational failure logs are implemented. Production requires `RESEND_API_KEY` and
  `EMAIL_FROM`; `CONTACT_NOTIFY_EMAIL` is configured for owner notification. The Render backend
  now contains all three mail-delivery variables, using a dedicated sending-only key, and the
  resulting Phase 3 deployment is live.
- Local verification passed on 2026-08-08: backend 49 suites / 319 tests, frontend 48 suites /
  341 tests, both package type-checks, both linters, backend build, and frontend production build
  with the documented production API URL and lead-generation mode. The build emitted only existing
  Next workspace-root and middleware deprecation warnings.
- The `sunfabb.com` Resend domain is verified. The Vercel Preview environment now contains the
  unquoted Turnstile site key and the refreshed Phase 3 preview produces a Turnstile token. No
  live form submission was created during this probe. The live backend health endpoint returned
  200, and a negative contact probe with an invalid Turnstile token returned 403 without delivery.

Phase 3 is closed for the current lead-generation release by owner decision on 2026-08-08. This is
not a claim that the original transactional completion gate is satisfied. The following are
explicitly deferred before full live e-commerce: legal seller identity and any formally required
appointed grievance officer, owner/accountant/Indian legal review of the working policies, a real
deployed contact-form submission proving database persistence plus both email paths and failure
visibility, and replacement of generic imagery with owned or licensed assets. The storefront image
switch keeps the seeded Unsplash URLs out of public rendering until the concurrent catalogue/image
work supplies approved replacements.

### Phase 2C evidence

The read-only [41-design public-data audit](audits/PHASE2C_41_DESIGN_PUBLIC_DATA_AUDIT.md) was
generated from the public API on 2026-08-02. It covers 41 numbered designs and 163 variants. It
does not approve public claims: dimensions, set contents, product names, materials, sizes, prices,
stock source, care instructions, and publication approval remain missing or blocked until matched
to owner-approved release records. The current numbered list is a working set, not the final
catalogue; additional raw supplier inputs remain pending for later image-pipeline processing.

## Release guardrails

- Do not invent business, legal, tax, stock, price, material, dimension, set-content, shipping, or
  contact information.
- Do not publish a classified candidate without verified commercial metadata and owner approval.
- Do not upload or create products as part of local image generation.
- Do not enable transactional commerce until the lead-generation catalogue is coherent and the
  transactional go-live plan is complete.

## Project-control queue

Phase 0 created these GitHub milestones:

- [Catalogue Lead-Gen MVP](https://github.com/Gogulaanand/sunfabb-catalog/milestone/1)
- [Transactional Commerce](https://github.com/Gogulaanand/sunfabb-catalog/milestone/2)
- [Catalogue Expansion](https://github.com/Gogulaanand/sunfabb-catalog/milestone/3)

The ordered implementation queue is represented by these issues:

Phase 2A/2B implementation is delivered in [PR #71](https://github.com/Gogulaanand/sunfabb-catalog/pull/71).
Current review work is PRs #79–#82; use `docs/OWNER_UNBLOCK_SEQUENCE.md` rather than the historical
issue order to resume the active launch boundary.

| Order | Issue | Milestone |
|---:|---|---|
| 0 | [#46 Establish canonical launch status and project-control queue](https://github.com/Gogulaanand/sunfabb-catalog/issues/46) | Catalogue Lead-Gen MVP |
| 1 | [#47 Diagnose and remove catalogue and PDP production timeouts](https://github.com/Gogulaanand/sunfabb-catalog/issues/47) | Catalogue Lead-Gen MVP |
| 2 | [#48 Align CI, Vercel, and Render Node runtimes](https://github.com/Gogulaanand/sunfabb-catalog/issues/48) | Catalogue Lead-Gen MVP |
| 3 | [#49 Complete production security basics](https://github.com/Gogulaanand/sunfabb-catalog/issues/49) | Catalogue Lead-Gen MVP |
| 4 | [#50 Introduce an explicit lead-generation storefront mode](https://github.com/Gogulaanand/sunfabb-catalog/issues/50) | Catalogue Lead-Gen MVP |
| 5 | [#51 Remove demo products from the public release](https://github.com/Gogulaanand/sunfabb-catalog/issues/51) | Catalogue Lead-Gen MVP |
| 6 | [#52 Audit the 41 production designs for public-data truthfulness](https://github.com/Gogulaanand/sunfabb-catalog/issues/52) | Catalogue Lead-Gen MVP |
| 7 | [#53 Remove internal product copy and unsupported claims](https://github.com/Gogulaanand/sunfabb-catalog/issues/53) | Catalogue Lead-Gen MVP |
| 8 | [#54 Fix catalogue taxonomy and unsupported categories](https://github.com/Gogulaanand/sunfabb-catalog/issues/54) | Catalogue Lead-Gen MVP |
| 9 | [#55 Complete the trust and contact foundation](https://github.com/Gogulaanand/sunfabb-catalog/issues/55) | Catalogue Lead-Gen MVP |
| 10 | [#56 Build the product-aware WhatsApp Business funnel](https://github.com/Gogulaanand/sunfabb-catalog/issues/56) | Catalogue Lead-Gen MVP |
| 11 | [#57 Run the catalogue lead-generation MVP release audit](https://github.com/Gogulaanand/sunfabb-catalog/issues/57) | Catalogue Lead-Gen MVP |
| 12 | [#58 Finish 166-grid pilot owner QA and commercial readiness](https://github.com/Gogulaanand/sunfabb-catalog/issues/58) | Catalogue Expansion |
| 13 | [#59 Resolve or retain the two parked repeat-fidelity candidates](https://github.com/Gogulaanand/sunfabb-catalog/issues/59) | Catalogue Expansion |
| 14 | [#60 Publish verified catalogue expansion in small batches](https://github.com/Gogulaanand/sunfabb-catalog/issues/60) | Catalogue Expansion |
| 15 | [#61 Complete Resend transactional email integration](https://github.com/Gogulaanand/sunfabb-catalog/issues/61) | Transactional Commerce |
| 16 | [#62 Complete GST invoicing with accountant-approved inputs](https://github.com/Gogulaanand/sunfabb-catalog/issues/62) | Transactional Commerce |
| 17 | [#63 Complete Shiprocket shipping integration](https://github.com/Gogulaanand/sunfabb-catalog/issues/63) | Transactional Commerce |
| 18 | [#64 Execute final transactional go-live drill](https://github.com/Gogulaanand/sunfabb-catalog/issues/64) | Transactional Commerce |
