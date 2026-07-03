# HANDOFF.md

High-level project state. Read alongside `CLAUDE.md` and `docs/WORKFLOW.md`.

Fine-grained "where we left off in the current session" notes live in `.session-state.md`
on the active developer's machine (gitignored). This file only tracks **phase-level**
state that anyone cloning the repo should see.

---

## One-paragraph summary

We're building a home-textiles product catalog (bedspreads, towels, napkins, table linen) for the
India market, INR only. It's a deliberate full-stack learning project for a frontend engineer:
a **separate NestJS backend + Next.js frontend + PostgreSQL/Prisma** monorepo, chosen specifically
to maximize backend learning depth. Catalog is small (20–30 products, won't exceed ~100), so scale
is a non-issue — optimize for clean patterns and learning. E-commerce is a future phase; first goal
is a browsable catalog with a hidden single-admin UI.

---

## Where we are

- **Phase:** 0–5 done and merged (incl. 5.5 restyle, 5.5.1 Web Vitals + keep-alive PR #6, 5.7 CI/CD
  hardening + Playwright e2e). The 2026-06-21 audit fixes (D30/D31) merged as PR #16. **Phase 6
  (e-commerce) is now in progress** — see the "Phase 6 — e-commerce (IN PROGRESS)" section below.
  *(Earlier notes about nav-slowness / deferred PR #6 are stale — both landed: PR #9 ISR + Speed
  Insights, PR #6 Web Vitals.)* **Phase 6.1 frontend complete** (2026-06-25) — see milestone log.
- **Current focus:** 6.1 (accounts, PR #18/#19), 6.2 (cart, PR #20), 6.3 (checkout & orders, PR #21) done.
  **6.4 (Razorpay payments) is code-complete** on `feature/phase6.4-payments`, pending Razorpay test
  keys + a security-reviewer pass before its PR — see "Where to go next" in the Phase 6 section below.
- **Live URLs:** frontend `https://sunfabb.com` (Vercel project `sunfabb-storefront`), backend
  `https://sunfabb-backend.onrender.com` (Render, free tier). Old personal homepage relocated to
  `https://home.sunfabb.com` (Vercel project `website`).
- **Database:** Neon. Schema now includes the **full Phase 6 e-commerce models** (Customer, Address,
  EmailToken, Cart/CartItem, Order/OrderItem, Payment, WebhookEvent, Shipment) — migration
  `20260622021310_phase6_foundations`, applied to the dev DB.

For the exact next session scope and any in-flight notes, see local `.session-state.md`.

---

## ✅ Phase 4 golden-path verification — closed out (2026-06-20)

The Phase 4 admin UI (login, categories/materials/colors/products/variants/images CRUD, Chakra UI v3,
design tokens) is built per `.omc/plans/2026-06-20-design-system-and-phase4-admin-ui.md`. The DB
connectivity blocker from the prior session is resolved and the backend golden path is confirmed
against a live Neon query.

**Root cause (not what was hypothesized):** the prior session's `ETIMEDOUT` had nothing to do with a
sandbox blocking port 5432 — `nc`/`curl` could always reach Neon's pooler instantly. The real bug:
Node's Happy Eyeballs (`autoSelectFamily`) races IPv4 + IPv6 connection attempts, and on networks with
no IPv6 route it stalls long enough to time out the working IPv4 path too. Fixed in `backend/src/main.ts`
with `setDefaultAutoSelectFamily(false)` — see D21 in `docs/DECISIONS.md`. Also discovered `main.ts`
never loaded `.env` at all (only the Prisma CLI's `prisma.config.ts` did); added `import 'dotenv/config'`
so `npm run start:dev` works standalone without manually exporting env vars.

**Verified end-to-end** (via direct API calls against the running backend — no browser/screenshot
tooling was available this session, so this wasn't a literal UI click-through, but it exercises the
exact same write endpoints the admin UI's server-side `admin-api.ts` calls):
- Login: wrong password → 401, correct password → JWT ✅
- Validation error: missing required fields on category create → 400 ✅
- Create category → material → color → product → variant, all 201 with real Neon rows ✅
- Edit product, edit variant (price) → 200 ✅
- Soft-delete the only variant on a product → `is_active: false`, and the public product-detail
  endpoint correctly hides it (`variants: []`) instead of hard-deleting ✅
- Full backend test suite (72 tests) still green after the `main.ts` changes ✅

**Known gap, separate from this blocker:** image upload (`POST /admin/images/upload`) returns 500 —
`Error: cloud_name is disabled` — because `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` are blank in
`backend/.env`. This is a missing-credentials issue, not a code bug; fill in real Cloudinary credentials
to test image upload/attach.

**Not done:** an actual visual click-through of the Chakra UI admin forms in a browser (login page
rendering, dialog forms, design tokens) — no browser automation tool was available in this session.
Recommend a manual pass in an actual browser before fully closing Phase 4, focused on visual/UX
correctness (the design-token theming, form validation messages, dialog flows) rather than data
correctness, which is now confirmed at the API layer.

Test data left in the dev DB from this verification pass (category "Bedspreads", material "Cotton",
color "Indigo", product "Royal Cotton Bedspread" with one soft-deleted variant) — left in place per
request, safe to delete manually via the admin UI once it's up.

**See `docs/PRE_PHASE5_VERIFICATION.md`** for the full manual test checklist (credentials sanity
check, plus scenario-by-scenario coverage across PRs #1–#4) that still needs a human pass before
treating Phase 4 as fully closed and starting Phase 5.

---

## Open decisions / blockers

- **Backend host:** ✅ decided (2026-06-21) — **Render**, free tier to start. Compared against Railway
  and Fly.io on four criteria for this project's actual scale (single admin, ~100 products, no
  e-commerce yet):
  - **Free/cheap tier fit:** Render's free web service tier (750 hrs/mo, 512MB/0.1 CPU, no card
    required) comfortably covers this scale. Railway no longer has a real free tier — its Hobby plan
    charges a $5/mo *minimum spend* even at near-zero usage. Fly.io removed free allowances for new
    signups entirely (2 VM-hr/7-day trial only); realistic pay-as-you-go cost for a small always-on
    app is $8–25/mo.
  - **Env var/secrets setup:** Render has a simple dashboard key-value "Environment" tab — fits the
    9 vars this backend needs (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`,
    `ADMIN_PASSWORD_HASH`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
    `FRONTEND_URL`, `PORT`). Railway is equally easy via its own Variables tab. Fly.io requires the
    `flyctl` CLI (`fly secrets set`) — no GUI-first option.
  - **Cold-start behavior:** Render's free tier sleeps after 15 min idle with a 30–60s cold start —
    acceptable for a low-traffic catalog with no checkout flow yet.
  - **Deploy-from-GitHub:** Render has native, zero-config GitHub auto-deploy that layers cleanly on
    top of the existing `.github/workflows/ci.yml` (CI keeps gating lint/tsc/test on every PR; Render
    redeploys `main` on merge — no new Actions steps needed). Fly.io would need an added
    `flyctl deploy` CI step to integrate with GitHub.
  - **Upgrade path:** move to Render's Starter plan ($7/mo, no sleep) once cold starts become
    unacceptable — e.g. a real public launch, or the future Phase 6 checkout flow needing fast
    first-byte.
- **Stitch mockups** — ✅ done (2026-06-20). Phase 3 storefront (home/catalog/product-detail) is now
  restyled to match the Ethos & Hearth Stitch mockups using the same design tokens the admin UI
  already had. See the milestone log entry below for what changed.
- **Mobile-responsive QA** — ✅ done (2026-06-21). PR #5 (`feature/phase5.5-storefront-restyle`) was
  restyled and verified at desktop/tablet widths only; a follow-up pass against the Stitch *mobile*
  mockups (390×844) found and fixed two real gaps — see D23 in `docs/DECISIONS.md`. Not a blocker,
  just worth knowing: future visual QA passes should check mobile widths from the start, not as an
  afterthought, since sidebar/nav patterns that "reflow" at narrow widths often need an explicit
  collapse rather than just stacking.
- **Local admin password is a placeholder, not a secret to carry forward.** During this session's
  visual QA pass the original `ADMIN_PASSWORD_HASH` in `backend/.env` (bcrypt hash, plaintext unknown)
  was swapped for a known dev password (`DevPassword123!`) so the login flow could be tested in a
  browser. `backend/.env` is gitignored and was never committed, so this has zero production exposure
  — but **before deploying, generate a fresh strong password + bcrypt hash and set `ADMIN_EMAIL` /
  `ADMIN_PASSWORD_HASH` directly as environment variables in the hosting platform's dashboard**
  (Render/Railway/Fly.io secrets), never in a file. Local `.env` and prod env vars are already
  separate; don't reuse the dev password.
- **Phase 4 verification** — data-layer golden path confirmed against a live DB (see note above); a
  manual visual click-through in a browser (Chakra forms, design tokens, dialogs) is still pending —
  no browser tooling was available this session. Also need real Cloudinary credentials in
  `backend/.env` to test image upload (currently blank, fails with `cloud_name is disabled`). Full
  checklist: `docs/PRE_PHASE5_VERIFICATION.md`.
- **Render free tier now requires a card on file** (changed since the original Render decision was
  made) — added 2026-06-21, no cost incurred yet on free tier.
- **PR #6 (Web Vitals optimizations + keep-alive.yml) still not on `main`.** Deferred during Phase 5
  deploy; the live site currently runs pre-optimization code, so Render free-tier cold starts are
  unmitigated. Re-run the Phase 5.5.1 live-vs-localhost Web Vitals comparison once this lands — see
  PR #7 for the partial comparison done without it.
- **Old homepage (`website` Vercel project, now at `home.sunfabb.com`) has a pre-existing broken
  deployment and an expired wildcard cert** (`*.sunfabb.com`, expired June 2021). Discovered during
  the Phase 5 domain swap, unrelated to and out of scope for the catalog project — needs separate
  attention.
- **Reported: navigation feels slow after first page load and when moving between sections.** Not
  yet root-caused. Next session's focus — see prompt logged for this in the milestone entry below.

---

## ✅ Audit findings (2026-06-21) — fixed same day, see D30/D31

A retrospective audit of every phase (scaffold → current `main`) against the hard rules and
`docs/DECISIONS.md` found the **backend genuinely solid** (no raw SQL, full JWT-guard coverage on every
write, integer-paise money, soft deletes, global ValidationPipe all verified clean). The real damage was
concentrated in one file — `frontend/lib/api.ts` had drifted from the actual API contract. Root-cause
writeups are in `docs/DECISIONS.md` D30 (contract drift) and D31 (secret fallback); generic preventions
added as CLAUDE.md rules 11–12 and `frontend/AGENTS.md`. All fixed on `fix/storefront-api-contract`:

- ✅ **Critical — product detail always showed "Out of stock."** Fixed: `lib/api.ts` now types the field
  `stock_quantity` to match the backend; `VariantSelector.tsx` reads `selectedVariant.stock_quantity`.
- ✅ **Critical — catalog material/color filters returned zero products.** Fixed: dropped the `Number()`
  coercion in `catalog/page.tsx`; `materialId`/`colorId` are typed `string` end-to-end in `lib/api.ts`.
- ✅ **Should-fix — storefront type layer was wrong at the root** (`lib/api.ts`). Fixed: every interface
  now mirrors the real payload (uuid string ids throughout) and is validated at the fetch boundary with
  `zod` instead of an `as` cast — a future contract drift now throws loudly instead of silently shipping
  `undefined`. Also surfaced and fixed a related bug this validation work caught: `VariantSelector.tsx`
  deduped a variant's material/color by `.id`, but that nested shape has no `id` (only `name`) — every
  product's color options were silently collapsing to one swatch. Now dedupes by `name`. See D30.
- ✅ **Should-fix — image secondary sort was inert.** Fixed: `catalog/[slug]/page.tsx` now sorts by
  `sort_order` (was `display_order`, always `undefined`).
- ✅ **Should-fix — `JWT_SECRET ?? 'dev-secret'` fallback.** Fixed: both `auth.module.ts` and
  `jwt.strategy.ts` now call a shared `getJwtSecret()` (`backend/src/auth/jwt-secret.ts`) that throws at
  boot if unset; no fallback. See D31.

**Notes (not blockers):** lookup tables (`categories`/`materials`/`colors`) hard-delete with no FK guard —
out of the soft-delete rule's "products/variants" scope, fine at this scale but throws a raw 500 on a
referenced row; `findAllAdmin` silently ignores the material/color filters the public list supports. The
two `images` modules (`src/images` delete, `src/admin/images` upload) are **not** duplicated and both are
JWT-guarded — verified, no action needed.

**Ready-to-paste prompt for the fix session:**

```
Fix the storefront API-contract bugs found in the 2026-06-21 audit. Read these first: HANDOFF.md
"Open audit findings", docs/DECISIONS.md D30–D31, and CLAUDE.md rules 11–12 + frontend/AGENTS.md.
Work on a new branch off main: fix/storefront-api-contract.

Fixes:
1. Correct frontend/lib/api.ts to match the real backend payload (backend/prisma/schema.prisma is
   the source of truth): `id` is a uuid string (not number) on every interface; ProductVariant
   `stock` → `stock_quantity`; ProductImage `display_order` → `sort_order`; ProductsQuery
   `materialId`/`colorId` → string.
2. catalog/page.tsx:29-30 — remove the Number() coercion on params.material/params.color; pass the
   uuid strings straight through.
3. Update consumers: VariantSelector.tsx (stock_quantity) and catalog/[slug]/page.tsx:42
   (sort_order). Grep the storefront for `.stock`, `.display_order`, and numeric-id assumptions to
   catch any others.
4. Harden auth: make JWT_SECRET required — throw at boot if unset (mirror the DATABASE_URL guard in
   prisma.service.ts) in both auth.module.ts and jwt.strategy.ts; remove the 'dev-secret' fallback.
   Keep JWT_EXPIRES_IN's default.

Prevention (implement, per CLAUDE.md rule 11 — generic, not just these fields): stop casting
res.json() in lib/api.ts. Add zod (`npm i zod` in frontend/) and parse each response against a
schema mirroring the backend, OR add a shared typed fixture mirroring the real payload and assert
against it. Then fix lib/api.test.ts so its mocks use the REAL shape (uuid string ids,
stock_quantity, sort_order) — the current mocks use id:1 and would mask the bug. Add a test that
fails when a response is missing an expected field.

Verify before claiming done: in frontend/, `npm run lint && npx tsc --noEmit && npm run test` all
green; confirm (via test or manually) that a product with stock shows "In stock" and that a
material filter returns products. Commit per D16 (small commits, feature branch, PR to main). Then
flip DECISIONS.md D30/D31 Status from "Open" to "Fixed" and tick these HANDOFF.md audit items.
```

---

## Phase 6 — e-commerce (IN PROGRESS)

Full plan + scope decisions: **`.omc/plans/2026-06-21-phase6-ecommerce.md`**. Decisions locked so far:
ADRs **D32–D38** in `docs/DECISIONS.md`. Owner's scope choices: full customer accounts, GST-registered
itemized tax, Shiprocket courier, Razorpay test-mode-first (live gated on KYC).

### Milestone status
| # | Milestone | Status |
|---|---|---|
| 6.0 | Foundations — schema (10 models incl. `WebhookEvent` idempotency ledger), migration, ADRs D32–D37, `.env.example` | ✅ **done** — PR #17 |
| 6.1 | Customer accounts & auth — separate `customer-jwt` principal, addresses CRUD (IDOR-safe), email-token verify/reset, throttler, security-reviewed (backend); `(shop)/account` route group, deny-by-default middleware, zod-validated client (frontend) | ✅ **done** — backend PR #18, frontend PR #19 (stacked on #18), browser-verified golden path |
| 6.2 | Cart (server `Cart`/`CartItem` + Zustand, merge-on-login, price re-read) | ⬜ todo |
| 6.3 | Checkout & orders (totals engine, `Order`/`OrderItem` snapshots, stock reserve/release, state machine) | 🚧 **built** on `feature/phase6.3-checkout` (stacked on 6.2/PR #20) — backend `checkout/`+`orders/`, frontend `/checkout`+`/account/orders`, lint/tsc/tests green both apps, real-DB integration + SSR flow verified (D39). Not merged. |
| 6.4 | Razorpay payments (test) — Orders API, dual signature verify, webhook + idempotency | 🚧 **code-complete** on `feature/phase6.4-payments` (stacked on 6.3) — backend `payments/`+`webhooks/`, frontend hosted Checkout in `CheckoutClient`, lint/tsc/tests green both apps (D40). **Acceptance #4's "payment failure releases stock" is knowingly unmet** — owner decision needed, see "Where to go next" below. **Not merged** — live Razorpay test keys + the §7.3 security-reviewer pass are still needed before PR. |
| 6.5 | GST invoicing — HSN, CGST/SGST/IGST, sequential invoice numbers, PDF | ⬜ todo (needs accountant inputs) |
| 6.6 | Shipping (Shiprocket) — serviceability/rates, AWB/label, tracking webhook | ⬜ todo (needs Shiprocket acct) |
| 6.7 | Email (Resend) — replace the `EmailService` stub, verified domain | ⬜ todo (needs Resend domain verify) |
| 6.8 | Admin order management UI | ⬜ todo |
| 6.9 | Hardening & Playwright e2e (full purchase, cross-principal test) | ⬜ todo |
| 6.10 | Go-live (gated on Razorpay + Shiprocket KYC, Render Starter) | ⬜ todo |

### 6.1 security hardening backlog (from the 6.1 security review — none block merge)
Review verdict: **LOW risk, no critical/high.** Applied already: atomic token consume (L1), constant-time
login (M4), sibling-reset-token invalidation (M2-partial), `HS256` pin (L2), verify-email throttle
(M3-partial), no raw-token logs in prod (Info-2). **Deferred (do before the money milestones):**
- **M1 + M2 — session revocation (D38).** Stateless JWT means a deactivated/just-reset customer keeps a
  valid token until expiry. Re-check `is_active` in `CustomerJwtStrategy.validate()` and add a
  `token_version`/`password_changed_at` claim. **Must land before 6.3 (checkout).**
- **M3 — global throttler + Redis store.** Currently opt-in per-route + in-memory (per-instance). Make it
  an `APP_GUARD` default and back it with Redis before scaling past one Render instance.
- **L3 — gate sensitive actions on `email_verified`** before order placement. **Deliberately NOT added in
  6.3, and still not addressed in 6.4** — payments landed without resolving this; it remains an open
  decision (block order *placement*, block only *payment*, or leave as-is) rather than a silent no-op.
  The customer principal already reloads `is_active`/`token_version` per request (D38 closed). Revisit at
  6.8 (admin order management) or 6.9 (hardening) at the latest.
- **L4 — CORS allowlist** if Vercel preview deploys need to call the API.
- **Info-4 — `npm audit`**: transitive advisories in `hono`/`multer`/`platform-express` (off the auth
  path; `npm audit fix` clears `hono`).

### Owner prerequisites for later milestones (vendor accounts — I can't create these)
- **Razorpay** test-mode account → `RAZORPAY_KEY_ID`/`_KEY_SECRET`/`_WEBHOOK_SECRET` (6.4).
- **Shiprocket** account, sandbox first (6.6); **Resend** account + verified sending domain on
  `sunfabb.com` (6.7). **GST** GSTIN + HSN codes + rates from your accountant (6.5).
- Local dev: a `CUSTOMER_JWT_SECRET` was added to your gitignored `backend/.env` so `start:dev` boots.

### ✅ 6.1 frontend — done (2026-06-25)
Built on `feature/phase6.1-frontend` (PR #19, stacked on #18): `(shop)/account` route group with its
own layout; register/login/forgot-password/reset-password/verify-email pages; account dashboard
(profile + address CRUD + order-history placeholder); deny-by-default `/account/**` middleware with a
separate `customer_token` cookie from `admin_token`; server-only zod-validated `lib/customer-api.ts`.
Browser-verified the full golden path (register → dashboard → address add/edit/delete → logout → deny
holds → login → verify-email via logged dev link → forgot/reset-password via logged dev link → login
with new password). Found and fixed a real bug along the way: the address-edit form spread the full
`Address` object (incl. `id`/`customer_id`/`created_at`/`updated_at`) into the update payload, which
the backend DTO's whitelist correctly rejected — fixed by picking only `AddressInput` fields when
seeding the edit form. Also found the dev backend was being served by a **stale `dist/src/main`
process** left over from before this code existed — a reminder to check `lsof -i :3000` /
`ps -p <pid> -o lstart,command` before trusting a "port already in use" error, rather than assuming the
running process matches the current code.

### ▶️ Where to go next (next session) — finish 6.4, then Razorpay/admin UI in parallel
6.2 (cart, PR #20) and 6.3 (checkout & orders, PR #21) are built. **6.4 (Razorpay payments) is now
code-complete** on `feature/phase6.4-payments` (stacked on `feature/phase6.3-checkout`) — see D40. Built:
`backend/src/payments/` (Razorpay SDK wrapper, dual HMAC verification, idempotent confirm/fail),
`backend/src/webhooks/` (`POST /webhooks/razorpay`, raw-body verified, `WebhookEvent`-deduped), `POST
/orders` now also returns Razorpay Checkout params, and the frontend `CheckoutClient` opens Razorpay's
hosted Checkout via `next/script` and calls `/payments/verify` on success. Lint/tsc/full test suite green
in both apps (backend 215 tests incl. 42 new payments/webhooks specs; frontend 165 tests). A same-session
`security-reviewer` + `code-reviewer` pass (mocked code, no live keys — not the real §7.3 gate) already
ran and caught a real money/stock bug — `payment.failed` was wrongly order-terminal, fixed; see D40.
**What's NOT done:** no Razorpay test-mode keys existed this session, so the SDK is mocked throughout —
live hosted-Checkout, live webhook delivery, and a **live** security-reviewer re-pass (the actual §7.3
gate) are all still pending.

**Prerequisite to finish 6.4 (owner — do this first):** create a **Razorpay test-mode account** (free,
instant — KYC only gates *live* keys) and add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET` to your gitignored `backend/.env` (and later to Render env + the CI e2e job's
env block). Then: run the golden path in a browser (place order → Razorpay hosted Checkout with a
Razorpay test card → webhook fires → order shows `PAID`), craft a signed test webhook to confirm the
tampered-signature/replay/failure-release paths for real (not just mocked) — **specifically test a
failed attempt followed by a successful retry on the same order**, since that's the exact bug already
found and fixed once — and get the live `security-reviewer` pass before opening the PR.

**Decision point surfaced by this session's review — worth your input, and it's an acceptance-criterion
deviation, not just a deferred nice-to-have:** the plan's own §12 acceptance #4 says "payment failure
releases reserved stock." The reviewer-caught fix above (correctly) makes that no longer literally true
for **two** cases, not just the already-known one:
1. Zero-webhook abandonment (modal closed, session died) — this was always plan §9's C9, assigned to 6.9.
2. **A `payment.failed` webhook DOES fire and the customer never retries** — this WAS 6.4's literal scope,
   and it's now also unreleased, because the only way to release safely is a time-based expiry (see D40):
   releasing right when `payment.failed` arrives would strand a *later* successful retry on the same
   order, reintroducing the exact oversell bug that was just fixed.
Net effect: any declined-or-abandoned checkout — not just modal-closes — now locks stock until 6.9. The
`security-reviewer` rated this HIGH for production (ordinary abandonment, not just abuse, on a small
catalog). **Decide:** ship 6.4 with acceptance #4's stock-release clause knowingly unmet and close it at
6.9 as originally planned (cheap now, real stock-visibility exposure until 6.9), or pull a minimal
expiry-release sweep forward into 6.4 before opening its PR (more work now, closes both cases
immediately). See D40 for the full reasoning on why event-driven release can't satisfy #4 safely.

**Unblocked alternative if you'd rather not touch Razorpay yet:** 6.8 admin order-management UI (order
list/detail + status change via the existing `transition()` guard) needs no vendor account and can be
built in parallel on its own branch off `feature/phase6.4-payments` or off `main` once the stack merges.

**Branch/worktree:** `feature/phase6.4-payments` already exists, stacked on `feature/phase6.3-checkout`
(stacked on `feature/phase6.2-cart`, PR #20). The stack is now 3 deep — landing #20 then #21 into `main`
before opening 6.4's PR keeps the review surface small and stops the stack growing further.

---

## Phased roadmap

- **Phase 0** — scaffold, DB, CI skeleton ✅ DONE
- **Phase 1** — backend core: full schema, all modules, public read endpoints (filter/sort/paginate),
  tests per module *(the main backend-learning phase)* ✅ DONE (PR #1 open)
- **Phase 2** — admin JWT auth + Cloudinary image upload ✅ DONE (PR #2 open)
- **Phase 3** — Next.js storefront (home, catalog, product detail), CORS, SEO ✅ DONE (PR #3 open)
- **Phase 4** — admin UI: backend admin CRUD ✅ DONE, frontend (login, CRUD forms, Chakra UI v3,
  design tokens, image upload) ✅ BUILT — ⚠️ golden-path **not yet verified against a live DB**
  ← *current focus, finish verification before moving to Phase 5*
- **Phase 5** — deploy, env config, domain/subdomain swap, e2e tests ✅ DONE (2026-06-21, core deploy);
  e2e tests not yet added — deferred
- **Phase 5.5** — restyle the Phase 3 storefront to match the Ethos & Hearth Stitch mockups ✅ DONE
  (2026-06-20)
- **Phase 6 — e-commerce** ⏳ IN PROGRESS — 6.0 Foundations ✅ (PR #17), 6.1 customer accounts/auth
  (backend PR #18 + frontend PR #19) ✅ done and browser-verified; 6.2 (cart, PR #20) and 6.3
  (checkout & orders, PR #21) built and stacked; 6.4 (Razorpay payments) code-complete on
  `feature/phase6.4-payments`, pending live test keys + security review before its PR — see "Where to
  go next" above. Full 6.0–6.10 milestone table + hardening backlog in the "Phase 6 — e-commerce
  (IN PROGRESS)" section above.

Per-item learning vs fast-track classification is in `docs/WORKFLOW.md` §5.

---

## Phase milestone log

Append-only. Update only at phase boundaries or feature merges — *not* every session.

- _(planning)_ — Architecture, stack, schema, validation/testing/CI approach, and learning path
  finalized. Decisions recorded in `docs/DECISIONS.md`.
- _(2026-05-24)_ **Phase 0 complete.** Monorepo scaffolded (NestJS v11, Next.js v16, Prisma 7).
  Neon PostgreSQL provisioned. First migration (`Category`, `Material`, `Color`) applied.
  GitHub Actions CI live. `docs/WORKFLOW.md` published. Git workflow rule (D16) recorded.
- _(2026-06-20)_ **Phases 1–3 backend/frontend complete, PRs #1–#3 open.** Categories/Materials/
  Colors/Products public read API with filter/sort/pagination (Phase 1); JWT admin auth +
  Cloudinary upload (Phase 2); Next.js storefront — home, catalog with filters, product detail
  (Phase 3). Fixed two CI gotchas along the way (see D17, D18 in `docs/DECISIONS.md`).
  **Phase 4 backend** (admin CRUD for categories/materials/colors/products/variants/images, all
  JWT-protected) complete and committed on `feature/phase4-admin-ui`. **Phase 4 frontend (admin UI)
  not yet built** — see blocker above.
- _(2026-06-20, same day)_ **Phase 4 frontend (admin UI) built.** Ethos & Hearth design tokens added
  as a Tailwind `@theme` layer (`frontend/app/globals.css`) plus a Chakra UI v3 custom theme
  (`frontend/lib/chakra-theme.ts`), scoped to `/admin` only so the storefront stays Chakra/Emotion-free
  (verified via bundle inspection). Built: httpOnly-cookie JWT login, deny-by-default middleware,
  server-only `lib/admin-api.ts` client, full CRUD for categories/materials/colors (hard delete +
  confirm dialog), products list (active+inactive) and detail page (edit fields, variants with
  ₹↔paise conversion, image upload via Cloudinary). Required one backend addition not anticipated in
  the original Phase 4 backend commit: `GET /products/admin` (D19), since the public list endpoint
  hard-filtered to active-only with no admin override. Also fixed a Prisma 7 / NestJS CJS interop
  startup bug (D20). `tsc`, `next build`, both lints, and the full backend test suite (72 tests) all
  pass. **Golden-path click-through against a live DB not yet run** — the verification session hit a
  sandbox network restriction (Postgres port 5432 blocked; HTTPS fine) — see active blocker above.
- _(2026-06-20, same day)_ **Phase 5.5 storefront restyle + Playwright visual QA pass.** Restyled
  `frontend/app/(storefront)/page.tsx`, `catalog/page.tsx`, `catalog/[slug]/page.tsx`,
  `CatalogFilters.tsx`, and `VariantSelector.tsx` to match the Ethos & Hearth Stitch mockups (hero
  banner with overlay card, Curated Collections, Featured Pieces, sidebar checkbox/swatch filters,
  size/material/color pills, "Complete the Look" related-products row) — all using the design tokens
  already established in `globals.css`, no new tokens needed. Verified with Playwright (Chrome) against
  a live dev server and seeded mock product/variant/image data (`backend/prisma/seed.ts` extended with
  6 products across all 3 categories). Found and fixed two real bugs along the way: (1) admin pages
  were inheriting the storefront header/footer because both lived under the same root layout — fixed by
  moving storefront pages into a `(storefront)` route group with their own layout, leaving the root
  layout as a bare shell so `/admin/**` no longer renders public nav/footer chrome (matches the Phase 4
  plan's original "no public chrome in admin" requirement, which had silently regressed); (2) Chakra
  `Field`'s `optionalText` rendered with no space (e.g. "DescriptionOptional") — fixed in
  `components/ui/field.tsx`. Also added `suppressHydrationWarning` to `<html>` for the standard
  next-themes SSR caveat. `tsc --noEmit` and `npm run lint` both clean after the route-group move.
  See D22 in `docs/DECISIONS.md` for the admin-chrome-leak root cause.
- _(2026-06-21)_ **Mobile-responsive QA pass on PR #5.** Screenshotted home/catalog/product-detail
  at 390×844 with Playwright and compared against the Stitch *mobile* mockups (project
  `3370511650101935244`) — the Phase 5.5 restyle had only been checked at desktop/tablet widths.
  Found and fixed two real gaps: (1) the storefront nav (`frontend/app/(storefront)/layout.tsx`) went
  from `hidden sm:flex` to fully invisible below `sm` with no replacement — added a `<details>`-based
  hamburger menu (no client JS) listing the same four links; (2) `CatalogFilters.tsx`'s sidebar
  rendered fully expanded above the product grid below `lg`, making the catalog page 43% taller than
  the mockup at the same width — refactored into a shared `filterContent` fragment rendered inside a
  collapsed-by-default `<details>` "Filter & Sort" disclosure on mobile and the original always-open
  sidebar at `lg+`. See D23 in `docs/DECISIONS.md` for full detail, including two non-responsive
  issues found but intentionally not fixed (a broken seed image, a mockup content section with no
  backing data field). `tsc --noEmit` and `npm run lint` both clean.
- _(2026-06-21)_ **Phase 5 deploy + domain swap complete.** Backend deployed to Render
  (`sunfabb-backend`, free tier), frontend to Vercel (`sunfabb-storefront`). Found and fixed a real
  bug: `backend/package.json`'s `start:prod` pointed at `dist/main` but `nest build` (with
  `sourceRoot: "src"`) outputs to `dist/src/main` — never caught locally since dev only used
  `start:dev`. Fixed in PR #7. Domain swap done: `sunfabb.com` apex moved from the old personal
  homepage project to the storefront; old homepage preserved at `home.sunfabb.com`. CORS verified
  working with the live origin. Also corrected a branch-state misunderstanding: PR #5 looked like it
  hadn't reached `main` under a naive history diff (due to an earlier rebase), but a content-level
  diff confirmed it actually had — see D24. PR #6 (Web Vitals + keep-alive) intentionally deferred,
  not merged. Live Web Vitals captured and compared to the Phase 5.5.1 localhost baseline in PR #7's
  description; `/catalog` LCP regressed 187ms→385ms live (real SSR→Render round trip, invisible on
  localhost) while still warm — true cold-start behavior remains unmeasured until keep-alive ships.
- _(2026-07-03)_ **Phase 6.4 Razorpay payments built, code-complete (no live keys yet).** On
  `feature/phase6.4-payments` (stacked on 6.3): backend `payments/` (Razorpay SDK wrapper, dual HMAC
  signature verification for both the client callback and the webhook, idempotent `confirmPaid`/
  `markFailed` via conditional `updateMany`) and `webhooks/` (`POST /webhooks/razorpay`, raw-body
  verified, `WebhookEvent`-deduped); `POST /orders` now also creates the matching Razorpay order and
  returns hosted-Checkout params; frontend `CheckoutClient` opens Razorpay's hosted Checkout via
  `next/script` and calls `/payments/verify` on success (PCI SAQ-A — card data never touches our
  server). See D40 for the full design, including fixes made after review caught them before they
  shipped: (1) payment-detail recording (method, payment id) is a separate idempotent step from the
  PENDING_PAYMENT→PAID status flip, so whichever of the callback/webhook wins the race, the payment
  method still gets recorded even though the callback alone never carries it; (2) a `WebhookEvent` row
  is marked `processed_at` only *after* processing succeeds (not at insert time), so a crash mid-process
  is retried by Razorpay instead of being permanently skipped. A same-session `security-reviewer` +
  `code-reviewer` pass (mocked code, no live keys) then independently found and both flagged as HIGH: (3)
  **the real fix** — `payment.failed` was wrongly treated as order-terminal (flip to `PAYMENT_FAILED` +
  release stock); Razorpay actually lets a customer retry a failed attempt on the *same* order, so a
  fail-then-succeed sequence stranded captured money on a `PAYMENT_FAILED` order with its stock already
  given away. Fixed: `markFailed` now only records the failed attempt on the Payment row, never touches
  order status or stock. (4) `createForOrder`'s DB-persist step (after a successful Razorpay SDK call)
  had no failure compensation — fixed with the same stock-release path the SDK-failure branch already
  had. Both reviewers also flagged the **already-known, deliberately deferred** C9 gap (abandoned
  checkouts that emit zero webhooks never release their reserved stock) — real, but out of 6.4's scope
  per the plan (assigned to 6.9); not fixed here, flagged again below. Backend: 215 tests green (42 in
  payments/webhooks), lint/tsc clean. Frontend: 165 tests green, lint/tsc/`next build` clean. **Not done
  this session:** no Razorpay test-mode account existed, so the SDK is mocked throughout — live hosted-
  Checkout, live webhook delivery, and a live `security-reviewer` re-pass (§7.3's actual gate) are still
  pending; the PR has not been opened. See "Where to go next" above for the exact resume steps.
