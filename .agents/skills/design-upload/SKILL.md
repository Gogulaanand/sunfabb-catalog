---
name: design-upload
description: Upload a QA-signed-off design from the scenes folder to Cloudinary and register it as a full product (variants + images) in the backend. Invoked after owner visual QA sign-off on a design.
argument-hint: "<design_id>"
level: 2
---

<Purpose>
After a design's scenes have been generated and QA-signed-off locally, this skill:
1. Uploads all scene images to Cloudinary under `sunfabb/products/{design_id}/{color}/{NN}-{scene}`
2. Creates the Product record in the backend
3. Creates one ProductVariant per color
4. Attaches all uploaded images to the correct variant with proper roles, sort order, and primary flag
5. Updates CATALOG_PROGRESS.md to reflect the uploaded status

The design ID matches the scene folder name (e.g. `8569` for `tools/image-pipeline/work/scenes/8569/`).
</Purpose>

<Use_When>
- User types `$design-upload <design_id>` after visually QA-ing a design's scenes
- User says "upload design 8569", "publish design XXXX", or similar
</Use_When>

<Do_Not_Use_When>
- Scenes are not yet generated or not yet owner-QA-signed-off
- The design is already listed as "uploaded" in CATALOG_PROGRESS.md
- The user only wants to regenerate or review images, not publish them
</Do_Not_Use_When>

<Prerequisites>
- A reachable backend. Production is `https://sunfabb-backend.onrender.com`; a local
  dev server at `http://localhost:3000` works too. Pick deliberately and confirm with
  the owner - these are different databases.
- An admin bearer token (see Step 7). There is no recoverable admin password.
- Cloudinary credentials. Note that `tools/image-pipeline/.env` ships with the
  `CLOUDINARY_*` keys **present but blank**; the real values live in `backend/.env`.
  Any uploader must treat empty-string as unset and fall back, or it will fail with a
  confusing 404 on `/v1_1//ping`.
- Scene files must exist at `tools/image-pipeline/work/scenes/{design_id}/{color}/{scene}.png`
</Prerequisites>

<Preferred_Route>
**Use the script, not hand-rolled tool calls.** `tools/image-pipeline/src/upload-designs.ts`
does the whole flow - missing-colour creation, Cloudinary upload, product, variants,
image attachment - and is idempotent, skipping any design whose slug already exists.

```bash
cd tools/image-pipeline
npx tsx src/upload-designs.ts --dry-run 8555 4461          # always dry-run first
npx tsx src/upload-designs.ts --token-file <path> 8555 4461
```

Flags: `--api <url>` to target a different backend (defaults to production),
`--dry-run` to preview without writing.

48 images through per-image MCP tool calls is ~48 round-trips and easy to get
subtly inconsistent; the script encodes the conventions below in one place.
Fall back to manual steps only when the script cannot express what you need.
</Preferred_Route>

<Steps>

## Step 1 - Parse args and verify scenes exist

Extract `design_id` from the skill argument (e.g. `8569`).

```bash
ls tools/image-pipeline/work/scenes/{design_id}/
```

- If the folder doesn't exist: stop and tell the user.
- Enumerate subfolders = color list (e.g. `blue green peach pink`).
- For each color, enumerate `.png` files = scenes (expected: `hero.png room.png folded.png closeup.png`).
- Print a summary: design ID, colors found, scene count per color. Ask the user to confirm before proceeding if anything looks unexpected (wrong count, missing files).

## Step 2 - Load Cloudinary MCP tools

Only needed on the manual route; the script in <Preferred_Route> talks to
Cloudinary directly via the Node SDK and needs no MCP tools.

```
ToolSearch: "select:mcp__cloudinary-asset-mgmt__upload-asset"
```

## Step 3 - Choose mode

Present two options using AskUserQuestion:
- **Interactive** - prompts for each product field and per-variant fields (name, slug, description, category, care_instructions, then per color: material, size, price, stock, sku)
- **Auto** - derives all values from the design ID and DB lookups; category is the only required choice even in this mode

## Step 4 - Fetch lookup data

Call these three endpoints (no auth required):

```
GET {api_base}/categories
GET {api_base}/colors
GET {api_base}/materials
```

where `{api_base}` is the backend chosen in Prerequisites. None of these need auth.

Store the full list of each. You will use them in the next step.

## Step 5 - Collect product fields

### Auto mode

- Show the user the categories list and ask them to pick one (AskUserQuestion with options from the fetched list).
- Derive all other fields:

