# Contact Us - Feature Plan

Plan for adding contact touchpoints to the Sunfabb storefront.
Drafted 2026-07-16 after codebase exploration and owner decisions.
Execute in a fresh session, backend first.

## 1. Goals and scope

In scope:

- Footer contact info: phone, WhatsApp, email, Google Maps link to the factory, Instagram, link to `/contact`.
- A separate public `/contact` page (not a homepage section) with all channels plus an enquiry form.
- WhatsApp click-to-chat: opens the business chat with a pre-filled default message.
- Contact form protected by Cloudflare Turnstile, verified server-side.
- Submissions stored in Postgres (`ContactMessage` model) and owner notified via the existing `EmailService`.
- SEO: page metadata and LocalBusiness JSON-LD.

Out of scope (deferred):

- Admin enquiries UI. Messages are read via Prisma Studio for now; the `status` enum future-proofs the admin view.
- Real email sending. `EmailService` is a logging stub until Resend is wired in Phase 6.7.
- Any e-commerce coupling.

Owner decisions already made:

- Storage: DB + email notification (not email-only).
- Captcha: Cloudflare Turnstile (free, invisible, privacy-friendly).
- Separate contact page rather than a homepage section.

## 2. Backend

### 2.1 Prisma model

Add to `backend/prisma/schema.prisma`, then `npx prisma migrate dev --name add_contact_message`:

```prisma
enum ContactMessageStatus {
  NEW
  READ
  RESPONDED
}

model ContactMessage {
  id         String               @id @default(uuid())
  name       String
  phone      String
  email      String?
  message    String
  status     ContactMessageStatus @default(NEW)
  created_at DateTime             @default(now())
  updated_at DateTime             @updatedAt
  deleted_at DateTime?

  @@index([status, created_at])
}
```

Design notes:

- Phone is required and email optional: the audience is India, where phone/WhatsApp is the primary reply channel.
- `status` enum instead of a boolean so the deferred admin view becomes a pure read feature later.
- `deleted_at` for soft delete (hard rule 4). No relations to Customer or Order.
- No IP or user-agent columns: throttling handles abuse and storing IPs raises retention questions.

### 2.2 Turnstile verification

Create `backend/src/contact/turnstile.service.ts`:

- A service, not a guard: guards run before the ValidationPipe, so a guard would need the body before DTO validation. A service call at the top of `ContactService.create()` keeps the ordering validate -> captcha -> persist, and is trivially mockable.
- `verify(token, remoteIp?)` POSTs form-encoded `secret`, `response`, optional `remoteip` to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with global `fetch` and returns `data.success === true`.
- Network errors or non-OK responses fail closed (return false), logged distinctly so outages are distinguishable from bots.

Create `backend/src/contact/turnstile-config.ts` with a lazy fail-fast `getTurnstileSecretKey()` that throws if `TURNSTILE_SECRET_KEY` is unset, mirroring `backend/src/payments/razorpay-config.ts` (decision D31).
Lazy so the app still boots before keys are provisioned.

Dev mode uses Cloudflare's official test keys with no code branches:

- Backend: `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (always passes).
- Frontend: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (always passes, visible widget).
- The `2x...` variants force failure for manual failure-path testing.

### 2.3 Contact module

Create `backend/src/contact/` following the controller/service/DTO pattern (structural template: `backend/src/colors/`; richer reference: `backend/src/customer-auth/`), and register `ContactModule` in `backend/src/app.module.ts` (imports `EmailModule`; providers `ContactService`, `TurnstileService`).

`dto/create-contact.dto.ts`:

```ts
export class CreateContactDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsString() @Matches(/^[+\d][\d\s-]{7,17}$/)
  phone: string;

  @IsOptional() @IsEmail() @MaxLength(254)
  email?: string;

  @IsString() @IsNotEmpty() @MinLength(10) @MaxLength(2000)
  message: string;

  @IsString() @IsNotEmpty() @MaxLength(2048)
  turnstile_token: string;

  @IsOptional() @IsString() @MaxLength(0)
  company?: string; // honeypot: any non-empty value fails validation
}
```

The honeypot field must be declared in the DTO because the global pipe uses `forbidNonWhitelisted`; `@MaxLength(0)` makes any bot-filled value a 400 with no service logic.

`contact.controller.ts`:

```ts
@Controller('contact')
export class ContactController {
  @Post()
  @HttpCode(201)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  create(@Body() dto: CreateContactDto, @Ip() ip: string) { ... }
}
```

3/min matches the strictest customer-auth endpoints; a human writes at most one enquiry per minute.
No auth guard: this is a public endpoint.

`contact.service.ts` `create(dto, remoteIp?)`:

1. `turnstileService.verify(dto.turnstile_token, remoteIp)`; on false throw `ForbiddenException('captcha_failed')`.
2. `prisma.contactMessage.create({ data: { name, phone, email, message } })`.
3. `emailService.sendContactNotification(...)` wrapped in try/catch-log; a notification failure must never fail the stored submission.
4. Return `{ id, created_at }` only (do not echo message content).

API shape (snake_case, REST):

```
POST /contact
{ "name": "Anand", "phone": "+91 98xxxxxx", "email": "a@b.com",
  "message": "Bulk towels enquiry...", "turnstile_token": "0.abc..." }

