# Phase 6.9 — Hardening and purchase E2E

## Status

Implementation and runtime verification are complete on `feature/6.9-hardening-e2e`, based on
`main` at `4f327a0`. Commit `6788b93` is published in PR #39. The final suite ran against a
temporary isolated PostgreSQL 16 container and built NestJS/Next.js services.

## Delivered

- Added test-only `E2E_PAYMENT_MODE=stub`, guarded from production, while retaining explicit Razorpay
  configuration and the real HMAC verification path.
- Seeded a verified E2E customer only when the E2E password variable is explicitly configured.
- Rejected order placement for authenticated customers whose email is not verified.
- Replaced single-origin CORS configuration with an exact-match, comma-separated allowlist.
- Validated the checkout place-order response with a shared Zod contract instead of a TypeScript cast.
- Added a Playwright purchase flow and customer/admin cross-principal authorization flow.
- Repaired stale/self-contained backend Jest E2E coverage: the removed root scaffold route and contact
  persistence test no longer depend on a remote database.
- Added the Phase 6.9 CI environment and made the purchase spec blocking alongside the golden path.

## Verification evidence

| Check                              | Result                          |
| ---------------------------------- | ------------------------------- |
| Backend unit tests                 | 42 suites, 261 passed           |
| Backend Jest E2E                   | 3 suites, 10 passed             |
| Frontend tests                     | 26 files, 220 passed, 1 skipped |
| Backend/frontend lint              | passed                          |
| Backend/frontend typecheck         | passed                          |
| Backend/frontend production builds | passed                          |
| Playwright purchase spec discovery | 2 tests listed                  |
| Playwright purchase runtime        | 2 passed                        |
| Full blocking Playwright suite     | 10 passed                       |

## Required final verification

The CI-equivalent migration, seed, built services, and blocking suite were run successfully with:

```bash
npx playwright test --config=e2e/playwright.config.ts \
  e2e/specs/golden-path.spec.ts e2e/specs/purchase-flow.spec.ts
```

Known `npm audit` findings remain transitive dependency advisories; forcing the frontend audit fix
would downgrade Next.js and was intentionally not applied.