These match the products already live. Verify against a real product (e.g.
`GET /products/bedspread-design-8555`) before changing any of them - this doc has
drifted from reality before.

| Field | Auto value |
|---|---|
| name | `Bedspread Design {design_id}` |
| slug | `bedspread-design-{design_id}` (e.g. `bedspread-design-8569`) |
| description | `Printed cotton bedspread design {design_id}, available in {n} colourways. Colour and product details can be refined in the admin catalog.` |
| care_instructions | `Machine wash separately in cold water. Do not bleach. Tumble dry low and iron on the reverse side.` |

- Per-color variant defaults (one row per color folder):

| Field | Auto value |
|---|---|
| color_id | Look up from `GET /colors` by matching the folder name against `color.name`, comparing case-insensitively with `-`/space normalised (`slate-blue` matches `Slate Blue`). If no match, create the colour via `POST /colors` with a canonical hex - the scene folders use ~32 colourway names against a much shorter lookup table, so misses are normal, not exceptional. |
| material_id | Use the first material from `GET /materials` response (typically Cotton). |
| size | `King` |
| price | ask the owner; the 2026-07-25 batch used `149900` (₹1,499). Money is always integers in paise. |
| stock_quantity | `10` |
| sku | `BEDSPREAD-{design_id}-{COLOR_UPPER}` where `COLOR_UPPER` is the folder name uppercased (e.g. `BEDSPREAD-8555-SLATE-BLUE`) |

### Interactive mode

Prompt the user for each field in this order:

**Product-level (ask once):**
1. Name (suggest `Bedspread Design {design_id}`)
2. Slug (suggest `bedspread-design-{design_id}`)
3. Category - show numbered list from `GET /categories`, ask user to pick
4. Description (optional - user can skip)
5. Care instructions (optional - user can skip)

**Per variant (ask for each color, showing the color name):**
1. Material - show numbered list from `GET /materials`
2. Size (suggest `King`)
3. Price in paise (suggest `149900`, the 2026-07-25 batch price)
4. Stock quantity (suggest `10`)
5. SKU (suggest `BEDSPREAD-{design_id}-{COLOR_UPPER}`)

## Step 6 - Show summary and get confirmation

Before any write operation, print a clear summary:

```
Product: "{name}" (slug: {slug})
Category: {category_name}
Cloudinary folder: sunfabb/products/{design_id}/

Variants to create:
  {color} - {material} / {size} - ₹{price/100} - stock: {qty} - SKU: {sku}
  ...

Images to upload: {total_count} files ({colors} x {scenes})
```

Ask: "Proceed with upload and product creation?" If the user says no, stop cleanly.

## Step 7 - Obtain an admin token

**`backend/.env` does NOT contain the admin password.** It holds only
`ADMIN_PASSWORD_HASH` (a bcrypt hash), which `AuthService.login` compares
against with `bcrypt.compare`. Posting the hash as the password fails. There is
no way to derive the plaintext, so the token has to come from the owner.

Do not try to prompt for the password from inside the agent harness either -
it has no TTY, so `read`/`stty` prompts return an empty string and the API
rejects it with a 400.

Ask the owner to run this in a **real terminal window** and report back when the
file exists. The shell is zsh: `read -s -p "prompt" VAR` is a **bash** idiom and
silently reads nothing in zsh, where `-p` means "read from coprocess". Use the
`"VAR?prompt"` form below.

```zsh
read -s "P?admin password: "; echo
curl -s -X POST https://sunfabb-backend.onrender.com/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin@sunfabb.com\",\"password\":\"$P\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])" \
  > <scratchpad>/token
unset P
```

This prints nothing on success - the token goes to the file. Tell the owner that
up front, or silence reads as failure.

### If the owner does not know the password

It is not recoverable - only resettable. `ADMIN_PASSWORD_HASH` is a bcrypt hash,
and there is no admin row in the DB. Reset it:

1. Owner picks a new password and writes only its hash to a file (password never
   enters the transcript; passed via env, not argv, so it stays out of `ps`):

   ```zsh
   cd backend
   read -s "P?new admin password: "; echo
   P="$P" node -e "console.log(require('bcryptjs').hashSync(process.env.P,10))" > <scratchpad>/newhash
   unset P
   ```

