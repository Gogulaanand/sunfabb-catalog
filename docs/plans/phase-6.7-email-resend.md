# Phase 6.7 - Email (Resend)

**Status:** ready to build once owner inputs arrive.
**Branch:** `feature/6.7-resend-email`.
**Recommended order:** build this first among 6.5/6.6/6.7 (smallest, instantly unblockable, and 6.5/6.6 add email call sites that this phase prepares).
This document is self-contained: an executor should be able to deliver the phase end-to-end from this file plus the cited source files.

---

## 1. Objective

Replace the delivery stub in `backend/src/email/email.service.ts` with real transactional email via Resend, from a verified `sunfabb.com` sending domain, without changing any caller.
An email failure must never fail a caller, especially the payment webhook (money path).

## 2. Owner inputs required (collect before starting)

- [ ] Resend account created.
- [ ] `sunfabb.com` added as a domain in Resend and DNS records (SPF + DKIM) added in Vercel DNS; domain shows **verified** in Resend.
- [ ] `RESEND_API_KEY` (from Resend dashboard).
- [ ] Chosen `EMAIL_FROM` address on the verified domain, e.g. `Sunfabb <orders@sunfabb.com>`.
- [ ] `CONTACT_NOTIFY_EMAIL` (where contact-form notifications go; already optional in the stub).

## 3. Current state (grounding - do not re-derive)

- `backend/src/email/email.service.ts` is a **stub**: real public API, logged delivery only.
  Public methods (keep every signature): `sendVerificationEmail(to, token)`, `sendPasswordResetEmail(to, token)`, `sendOrderConfirmation(to, orderNumber)`, `sendContactNotification(submission)`.
- The stub already encodes two contracts that MUST survive the rewrite:
  1. **Never throw to callers.** `sendOrderConfirmation` is called from the payment webhook path; a send failure must resolve (and be logged), never reject.
  2. **Never log a raw token link in production** (credential leak; see `logLink()` in the stub).
- Callers: `backend/src/customer-auth/customer-auth.service.ts` (verify + reset), `backend/src/payments/payments.service.ts` / `backend/src/webhooks/webhooks.service.ts` (order confirmation), `backend/src/contact/contact.service.ts` (contact notification).
- Fail-fast config pattern to copy: `backend/src/auth/jwt-secret.ts` (`getJwtSecret()`, D31/rule 12).
- Tests are Jest unit tests with mocks (`backend/src/email/email.service.spec.ts` exists); DB-backed e2e runs via Playwright against a live server (D28), but this phase needs no DB coverage.

## 4. Locked design decisions

- **Transport abstraction, no behavior change for callers.**
  Introduce a `MailTransport` interface (`send(message): Promise<void>` where `message = {to, subject, html, text, attachments?}`) with two implementations:
  - `ResendTransport` - wraps the official `resend` npm SDK.
  - `LogTransport` - the current stub behavior (logs, warns in production).
- **Transport selection at module init:**
  - `NODE_ENV === 'production'` and `RESEND_API_KEY` or `EMAIL_FROM` missing → **throw at boot** (rule 12, mirror `getJwtSecret()` style in a new `backend/src/email/email-config.ts`).
  - Non-production without `RESEND_API_KEY` → `LogTransport` (local dev keeps working with zero setup).
  - Key present (any env) → `ResendTransport`.
- **No queue, no retry infrastructure.** A failed send is caught inside `EmailService`, logged with recipient + kind + error, and swallowed. A retry/outbox is over-engineering at pilot scale - see `PHASE6-BACKLOG.md`.
- **Templates are plain TypeScript functions**, not react-email/MJML (4 templates do not justify a templating stack).
- **Forward hooks for 6.5/6.6 are built now** so those phases only add call sites (see §6).

## 5. Backend tasks

All inside `backend/src/email/` unless noted. Follow the existing module conventions.

1. `email-config.ts` - `getEmailConfig()` resolving `{resendApiKey?, emailFrom?}` with the production fail-fast rule above.
2. `mail-transport.ts` - the `MailTransport` interface + `MailMessage` type (`attachments?: {filename: string, content: Buffer}[]` included now for the 6.5 invoice attachment).
3. `resend.transport.ts` - `ResendTransport` using the `resend` SDK (`npm i resend` in `backend/`). Map `MailMessage` to Resend's send payload. Surface SDK errors by throwing; the catch lives in `EmailService`, not here.
4. `log.transport.ts` - `LogTransport` preserving today's logging, including the production "stub invoked" warning and the no-token-links-in-production rule.
5. `templates/` - one file per template, each exporting a function returning `{subject, html, text}`:
   - `verification.ts` (link built from `APP_BASE_URL` + `/account/verify-email?token=`)
   - `password-reset.ts`
   - `order-confirmation.ts` - takes `{orderNumber, orderUrl, lines: {name, variantLabel, quantity, lineTotalPaise}[], totalPaise}`; format paise as INR at the template boundary (`₹1,250.00` from `125000`; reuse an existing paise formatter if one exists in backend, else a tiny local helper).
   - `contact-notification.ts`
   - `shipped.ts` and `delivered.ts` - **built now, called by 6.6** (see §6).
   - `layout.ts` - shared wrapper (brand name, simple header/footer, plain table-based HTML that renders in Gmail).
