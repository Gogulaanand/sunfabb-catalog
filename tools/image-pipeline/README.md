# Catalog image pipeline

Turns raw supplier photos of printed fabrics into a polished, Cloudinary-hosted catalog image set, automatically.

A source photo is often several colorways of one design draped side by side.
For each photo the pipeline detects the design number and colorways, cuts a reference crop per colorway, generates a clean flat swatch, renders a 4-shot lifestyle scene set with Gemini image models, swaps the fabric across the remaining colorways so all color variants share identical scenes, QA-scores every image for pattern fidelity, and uploads what you approve to Cloudinary.

Scenes are identical across colorways by design: the product page can swap the carousel per selected color and it looks like the same photoshoot in a new color.

## One-time setup

```bash
cd tools/image-pipeline
npm install
cp .env.example .env
```

1. Create a Gemini API key at https://aistudio.google.com/apikey and put it in `.env`.
2. `scan` and `qa` run on the API free tier.
   The `generate` stage uses image models that have **no free API tier**: the key's Google Cloud project must have billing enabled, and images are billed per generation (a consumer Gemini Pro subscription does **not** cover API usage).
3. Cloudinary credentials are read from `backend/.env` automatically; override in `.env` if needed.
4. Verify everything: `npm run pipeline -- doctor`.
   This also checks that the configured model ids exist for your key and lists the available image models.
   If a default model has been renamed by Google, set the right id in `pipeline.config.json` (see below).

## Workflow

```bash
npm run pipeline -- scan       # 1. analyze photos in input/  -> work/manifest.json
# Checkpoint A: review work/manifest.json (design numbers, colors, categories)
npm run pipeline -- crop       # 2. cut per-colorway reference crops; eyeball them
npm run pipeline -- generate   # 3. prints cost estimate, asks, then generates
npm run pipeline -- qa         # 4. scores pattern fidelity, flags failures
npm run pipeline -- generate   # 5. optional: regenerate QA failures (notes fed back in)
npm run pipeline -- review     # 6. Checkpoint B: approve/reject in the browser gallery
npm run pipeline -- upload     # 7. approved images -> Cloudinary + work/uploads.json
```

`npm run pipeline -- run` chains generate -> qa -> retry -> qa.
`npm run pipeline -- status` shows progress; `generate --dry-run` prices a run without spending.

### Free/manual mode (no image-API billing)

If you prefer generating in the Gemini app (covered by a Gemini Pro subscription) instead of the paid API, replace step 3 with:

```bash
npm run pipeline -- prep       # writes work/prep/{design}-steps.md: prompt + attachments + save path per image
# generate each step in the Gemini app, save results to the listed paths
npm run pipeline -- import     # registers the saved files as pipeline artifacts
```

Then continue with `qa` (free API tier), `review`, and `upload` as usual.
See `HANDOFF.md` for a ready-made prompt that drives this via Claude in Chrome.

Drop source photos (`.jpg`, `.png`, `.webp`) into `input/`.
iPhone HEIC photos must be converted first (Finder: right-click, Quick Actions, Convert Image).

Every stage is resumable: state lives in `work/state.json`, and re-running a stage only does what is missing.
Nothing in `input/` or `work/` is committed to git.

## Cost model

Defaults (override in `pipeline.config.json`): swatches and master scenes use Nano Banana Pro (`gemini-3-pro-image-preview`, $0.134/image), colorway swaps use Nano Banana 2 (`gemini-3.1-flash-image`, $0.067/image at 1K).
A 4-colorway design with the default 4-shot set costs about $1.90.
The `generate` stage always prints the exact estimate and asks before spending; unknown models are priced at the most expensive known rate so the gate never understates.

## Configuration

Create `pipeline.config.json` next to `package.json` to override any default:

```json
{
  "models": {
    "analysis": "gemini-flash-latest",
    "scene": "gemini-3-pro-image-preview",
    "swap": "gemini-3.1-flash-image"
  },
  "imageSize": "1K",
  "sceneAspectRatio": "4:3",
  "qaThreshold": 7,
  "maxAttempts": 2,
  "concurrency": 2,
  "reviewPort": 4977
}
```

Bump `imageSize` to `2K` for final production quality (roughly 1.5x the cost on the swap model).

## Fixing things

- Wrong design number, color name, or category: edit `work/manifest.json` (Checkpoint A), then rerun from `crop --force`.
- A crop contains a neighboring colorway: adjust its `box` in the manifest, rerun `crop --force`, delete the affected artifacts from `work/state.json`, rerun `generate`.
- An image failed QA twice and is stuck: `status` lists it; delete its entry from `work/state.json` to retry, or fix its crop first.
- Rejected images in the review gallery are regenerated on the next `generate` run.

## Output conventions

Cloudinary public ids: `sunfabb/products/{designNo}/{color}/{01-hero|02-closeup|...|swatch}`.
Tags: `design-{no}`, `color-{name}`, `shot-{name}`, `ai-generated`.
`work/uploads.json` maps design -> color -> ordered images, ready for seeding `ProductImage` rows (the color-keyed carousel needs images linked to a color/variant).

## Honesty rule

Generated lifestyle shots are marketing ambiance.
Keep at least one real photo (or the flat swatch, which is derived directly from the real fabric) per product, and always spot-check generated patterns against the physical fabric before approving.
