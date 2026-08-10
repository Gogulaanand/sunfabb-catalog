# Phase 6.7 email acceptance evidence

**Checked:** 2026-08-10 (Asia/Kolkata)
**Scope:** Owner-unblock sequence item 1. This record captures only the checks
performed from the clean `origin/main` worktree and public/authenticated read-only
surfaces. No secret values, email bodies, private recipient addresses, tokens, or
contact submissions are recorded.

## Evidence classification

| Boundary | Result | Evidence strength |
|---|---|---|
| PR #79 code merged to current main | Confirmed | Local ancestry and GitHub PR state |
| Backend service reachable | Confirmed | Live `GET /health` and `GET /categories` |
| Exact PR #79 backend commit deployed | Unverified | Public service exposes no commit/version; Render dashboard required sign-in |
| Current Render mail configuration | Unverified | Render dashboard was not authenticated; no env values were read |
| Current Resend `sunfabb.com` domain state | Not confirmed | Authenticated Resend domain listing did not contain the catalogue domain |
| SPF/DKIM DNS records | DNS records observed | Public DNS only; no received-message authentication proof |
| Verification/reset/order/contact production trigger | Not attempted | No exact owner-controlled disposable target/protocol was available |
| Provider send, inbox receipt, SPF/DKIM message authentication | Unverified | No catalogue email was triggered or observed |
| Shipped/delivered production flows | Blocked | Phase 6.6 call sites are not present |

## Checks performed

### Code and deployment

- The worktree was at `origin/main`, `8bf36c6`; PR #79's merged code commit
  `a234f5b` is an ancestor of that commit.
- GitHub reports PR #79 merged, with its combined status successful and five
  successful checks, including Backend, Playwright E2E, and the production
  monitor. The Vercel status attached to the PR head says deployment completed;
  that is not Render backend deployment evidence.
- `GET https://sunfabb-backend.onrender.com/health` returned HTTP 200 with
  `{ "status": "ok" }` and Render-origin headers. `GET /categories` also
  returned HTTP 200. These establish a live, healthy backend target, not which
  source commit it runs.
- `https://dashboard.render.com/` opened to the Render sign-in page. No
  deployment history or environment configuration was inspected.

### Resend and DNS

- The authenticated Resend read-only domain listing returned one verified,
  sending-enabled domain, `finmanager.sunfabb.com`; it did not return
  `sunfabb.com`. This may indicate the connected account is not the catalogue
  account or that the catalogue domain is no longer present. It is not safe to
  treat the historical launch-status claim as current configuration.
- The same read-only account listed a catalogue-named API key, but its value was
  never requested or displayed. Key presence alone does not prove Render uses it.
- The recent Resend email listing contained only FinManager messages and no
  catalogue verification, reset, order, or contact messages. This is not inbox
  receipt evidence for the catalogue.
- Public DNS lookups observed:
  - `send.sunfabb.com` TXT: `v=spf1 include:amazonses.com ~all`.
  - `send.sunfabb.com` MX: the regional Amazon SES feedback endpoint.
  - `resend._domainkey.sunfabb.com` TXT: a DKIM public-key record exists; the
    key material is intentionally omitted here.
  - `_dmarc.sunfabb.com` TXT: `v=DMARC1; p=none;`.
  - The apex `sunfabb.com` returned no TXT record in this lookup.
- DNS presence is not equivalent to Resend dashboard verification or a passing
  SPF/DKIM result on an actual received message.

### Available call sites and safe-probe boundary

- Current source has verification and password-reset callers in customer auth,
  paid-order confirmation in the payment confirmation path, and contact
  notification plus acknowledgement in the contact service.
- `EmailService.sendOrderShipped` and `sendOrderDelivered` exist, but there are
  no Phase 6.6 shipping call sites in `backend/src`; only definitions and unit
  tests were found. Shipped/delivered acceptance therefore remains blocked.
- No production verification email, password-reset email, paid-order
  confirmation, contact acknowledgement, or contact notification was sent.
  The exact owner-controlled recipient and disposable protocol were not
  established, and a contact request would also create a production contact
  record and require a valid Turnstile proof.

## Next owner inputs

1. In Render, confirm the production backend deployment commit is at or after
   PR #79's merged code and confirm presence/state of `RESEND_API_KEY`,
   `EMAIL_FROM`, `APP_BASE_URL`, and (if required) `CONTACT_NOTIFY_EMAIL`; do
   not share values.
2. In the correct Resend account, confirm `sunfabb.com` is verified for sending
   and state the exact approved sender identity without pasting credentials.
3. Provide an owner-controlled disposable inbox/alias and an approved
   test-account protocol for verification, reset, paid-order, and contact
   acknowledgement/notification checks. No real purchase or private contact
   data should be used.
4. Complete Phase 6.6 before requesting shipped/delivered acceptance; those
   production call sites do not yet exist.