201 -> { "id": "<uuid>", "created_at": "2026-07-16T..." }
400 -> validation errors (Nest default shape)
403 -> captcha_failed
429 -> throttled
```

### 2.4 Email notification

Add `sendContactNotification(submission: { id; name; phone; email?; message })` to `backend/src/email/email.service.ts`:

- Recipient from `CONTACT_NOTIFY_EMAIL`; if unset, log and skip (notification is best-effort, the DB is the source of truth).
- Stub behavior consistent with siblings: log name/phone plus a ~200-char message preview in dev; never throws.
- Signature designed for Resend (subject `New enquiry from <name> - Sunfabb`, `reply_to` when email present) so Phase 6.7 only swaps the method body.

## 3. Frontend

### 3.1 Site constants (new)

Create `frontend/lib/site-config.ts` as the single source of truth for brand contact data (no such file exists today; "Sunfabb" is hard-coded in several places):

```ts
export const SITE = {
  name: "Sunfabb",
  phone: { display: "+91 XXXXX XXXXX", e164: "+91XXXXXXXXXX" }, // PLACEHOLDER
  whatsapp: {
    number: "91XXXXXXXXXX", // digits only, country code, no '+' (wa.me format)
    defaultMessage: "Hi Sunfabb, I'd like to know more about your products.",
  },
  email: "hello@sunfabb.com",            // PLACEHOLDER
  address: { lines: ["..."], mapsUrl: "https://maps.app.goo.gl/..." }, // PLACEHOLDER
  instagramUrl: "https://instagram.com/sunfabb", // PLACEHOLDER
  hours: "Mon-Sat, 9:30 AM - 6:30 PM IST",
} as const;

