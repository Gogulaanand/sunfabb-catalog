# Sunfabb launch status

Canonical operational status for the production-ready MVP plan.

**Last verified:** 2026-08-02 (Asia/Kolkata)

Read this file first for launch status. `tools/image-pipeline/CATALOG_PROGRESS.md` is the
authoritative tracker for catalogue production and local image-pipeline work. The relevant phase
plan is authoritative for implementation scope and acceptance gates. `HANDOFF.md`, older growth
plans, and historical pipeline notes provide context but must not override these sources.

## Launch position

The recommended first release is a lead-generation catalogue with WhatsApp as the primary
conversion path. Transactional commerce remains disabled for launch purposes until the production
operations and go-live gates are complete.

The repository is not launch-ready yet. Phase 1 reliability and security work is complete, and the
Phase 2A/2B lead-generation and public-demo gates are shipped. The remaining urgent risks are
internal development copy, unsupported taxonomy, and incomplete trust/policy content.

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
| 2 - Public hygiene and catalogue truth | In progress | 2A/2B merged in PR #71; Phase 2C audit delivered in PR #73; live reconciliation confirms the five named non-numbered products are no longer public; this branch implements the bounded 2D/2E source changes, pending deployment proof |
| 3 - Trust and conversion foundation | Not started | Requires owner business, contact, legal, and policy inputs |
| 4 - WhatsApp Business MVP | Not started | Requires a real WhatsApp Business number and verified product facts |
| 5 - Catalogue MVP release validation | Not started | Follows phases 1-4 and human release checks |
| 6 - Transactional commerce completion | Vendor-gated | Resend, GST, Shiprocket, Razorpay, and go-live inputs/verification |
| Image catalogue expansion | Parallel, non-blocking | Owner QA and commercial metadata; preserve fail-closed pipeline gates |

### Phase 2C evidence

The read-only [41-design public-data audit](audits/PHASE2C_41_DESIGN_PUBLIC_DATA_AUDIT.md) was
generated from the public API on 2026-08-02. It covers 41 numbered designs and 163 variants. It
does not approve public claims: dimensions, set contents, product names, materials, sizes, prices,
stock source, care instructions, and publication approval remain missing or blocked until matched
to owner-approved release records. The report's five-product discrepancy was a point-in-time
finding before the subsequent production reconciliation; a fresh live probe on 2026-08-02 confirmed
41 public products, no non-numbered products, no cleaned slug in the list, and 404 detail routes for
all five cleaned slugs. The current numbered list is a working set, not the final catalogue;
additional raw supplier inputs remain pending for later image-pipeline processing.

### Phase 2D/2E implementation state

This source branch adds a public product-boundary filter that removes descriptions containing
internal, test, generation, or admin-facing markers while leaving stored records and admin
responses unchanged. It also adds public taxonomy routes: categories are limited to categories with
active products, and materials and colours are limited to active variants of active products. The
storefront catalog, filters, navigation, home page, metadata, and sitemap now consume those public
routes, so unsupported empty taxonomy entries are not rendered as public destinations.

The implementation is locally verified, but has not yet been deployed; the live API remains the
source of truth until a merged deployment is probed. Owner-approved product fact sheets,
publication approval, and approved category imagery remain blocked and are intentionally not
inferred or changed here. Phase 3 trust, contact, policy, and WhatsApp inputs are outside this
branch.

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

Phase 2A/2B implementation is delivered in [PR #71](https://github.com/Gogulaanand/sunfabb-catalog/pull/71),
and the read-only Phase 2C audit is delivered in [PR #73](https://github.com/Gogulaanand/sunfabb-catalog/pull/73).
The five named non-numbered products were reconciled in production after that audit; this source branch
does not repeat or undo that operation. Issues #53/#54 are implemented in this branch as the next
bounded source scope, with deployment and owner-dependent gates still pending.

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
