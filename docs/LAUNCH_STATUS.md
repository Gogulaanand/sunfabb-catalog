# Sunfabb launch status

Canonical operational status for the production-ready MVP plan.

**Last verified:** 2026-08-01 (Asia/Kolkata)

Read this file first for launch status. `tools/image-pipeline/CATALOG_PROGRESS.md` is the
authoritative tracker for catalogue production and local image-pipeline work. The relevant phase
plan is authoritative for implementation scope and acceptance gates. `HANDOFF.md`, older growth
plans, and historical pipeline notes provide context but must not override these sources.

## Launch position

The recommended first release is a lead-generation catalogue with WhatsApp as the primary
conversion path. Transactional commerce remains disabled for launch purposes until the production
operations and go-live gates are complete.

The repository is not launch-ready yet. The most urgent unresolved risks are catalogue/PDP
timeouts, public contact placeholders, a mismatch between commerce UI and readiness, internal
development copy, demo products exposed in the public catalogue, unsupported taxonomy, and
incomplete trust/policy content.

## Current catalogue truth

- **41 numbered production designs** are published and active.
- **Five non-production demo products** remain active: `UNKNOWN-PLAID1`, `UNKNOWN-PLAID2`,
  `UNKNOWN-PLAID3`, `UNKNOWN-STRIPE1`, and `UNKNOWN-STRIPE2`.
- The current live total is therefore **46 active catalogue items**, but only the 41 numbered
  designs are production catalogue evidence.
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
| 0 - Establish one launch truth | Complete | Begin with [#47 catalogue/PDP timeout diagnosis](https://github.com/Gogulaanand/sunfabb-catalog/issues/47) |
| 1 - Customer safety and reliability | Not started | Phase 0 queue; production/Vercel/Render evidence required |
| 2 - Public hygiene and catalogue truth | Not started | Follows reliability work; requires verified catalogue data |
| 3 - Trust and conversion foundation | Not started | Requires owner business, contact, legal, and policy inputs |
| 4 - WhatsApp Business MVP | Not started | Requires a real WhatsApp Business number and verified product facts |
| 5 - Catalogue MVP release validation | Not started | Follows phases 1-4 and human release checks |
| 6 - Transactional commerce completion | Vendor-gated | Resend, GST, Shiprocket, Razorpay, and go-live inputs/verification |
| Image catalogue expansion | Parallel, non-blocking | Owner QA and commercial metadata; preserve fail-closed pipeline gates |

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