export function whatsappLink(message = SITE.whatsapp.defaultMessage): string {
  return `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
export const telLink = `tel:${SITE.phone.e164}`;
export const mailtoLink = `mailto:${SITE.email}`;
```

Plain typed const, no zod: these are build-time literals, not boundary data.

### 3.2 Footer refactor and nav

- Extract the inline footer from `frontend/app/(storefront)/layout.tsx` into a new server component `frontend/components/storefront/footer.tsx`.
- Extend it with a contact column (tel link, WhatsApp deep link, mailto, Google Maps link with `target="_blank" rel="noopener noreferrer"`, business hours), a social row (`FaInstagram`, `FaWhatsapp` from `react-icons`, with aria-labels), and a link to `/contact`.
- Add a "Contact" link to the header nav in the same layout (desktop nav and the mobile `<details>` menu).
- Keep the existing Tailwind v4 token styling (`bg-surface`, `text-body-sm`, etc. from `app/globals.css`).

### 3.3 Turnstile widget (no npm dependency)

Create `frontend/components/storefront/turnstile-widget.tsx` (`"use client"`):

- Load `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` via `next/script` with an onload guard so double-mounts do not double-render.
- On ready, `window.turnstile.render(ref, { sitekey, callback, "expired-callback", "error-callback" })`; store the widget id, `turnstile.remove()` on unmount.
- Expose `reset()` to the form: Turnstile tokens are single-use, so reset after a failed submit.
- Props: `onToken(token: string | null)`.
- Type `window.turnstile` with an interface declaration, not an `as` cast (rule 11).
- If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, render a visible dev error box instead of silently rendering nothing.

### 3.4 Contact page, form, and route handler

`frontend/app/(storefront)/contact/page.tsx` (server component, public; middleware only gates /admin and /account):

- Export `metadata` (title "Contact Us | Sunfabb", description mentioning the product lines).
- Two-column layout, stacking on mobile: left column channels (phone, WhatsApp CTA using `whatsappLink()`, email, address + Maps link, hours), right column the form.
- Inline LocalBusiness JSON-LD `<script type="application/ld+json">` built from `SITE`: `@type` `HomeGoodsStore`, name, telephone, PostalAddress, openingHours, `sameAs: [instagramUrl]`.

`frontend/components/storefront/contact-form.tsx` (`"use client"`):

- Plain `<form>` + `useState`, inputs styled like `app/(shop)/account/register/page.tsx`.
- Fields: name, phone, optional email (labeled as optional), message textarea (maxLength 2000 with a character hint), hidden honeypot `company` input (`autoComplete="off"`, `tabIndex={-1}`, visually hidden via CSS rather than `display:none` since some bots skip `display:none`), and the Turnstile widget.
- Submit disabled until a token is present.
- States: submitting, success panel replacing the form, error banner plus Turnstile `reset()`.

`frontend/app/api/contact/route.ts` (mirrors `app/api/customer/register/route.ts`):

- Validate the incoming body with a local zod schema (boundary rule 11).
- Forward to `${process.env.NEXT_PUBLIC_API_URL}/contact`; pass through status and body on failure.
- Validate the 201 response with a zod schema (`{ id: uuid, created_at: string }`) before returning.

## 4. Anti-spam layering

Four independent layers: Turnstile (server-verified), honeypot field, 3/min per-IP throttle, and message length caps.

## 5. Environment variables

| Var | Side | Files | Dev value | Notes |
|---|---|---|---|---|
| `TURNSTILE_SECRET_KEY` | backend | `backend/.env`, `backend/.env.example` | `1x0000000000000000000000000000000AA` | lazy fail-fast via `turnstile-config.ts` |
| `CONTACT_NOTIFY_EMAIL` | backend | `backend/.env`, `backend/.env.example` | owner email | optional; skip-with-log if unset |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | frontend | `frontend/.env.local`, `frontend/.env.example` | `1x00000000000000000000AA` | rendered client-side |

Fix in the same PR: `frontend/.env.example` documents `NEXT_PUBLIC_BACKEND_URL`, but the code reads `NEXT_PUBLIC_API_URL`.

## 6. Test plan

Backend unit (co-located `*.spec.ts`, follow `colors` and `customer-auth` patterns):

- `turnstile.service.spec.ts`: mocked fetch; success true, success false, fetch throws / non-OK all fail closed; asserts secret and token in the form body.
- `contact.service.spec.ts`: happy path persists and notifies; captcha fail throws ForbiddenException with no prisma create; an email throw does not fail creation; return shape excludes message content.
- `contact.controller.spec.ts`: `overrideGuard(ThrottlerGuard)`, mocked service, delegates dto + ip.

Backend e2e (`backend/test/contact.e2e-spec.ts`):

- 201 happy path with the always-pass test secret.
- 400 on missing name/phone, short message, unknown extra field, and a filled honeypot.
- 403 when captcha verification fails.
- 429 after 3 rapid posts.

Frontend:

- `frontend/lib/site-config.test.ts`: `whatsappLink()` encoding (spaces, `?`, emoji), wa.me number format, custom message override.

Manual verification:

1. Dev with test keys: submit the form, confirm the row in Prisma Studio and the stub notification log line in the backend console.
2. Swap the frontend key to `2x00000000000000000000AB` and confirm the blocked/403 path renders a sane error.
3. On a phone, confirm the WhatsApp link opens the chat pre-filled and `tel:` initiates a dial.
4. Four rapid submits: the fourth gets 429 with a readable error banner.
5. Validate the JSON-LD with Google's Rich Results Test.
6. Keyboard/a11y pass on `/contact` (labels, focus order including the Turnstile iframe).

## 7. Risks and open items

- All contact values in `site-config.ts` ship as marked placeholders; the owner must supply real phone, WhatsApp number, address, Maps URL, Instagram handle, hours, and notify email before launch. JSON-LD with fake data is worse than none.
- Email notification is a log line until Resend lands in Phase 6.7; until then the owner reads enquiries in Prisma Studio.
- Turnstile requires JavaScript; no-JS users cannot submit the form but still have tel/WhatsApp/mailto.
- A Turnstile outage fails closed (403); acceptable for a contact form since alternative channels exist.
- Throttling is per-IP via the Nest default tracker; behind the Next route-handler proxy the backend may see the proxy's IP in production. Verify `X-Forwarded-For` / trust-proxy handling before launch.
- wa.me requires digits-only numbers with country code and no `+`; the config comment encodes this to prevent format errors.

## 8. Implementation order

1. Backend: Prisma model + migration -> Turnstile service/config -> contact module -> email method.
2. Frontend: site-config -> footer extraction + nav -> Turnstile widget -> contact page, form, route handler.
3. Tests (unit + e2e), env example updates, then manual verification.
