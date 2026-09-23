# Project Progress

## Active package: Catalog launch hardening

**Started:** 2026-09-12
**Source:** `docs/reviews/2026-09-05-catalog-launch-review.md`
**Branch:** `codex/catalog-launch-hardening` from refreshed `origin/main` at `a0e1007`

### Goal

Implement the bounded application changes from the launch review without redesigning the architecture,
while preserving owner/provider/device acceptance as separate evidence gates.

### Scope and ordered work

| ID | Work package | Dependency | Acceptance |
|---|---|---|---|
| LH-1 | Admin login throttling and verified database TLS | none | focused backend tests; no certificate-verification bypass |
| LH-2 | Draft/Preview/Publish/Hide/Restore, inactive admin detail, nullable text clearing | LH-1 independent; foundation for LH-3 | new products are drafts; protected admin reads include inactive records; publish fails incomplete products; owner-visible controls and focused tests |
| LH-3 | Bounded image uploads and safe primary-cover lifecycle | LH-2 contract | type/size limits at both boundaries; actionable UI errors; exactly one cover after set/delete operations; focused tests |
| LH-4 | Reconcile local pipeline release metadata and make upload retry-safe | independent, integrates with LH-2 publication contract | no commercial defaults; 404 distinguished from service failure; partial records resume; publish only after completeness |
| LH-5 | Owner-visible contact enquiries | independent | protected paginated admin read and admin UI with tests; stored submissions remain visible after email failure |
| LH-6 | Storefront truth/lead-generation corrections | verified populated-category facts and existing site config | empty-category promotion removed or converted to enquiry; links corrected; WhatsApp context includes product URL; sort label matches behavior; focused tests |
| LH-7 | Dependency advisory triage and integrated verification | LH-1 through LH-6 | compatible patches only; backend/frontend/pipeline lint, type, unit/integration/build gates pass or blockers recorded |

### Protected and out-of-scope areas

- Do not publish or mutate live products, Cloudinary assets, messages, infrastructure, or provider settings.
- Do not enable cart or checkout, add a new CMS/CRM/queue, or redesign the storefront.
- Do not invent prices, stock, dimensions, materials, set contents, tax/shipping facts, or owner business details.
- The dirty primary checkout is preserved; implementation occurs only in the isolated worktree.

### Evidence gates that remain owner/external

- Owner-verified facts and physical-product/image fidelity for the first 10-20 promoted products.
- Live WhatsApp receipt/reply and contact email delivery.
- Authenticated parent-led admin acceptance, physical Android/iPhone checks, provider availability,
  deployed SHA/configuration, and a disposable backup restore rehearsal.

### Current state

All seven code packages are implemented in the isolated worktree and have passed their focused
acceptance checks. Integration review additionally closed two lifecycle gaps: generic product PATCH
cannot bypass Publish/Restore, and a published product's sole cover cannot be deleted without a
replacement. The retry-safe image uploader now hides incomplete legacy products through the
supported soft-delete endpoint before repair.
Final lifecycle review on 2026-09-18 closed further integrity gaps: publication now locks the
product before rechecking its cover, variants and copy; normal edits cannot clear published copy
or remove its last sellable variant. Fresh development/test seed products stay drafts until fixture
images and variants are complete, then publish within the same transaction. The uploader also
refuses unsafe existing copy instead of treating it as complete.

### Verification snapshot - 2026-09-12

- Backend: clean `npm ci`; zero npm advisories; ESLint, TypeScript, Nest build, Prisma validation,
  55 suites / 395 tests, and the CI coverage gate passed.
- Frontend: clean `npm ci`; zero npm advisories; ESLint (four test-mock image warnings only),
  TypeScript, Next.js production build, 67 files / 418 tests, and the CI coverage gate passed.
- Image pipeline: clean `npm ci`; zero npm advisories; TypeScript and 31 tests passed after
  the direct-reconciliation soft-delete regression was added.
- `git diff --check` and static storefront category-link scans passed.
- The production build used explicit local placeholder API/site URLs in lead-generation mode. It
  proves compilation and prerender fallbacks, not a deployed backend connection.

### Remaining external/owner gates

- Apply the new Prisma migration in a controlled deployment and verify the deployed backend can
  connect to Neon with certificate verification enabled.
- Verify and repair the first owner-approved product batch (copy, dimensions, contents, material,
  price, stock, care, and physical-image fidelity) before wider promotion. Existing rows are not
  automatically asserted to be truthful by the new publication guard.
- Run authenticated parent-admin acceptance for Draft/Preview/Publish/Hide/Restore, image upload and
  cover recovery, inactive variant restoration, and the Enquiries list.
- Verify real WhatsApp receipt/reply, contact email delivery, GA4, physical Android/iPhone behavior,
  provider availability, deployed SHA/configuration, and disposable backup recovery independently.

**2026-09-18 refresh:** `origin/main` still resolves to `a0e1007`. npm audits across backend,
frontend and image pipeline again reported zero advisories. No production data, provider or
deployed application state was changed by this branch.
After final lifecycle fixes, backend tests passed 55 suites / 400 tests, frontend 67 files / 418
tests, and the image pipeline 33 tests. Backend/frontend/pipeline TypeScript checks, backend Nest
build, frontend lint, and a production frontend build with explicit local lead-generation
configuration passed. The backend integration suite requires local loopback bind
permission; the first sandboxed attempt failed with `listen EPERM`, then passed with that
permission. The first frontend build attempt failed because sandbox DNS could not reach Google
Fonts; the network-enabled retry passed. No live concurrent PostgreSQL or fresh seeded E2E run
was available in this worktree.
