# Pre-Phase 5 Manual Verification

Checklist of scenarios that need a human (not CI, not an automated walkthrough) before treating
PRs #1–#4 as fully done and starting Phase 5. Everything below is either visual/UX judgment or
depends on credentials/knowledge only you have — see `HANDOFF.md` and `docs/DECISIONS.md` (D19–D21)
for the automated verification already done.

Check items off as you go. If something fails, note it here or open an issue — don't silently fix
and forget, since this file is the record of what's actually been eyeballed.

---

## 0. Credentials sanity check

- [ ] You know the real admin login password (the plaintext behind `ADMIN_PASSWORD_HASH` in
      `backend/.env`). If not, generate a new bcrypt hash now and update `.env` — cheap to fix before
      Phase 5, painful after deploy.
- [ ] Real Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
      `CLOUDINARY_API_SECRET`) are filled into `backend/.env`. Currently blank — image upload fails
      with `Error: cloud_name is disabled` until these are set.

---

## 1. PR #1 — Phase 1 backend (categories/materials/colors/products read API)

Low risk — 72 automated tests pass and live-DB reads were confirmed this session. Spot-check only:

- [ ] `GET /categories`, `GET /materials`, `GET /colors` return real data, not just `[]`.
- [ ] `GET /products?category=<slug>&sortBy=price_asc` — filter/sort/pagination params behave as
      expected with more than a couple of real products in the DB.
- [ ] `GET /products/:slug` for a product with multiple variants/images returns the full nested shape.

## 2. PR #2 — Phase 2 (JWT auth + Cloudinary upload)

- [ ] Log in with the **real** admin password (not a throwaway test password) and get a 200 + JWT.
- [ ] Wrong password → 401 (already verified, just confirm again with real credentials in place).
- [ ] `POST /admin/images/upload` with real Cloudinary credentials — upload a real image, confirm a
      Cloudinary URL comes back and the image is visible in your Cloudinary dashboard.
- [ ] JWT expiry (`JWT_EXPIRES_IN=24h`) — confirm an expired token gets a 401, not a 500 or a hang.

## 3. PR #3 — Phase 3 storefront (home, catalog, product detail)

No record exists of these pages ever being loaded in a real browser — `next build`/lint/tsc passing
is not the same as the layout looking right or the data rendering correctly.

- [ ] `/` — homepage loads, hero/featured sections render with real category and product data.
- [ ] `/catalog` — full product grid loads; category filter, material filter, color filter, price
      sort all visibily change the results.
- [ ] `/catalog/[slug]` — product detail page: variant selector (size/material/color) updates price
      and stock correctly; images render; "out of stock" state shows correctly for a variant with
      `stock_quantity: 0`.
- [ ] Mobile viewport check (DevTools responsive mode or an actual phone) for all three pages above.
- [ ] No console errors in the browser DevTools console on any of the three pages.

## 4. PR #4 — Phase 4 admin UI (Chakra UI v3, design tokens)

Data layer is confirmed via direct API calls (see `HANDOFF.md`), but the actual rendered UI has never
been clicked through in a browser.

### Login & shell
- [ ] `/admin/login` renders with the Ethos & Hearth palette (terracotta/charcoal), not Chakra's
      default blue/gray theme.
- [ ] Wrong password shows a visible error message on the form (not just a console 401).
- [ ] Successful login redirects to `/admin` and the JWT cookie is set (check DevTools → Application →
      Cookies for `admin_token`, confirm `httpOnly` is checked).
- [ ] Visiting `/admin` (or any `/admin/**` route) without logging in redirects to `/admin/login`
      (deny-by-default middleware).
- [ ] Logout clears the cookie and redirects to login.

### Categories / Materials / Colors (lookup tables)
- [ ] Create dialog opens, validates required fields (try submitting empty — should show inline
      errors, not a raw 400 in the console).
- [ ] Create succeeds, new row appears in the table without a manual refresh.
- [ ] Edit dialog pre-fills existing values, save updates the row in place.
- [ ] Delete shows a confirm dialog before the hard-delete actually fires (per the no-soft-delete-
      safety-net risk noted in the Phase 4 plan).

### Products
- [ ] Product list shows both active and inactive products with a visible status indicator
      (confirms `GET /products/admin` from D19 is wired to the UI correctly).
- [ ] Active/inactive filter control actually filters the list.
- [ ] Product detail/edit page: editing name/description/care instructions saves correctly.
- [ ] Variants sub-section: add a variant, confirm the material/color `Select` dropdowns are
      populated from real lookup-table data (not empty or stale).
- [ ] Price entry: type a ₹ amount (e.g. `1250.50`), confirm it's stored correctly as paise
      (125050) — check the raw API response or DB row, not just what's displayed back.
- [ ] Delete the last remaining variant on a product — confirm the UI handles this gracefully
      (no crash, product just shows zero variants).

### Images
- [ ] Upload an image via the `FileUpload` control (needs real Cloudinary credentials from §0).
- [ ] Uploaded image appears in the thumbnail grid.
- [ ] "Set as primary" control works and reflects in the public storefront's product detail page.
- [ ] Delete an image, confirm it's removed from the grid (and ideally also from Cloudinary, if the
      delete endpoint is wired to do that — check `backend/src/images/`).
- [ ] Reorder control (if implemented) changes the display order.

### Cross-cutting
- [ ] No Chakra/Emotion styling bleeds into the storefront (`/`, `/catalog`, `/catalog/[slug]`) —
      open each in a fresh tab and confirm they still look like the original Tailwind styling, not
      Chakra's defaults.
- [ ] No browser console errors anywhere in `/admin/**`.

---

## After this checklist

Once everything above is checked (or any failures are filed as follow-up issues), Phase 4 can be
considered fully closed and Phase 5 (deploy, env config, domain swap, e2e tests) can start per
`HANDOFF.md`'s roadmap.