2. Set it on Render (service `srv-d8rkpcnlk1mc73c18q7g`, key from `RENDER_API_KEY`
   in `backend/.env`):

   ```bash
   curl -X PUT -H "Authorization: Bearer $RENDER_API_KEY" -H 'Content-Type: application/json' \
     https://api.render.com/v1/services/srv-d8rkpcnlk1mc73c18q7g/env-vars/ADMIN_PASSWORD_HASH \
     -d "{\"value\":\"$(cat <scratchpad>/newhash)\"}"
   ```

3. **The PUT does not restart the service.** The running instance keeps the old
   hash in memory until a deploy. The owner must trigger one - Render dashboard
   "Manual Deploy", or `POST /v1/services/{id}/deploys`. Skipping this makes the
   next login fail for no visible reason.

4. Then run the login block above with the new password.

Tell the owner to save the new password in a password manager: it is the only
admin credential for the live site, and equally unrecoverable next time.

Then read the token from that file. This keeps the plaintext password out of
the transcript, the agent's context, and shell history, while still yielding a
usable bearer token.

Use the token as `Authorization: Bearer <token>` on every subsequent protected
request. Never log or display the token. It expires in 24h (`JWT_EXPIRES_IN`);
on a mid-run 401, ask the owner to regenerate it rather than retrying blindly.

## Step 8 - Upload images to Cloudinary

For each `color` in the discovered colors list, for each `scene` (without extension) in the scenes list:

- Local file path: `tools/image-pipeline/work/scenes/{design_id}/{color}/{scene}.png`
- Cloudinary public_id to assign: `sunfabb/products/{design_id}/{color}/{NN}-{scene}` (no extension),
  where `{NN}` is the zero-padded gallery position: `01-hero`, `02-closeup`, `03-folded`, `04-room`.
  Example: `sunfabb/products/8555/slate-blue/01-hero`.
  **Note the `products/` segment** - omitting it puts the asset in a folder nothing else uses.

After each upload, store:
- `url`: the returned secure_url
- `public_id`: the returned public_id

Collect all results in a map keyed by `{color}/{scene}`.

If any upload fails: report the failure, ask the user whether to retry or abort. Do not continue to product creation if any upload failed.

## Step 9 - Create the Product

```
POST http://localhost:3000/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "{name}",
  "slug": "{slug}",
  "category_id": "{category_id}",
  "description": "{description}",       // omit if empty
  "care_instructions": "{care}"         // omit if empty
}
```

Store the returned `product.id`.

## Step 10 - Create variants (one per color)

For each color:

```
POST http://localhost:3000/products/{product_id}/variants
Authorization: Bearer <token>
Content-Type: application/json

{
  "color_id": "{color_id}",
  "material_id": "{material_id}",
  "size": "{size}",
  "price": {price_in_paise},
  "stock_quantity": {qty},
  "sku": "{sku}"
}
```

Store the returned `variant.id` keyed by color name.

## Step 11 - Attach images to the product

For each color and each scene, call:

```
POST http://localhost:3000/products/{product_id}/images
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "{cloudinary_secure_url}",
  "public_id": "{cloudinary_public_id}",
  "variant_id": "{variant_id_for_this_color}",
  "image_role": "GALLERY",
  "sort_order": {sort_order},
  "is_primary": {is_primary},
  "alt_text": "Design {design_id} {color} {scene}"
}
```

Scene-to-sort_order mapping (verified against live products, 2026-07-25):
| Scene | sort_order | is_primary |
|---|---|---|
| hero | 0 | `true` only for the very first color's hero; `false` for all others |
| closeup | 1 | false |
| folded | 2 | false |
| room | 3 | false |

Process colors in the order they were discovered in the filesystem. The first color's hero image gets `is_primary: true`; every other image gets `is_primary: false`.

## Step 12 - Update CATALOG_PROGRESS.md

Open `tools/image-pipeline/CATALOG_PROGRESS.md` and find the section for this design ID.

Update the status in the design table row from its current value (e.g. `generated locally (20/20; owner QA/import/upload pending)`) to:

`uploaded (owner QA signed off, {total_image_count}/{total_image_count})`

Also update the "Right now" section at the top to include this design if it is newly uploaded.

## Step 13 - Report completion

Print a completion summary:
- Product created: name, slug, product_id
- Variants created: one line per color with variant_id
- Images attached: total count
- Cloudinary folder: `sunfabb/products/{design_id}/`
- CATALOG_PROGRESS.md: updated

</Steps>

<Scene_Sort_Order>
The four scene types map to fixed sort orders and a canonical display sequence:
- `hero` (0) - the hero/lead shot, shown first in the gallery. Only the first color's hero is `is_primary: true`.
- `closeup` (1) - close-up detail shot.
- `folded` (2) - folded stack shot.
- `room` (3) - in-room lifestyle shot.