6. Rewrite `email.service.ts`:
   - Inject the selected transport (provider factory in `email.module.ts`).
   - Every public method: build template → `try { await transport.send(...) } catch (e) { this.logger.error(...) }` → resolve.
   - Keep all existing method signatures.
   - `sendOrderConfirmation` gains an optional last param `invoicePdf?: Buffer` (unused until 6.5; attaches as `invoice-<orderNumber>.pdf` when present).
   - Add `sendOrderShipped(to, orderNumber, courierName, trackingUrl)` and `sendOrderDelivered(to, orderNumber)` - implemented and tested now, first call site arrives in 6.6.
   - `sendOrderConfirmation` currently receives only `(to, orderNumber)`; extend its call sites in `payments.service.ts`/`webhooks.service.ts` to pass the order lines needed by the richer template (read from the already-loaded order + items; do not add extra queries if avoidable).

## 6. Cross-phase interactions

- **6.5 (GST):** will pass `invoicePdf` to `sendOrderConfirmation`. This phase only defines the parameter and attachment plumbing.
- **6.6 (Shiprocket):** will call `sendOrderShipped` / `sendOrderDelivered` from the ship endpoint and the tracking webhook. This phase ships the methods and templates.
- If either phase lands **before** this one, their email calls hit the stub/log transport and nothing breaks; the contracts are already stub-safe.

## 7. Env & config

| Var | Required | Fail-fast | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | prod yes | yes (prod only) | dev falls back to `LogTransport` |
| `EMAIL_FROM` | prod yes | yes (prod only) | must be on the verified domain |
| `CONTACT_NOTIFY_EMAIL` | no | no | existing behavior: skip + warn when unset |
| `APP_BASE_URL` | already required | existing | used for links in templates |

Update `backend/.env.example`, the Render dashboard, and the CI env block in `.github/workflows/ci.yml` for any job that boots `start:prod` (the e2e job runs with `NODE_ENV=production`-like boot; give CI a dummy non-prod setup or set the vars - verify how the job sets `NODE_ENV` before deciding).

## 8. Security notes

- Never log raw verification/reset tokens or full links in production (existing rule; keep the test for it).
- `RESEND_API_KEY` is backend-only; never in the frontend bundle or repo.
- Emails must not echo unsanitized user input into HTML: escape `name`/`message` in `contact-notification.ts` (the one template carrying free text).

## 9. Test plan (Jest unit, mocked Resend SDK)

- Transport selection: prod without key → boot throws; dev without key → `LogTransport`; key present → `ResendTransport`.
- `ResendTransport.send` called with correct from/to/subject/html/text; attachment mapped when provided.
- SDK error → method **resolves**, error logged (assert logger call), nothing thrown - one test per public method is overkill; cover `sendOrderConfirmation` (money path) + one auth email.
- Templates: subject and key content assertions (order number, INR formatting `₹1,250.00`, tracking URL in shipped template); contact template escapes `<script>` in message.
- Production log-transport path never logs a token (existing stub test - keep it green).
- Regression: full backend suite `npm run test`, plus `npm run lint && npx tsc --noEmit`.

## 10. Acceptance criteria

1. With a real key in dev: register a customer → verification email arrives from `EMAIL_FROM`; reset flow email arrives.
2. Test-mode purchase → order confirmation email arrives with correct lines and INR totals.
3. Kill the API key (or force an SDK error in a test) → payment confirmation still succeeds; failure is logged.
4. Production boot without `RESEND_API_KEY`/`EMAIL_FROM` fails fast with a clear message.
5. Lint, type-check, unit tests green in both apps; no caller file changed except the order-confirmation call sites.

## 11. Out of scope (→ PHASE6-BACKLOG.md)

Retry queue/outbox, email open/delivery tracking, marketing/abandoned-cart emails, React-based templating.

## 12. Verification commands

```bash
cd backend && npm run lint && npx tsc --noEmit && npm run test
cd frontend && npm run lint && npx tsc --noEmit && npm run test   # should be untouched; run as regression
```

Manual: trigger each flow locally with a real `RESEND_API_KEY` against your own inbox; verify SPF/DKIM pass (check "show original" in Gmail).
