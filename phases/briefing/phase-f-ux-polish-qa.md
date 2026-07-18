# Phase F Briefing: UX Polish + QA

**Date:** 2026-07-18
**Branch:** `feature/ux-polish-qa`
**Base:** `main` at `a7d439a` (Phase E)

## Implementation

- Next.js 16.2.6 View Transitions were evaluated and intentionally not enabled. The integration remains experimental and is not recommended for production.
- Added `frontend/app/(storefront)/template.tsx` with `ENABLE_PAGE_TRANSITIONS = true` and a removable `storefront-page-transition` class.
- Added a 200ms opacity-only CSS fade with `prefers-reduced-motion` suppression.
- Reworked the storefront `not-found.tsx` and `error.tsx` pages with Playfair headlines, terracotta accents, recovery copy, Home/Catalog navigation, and `Reveal` entrance motion.
- Added focused tests for the template and fallback pages.

## Automated verification

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm test` | 26 files, 219 passed, 1 skipped |
| `npm run build` | Pass; Next 16.2.6 production build completed |
| Focused fallback/template tests | Pass; 3 tests |

The build still reports existing workspace-root/middleware deprecation warnings. A build using the pre-existing local backend endpoint also logged a caught fetch failure; the isolated QA build against the alternate backend port completed without that fetch failure.

## Browser screenshot sweep

Playwright captured 14 screenshots at `1280x800` desktop and `390x844` mobile. Temporary artifacts are in `/private/tmp/phase-f-qa/isolated-screenshots/` and cover:

| Route | Desktop | Mobile | Result |
|---|---:|---:|---|
| `/` | ✓ | ✓ | HTTP 200, content rendered |
| `/catalog` | ✓ | ✓ | HTTP 200, content rendered |
| `/catalog/does-not-exist` (PDP fallback) | ✓ | ✓ | HTTP 200, branded not-found rendered |
| `/cart` | ✓ | ✓ | HTTP 200, content rendered |
| `/checkout` | ✓ | ✓ | Redirects to `/account/login?next=/checkout` |
| `/contact` | ✓ | ✓ | HTTP 200, content rendered |
| `/account` | ✓ | ✓ | Redirects to `/account/login` |

The browser reported no Next error overlay. Each page emitted a local-only 404/MIME error for the Vercel Speed Insights script because the local production server does not serve that deployment asset; this is not caused by the Phase F changes.

## Lighthouse

Audited with Lighthouse CLI against the isolated production frontend on port 3002.

| Route | Performance | Accessibility | Key metrics |
|---|---:|---:|---|
| `/` | 89 (91 on repeat) | 96 | First run: FCP 0.8s, LCP 3.9s; repeat: LCP 3.5s; CLS 0, TBT 10ms |
| `/catalog` | 95 | 96 | FCP 0.9s, LCP 2.9s, CLS 0, TBT 10ms |
| `/catalog/heritage-linen-bedspread` | Not available | Not available | Server returned HTTP 500 |

The home performance result varied by run: the first audit scored 89 and a repeat scored 91, while accessibility stayed at 96. The PDP could not be audited because the backend product endpoint throws `TypeError: Cannot read properties of undefined (reading 'GALLERY')`; the local database also exposes the related `image_role` schema mismatch. These are pre-existing data/backend issues outside Phase F's storefront-only scope and remain blockers to the full exit criteria.

The local catalog currently renders zero products and still exposes `E2E Category 540209`; those existing content/data issues were recorded rather than changed in this phase.

## Keyboard and reduced-motion sweep

- Keyboard-only traversal ran across all seven required routes with 18 Tab presses per route.
- Header links, catalog sort/filter controls, fallback links, contact fields, login controls, and cart actions received focus; no keyboard trap was observed.
- Normal mode reports `storefront-page-fade-in` at `0.2s`.
- With `prefers-reduced-motion: reduce`, the browser reports `animation-name: none` and `animation-duration: 0s`.

## Status

Phase F implementation is ready for review, but the phase exit remains blocked by the home Lighthouse performance score, the unavailable PDP audit, and the pre-existing local catalog/backend data mismatch. The next QA pass should rerun the same matrix after the backend generated enum/runtime issue and catalog content are repaired.
