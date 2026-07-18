---
name: design-upload
description: Upload a QA-signed-off design from the scenes folder to Cloudinary and register it as a full product (variants + images) in the backend. Invoked after owner visual QA sign-off on a design.
argument-hint: "<design_id>"
level: 2
---

<Purpose>
After a design's scenes have been generated and QA-signed-off locally, this skill:
1. Uploads all scene images to Cloudinary under `sunfabb/{design_id}/{color}/{scene}`
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
- Backend NestJS dev server must be running at http://localhost:3000
- `backend/.env` must contain `ADMIN_PASSWORD` (read it with a shell command, never log it)
- Cloudinary MCP server (`mcp__cloudinary-asset-mgmt__*`) must be connected
- Scene files must exist at `tools/image-pipeline/work/scenes/{design_id}/{color}/{scene}.png`
</Prerequisites>

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

Load the upload tool schema before using it:

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
GET http://localhost:3000/categories
GET http://localhost:3000/colors
GET http://localhost:3000/materials
```

Store the full list of each. You will use them in the next step.

## Step 5 - Collect product fields

### Auto mode

- Show the user the categories list and ask them to pick one (AskUserQuestion with options from the fetched list).
- Derive all other fields:

| Field | Auto value |
|---|---|
| name | `Design {design_id}` |
| slug | `{category_slug}-design-{design_id}` (e.g. `bedspread-design-8569`) where `category_slug` is the slug of the chosen category |
| description | omit (optional) |
| care_instructions | omit (optional) |

- Per-color variant defaults (one row per color folder):

| Field | Auto value |
|---|---|
| color_id | Look up from `GET /colors` response by matching folder name (case-insensitive) against `color.name`. If no match, stop and report the missing color - the user must add it to the DB first via the admin UI. |
| material_id | Use the first material from `GET /materials` response (typically Cotton). |
| size | `King` |
| price | `299900` (₹2,999 stored as paise per project rule - money is always integers in paise) |
| stock_quantity | `10` |
| sku | `{design_id}-{COLOR_UPPER}-KING` where `COLOR_UPPER` is the folder name uppercased (e.g. `8569-BLUE-KING`) |

### Interactive mode

Prompt the user for each field in this order:

**Product-level (ask once):**
1. Name (suggest `Design {design_id}`)
2. Slug (suggest `{category_slug}-design-{design_id}`)
3. Category - show numbered list from `GET /categories`, ask user to pick
4. Description (optional - user can skip)
5. Care instructions (optional - user can skip)

**Per variant (ask for each color, showing the color name):**
1. Material - show numbered list from `GET /materials`
2. Size (suggest `King`)
3. Price in paise (suggest `299900`)
4. Stock quantity (suggest `10`)
5. SKU (suggest `{design_id}-{COLOR_UPPER}-{SIZE_UPPER}`)

## Step 6 - Show summary and get confirmation

Before any write operation, print a clear summary:

```
Product: "{name}" (slug: {slug})
Category: {category_name}
Cloudinary folder: sunfabb/{design_id}/

Variants to create:
  {color} - {material} / {size} - ₹{price/100} - stock: {qty} - SKU: {sku}
  ...

Images to upload: {total_count} files ({colors} x {scenes})
```

Ask: "Proceed with upload and product creation?" If the user says no, stop cleanly.

## Step 7 - Authenticate with backend

Read credentials from backend/.env:

```bash
grep ADMIN_PASSWORD backend/.env
```

Then POST to login:

```
POST http://localhost:3000/auth/login
Content-Type: application/json

{"email": "admin@sunfabb.com", "password": "<ADMIN_PASSWORD>"}
```

Store the `access_token` from the response. Use it as `Authorization: Bearer <token>` on every subsequent protected request. Never log or display the password or token.

## Step 8 - Upload images to Cloudinary

For each `color` in the discovered colors list, for each `scene` (without extension) in the scenes list:

- Local file path: `tools/image-pipeline/work/scenes/{design_id}/{color}/{scene}.png`
- Cloudinary public_id to assign: `sunfabb/{design_id}/{color}/{scene}` (no extension)
- Use `mcp__cloudinary-asset-mgmt__upload-asset` with the file path and public_id

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

Scene-to-sort_order mapping:
| Scene | sort_order | is_primary |
|---|---|---|
| hero | 0 | `true` only for the very first color's hero; `false` for all others |
| room | 1 | false |
| folded | 2 | false |
| closeup | 3 | false |

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
- Cloudinary folder: `sunfabb/{design_id}/`
- CATALOG_PROGRESS.md: updated

</Steps>

<Scene_Sort_Order>
The four scene types map to fixed sort orders and a canonical display sequence:
- `hero` (0) - the hero/lead shot, shown first in the gallery. Only the first color's hero is `is_primary: true`.
- `room` (1) - in-room lifestyle shot.
- `folded` (2) - folded stack shot.
- `closeup` (3) - close-up detail shot.

If a design has fewer than 4 scenes per color (e.g. only hero + room), map accordingly starting from 0. Never hard-code the scene list - always derive it from the actual files present in the color subfolder.
</Scene_Sort_Order>

<Color_Matching>
The folder name (e.g. `blue`, `pink`, `peach`) is matched case-insensitively against `color.name` from `GET /colors`. If no match is found, **do not invent a color_id or skip the variant**. Stop and tell the user:

> "Color '{folder_name}' not found in the database. Add it via the admin UI at `/admin/colors`, then re-run this skill."

This enforces project rule 3: Color is a lookup table, never free text.
</Color_Matching>

<Money_Rule>
All prices are stored and passed as integers in paise. ₹2,999 = `299900`. Never use floats. When displaying to the user, divide by 100 and prefix with ₹.
</Money_Rule>

<Auth_Notes>
- The JWT token expires in 24h (set in `JWT_EXPIRES_IN`). If a 401 is returned mid-upload, re-authenticate and retry the failed request once.
- Never print or log the admin password or access token.
- The admin email is `admin@sunfabb.com` (readable from backend/.env as ADMIN_EMAIL).
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
9. Reads ADMIN_PASSWORD from backend/.env, logs in, gets JWT.
10. Uploads 16 images to Cloudinary (sunfabb/8555/{color}/{scene}).
11. POSTs product, 4 variants, 16 image records.
12. Updates CATALOG_PROGRESS.md: 8555 row -> "uploaded (owner QA signed off, 20/20)".
13. Reports completion.
</Example>