The gallery goes wide -> detail -> folded -> in-room. An earlier version of this
doc had `room` at 1 and `closeup` at 3, which contradicts every live product.

If a design has fewer than 4 scenes per color (e.g. only hero + room), map accordingly starting from 0. Never hard-code the scene list - always derive it from the actual files present in the color subfolder.
</Scene_Sort_Order>

<Color_Matching>
The folder name is matched against `color.name` from `GET /colors`, comparing
case-insensitively with `-` and space treated as equivalent, so `slate-blue`
matches `Slate Blue`.

When there is no match, **create the colour** via `POST /colors` (JWT-guarded)
with a title-cased name and a canonical hex, then re-fetch the list. The scene
folders use ~32 colourway names against a lookup table that started with 14, so
misses are the normal case. The 2026-07-25 batch added 9 this way.

Two things this must never become:
- **Never invent a `color_id`** or reuse a near-miss colour's id.
- **Never inline the colour as free text** on the variant. It stays an FK to the
  lookup table - project rule 3.

Pick the hex as a *canonical* swatch for the colour name, not a pixel sample from
one design: a single `Maroon` row is the filter facet for every design's maroon.
The owner can recolour any of them in the admin UI afterwards.
</Color_Matching>

<Money_Rule>
All prices are stored and passed as integers in paise. ₹2,999 = `299900`. Never use floats. When displaying to the user, divide by 100 and prefix with ₹.
</Money_Rule>

<Auth_Notes>
- The JWT token expires in 24h (set in `JWT_EXPIRES_IN`). On a 401 mid-upload the token has expired - ask the owner to regenerate it (Step 7); the agent cannot mint one itself.
- Never print or log the access token.
- The admin email is `admin@sunfabb.com` (readable from backend/.env as ADMIN_EMAIL). The password is **not** in `.env` - only `ADMIN_PASSWORD_HASH`. See Step 7.
</Auth_Notes>

<Error_Handling>
- **Missing scenes folder**: stop immediately, tell the user which path was checked.
- **Color not in DB**: stop before any writes, list which colors are missing.
- **Cloudinary upload failure**: after retrying once, stop before creating the Product row. Partial Cloudinary uploads are wasteful but not harmful - the product won't exist in DB, so nothing is orphaned.
- **Backend 409 on slug**: the product slug already exists. Suggest an alternative slug and ask the user how to proceed.
- **Backend 401**: re-authenticate once and retry.
- **Any other 4xx/5xx from backend**: print the error body, stop, and report to the user.
</Error_Handling>

<Notes>
- Always verify the scenes folder before prompting for mode - no point asking Interactive vs Auto if the files don't exist.
- The `public_id` field was added to `ProductImage` in the backfill PR (commit a8281a7). Always pass it through from the Cloudinary response - never drop it. This enables future clean Cloudinary deletes from the admin UI.
- Existing live products follow the slug convention `{category_slug}-design-{design_id}` (e.g. `bedspread-design-8569`). The auto mode derives this automatically. In interactive mode, suggest the same pattern.
- CATALOG_PROGRESS.md is the source of truth for pipeline status. Always update it at the end, even if just changing one word - a stale tracker causes duplicate upload attempts on future sessions.
- Do not hardcode any UUIDs for category_id, color_id, or material_id. Always fetch them from the live backend before use.
</Notes>

<Example>
User: `$design-upload 8555`

1. Finds `tools/image-pipeline/work/scenes/8555/` with 4 color subfolders (maroon, slate-blue, olive-brown, grey-blue), 4 scenes each = 16 images total.
2. Loads Cloudinary MCP tool schema.
3. Asks: Interactive or Auto?
4. User picks Auto.
5. Fetches categories (e.g. Bedspreads), colors (maroon, slate-blue, etc.), materials (Cotton).
6. Asks user to pick category -> user picks Bedspreads.
7. Derives: name=`Design 8555`, slug=`bedspread-design-8555`, 4 variants, 16 images.
8. Shows summary, asks for confirmation.
9. Asks the owner for a bearer token (Step 7); the agent cannot mint one itself.
10. Uploads 16 images to Cloudinary (sunfabb/8555/{color}/{scene}).
11. POSTs product, 4 variants, 16 image records.
12. Updates CATALOG_PROGRESS.md: 8555 row -> "uploaded (owner QA signed off, 20/20)".
13. Reports completion.
</Example>
