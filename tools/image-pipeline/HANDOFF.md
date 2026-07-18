# Image pipeline - session handoff

Written 2026-07-04.
Everything here is UNCOMMITTED by owner request.
When ready to commit, use a dedicated branch (suggested: `feature/image-pipeline`), not `feature/phase6.4-payments`.

## What this is

A CLI pipeline (`tools/image-pipeline/`, TypeScript, tested: 16/16 passing, typecheck clean) that turns raw supplier fabric photos into a Cloudinary-hosted catalog image set.
Full usage is in `README.md`; this file records session context and decisions so a future session can resume without re-deriving anything.

## Current state

- `input/8569.jpg`: one real source photo staged (design 8569, bedspread, 4 colorways: blue, pink, green, peach).
- `work/manifest.json`: hand-tuned boxes for 8569, verified good.
- `work/crops/`: 4 verified single-colorway crops.
- `work/prep/8569-steps.md`: all 20 generation steps (prompts + attachments + save paths) for manual/browser generation.
- `work/state.json`: contains the 60 uploaded artifacts for designs 8569, 4219, and 8525, plus
  four local-only artifacts from the partial 8555 work.
- `work/uploads.json`: contains the Cloudinary URLs for the 60 released images.
- `.env`: Cloudinary creds auto-resolve from `backend/.env` (verified by the upload run).
- The owner's other 20-30 source photos are NOT yet in `input/`.

## The two generation routes

### Route A: paid Gemini API (fully automated) - PARKED

Tried on 2026-07-04: all 20 generations failed with 429 `free_tier_requests, limit: 0`.
Diagnosis: the API key's Google Cloud project has no billing enabled; image models have zero free API quota.
$0 was charged.
The pipeline now fails fast with a clear message on this exact error.

To resume this route later:
1. Enable billing on the key's project at https://aistudio.google.com/apikey.
2. Set a hard Project Spend Cap first (AI Studio settings, "Edit spend cap"; feature launched March 2026; enforcement can lag ~10 min, so set it ~10% below the true ceiling). Suggested: $5 for the test run.
3. `npm run pipeline -- generate --yes` then `qa`, `review`, `upload`.

Verified costs (official pricing, July 2026): master scenes and swatches on `gemini-3-pro-image-preview` $0.134/image; swaps on `gemini-3.1-flash-image` $0.067/image at 1K.
Design 8569 (4 colorways, 4 shots) = 20 images = ~$1.88.
Whole catalog estimate: $25-50.
Image output is flat-priced per image; costs cannot balloon, and `generate` always prints the estimate and asks first.
Also relevant: every billing account has a mandatory ~$250/month Tier 1 cap; a consumer Gemini Pro subscription never covers API usage.

`doctor` confirmed these models are available to the key: `gemini-flash-latest` (analysis), `gemini-3-pro-image-preview` (scene/swatch), `gemini-3.1-flash-image` (swap).

### Route B: free manual/browser generation via Gemini app - ACTIVE

Uses the owner's Gemini Pro subscription quota (~100 images/day) at gemini.google.com, driven by Claude in Chrome.
`scan`/`qa` still use the API free tier (text/vision models are free-tier); `crop`/`review`/`upload` are local/Cloudinary.

Flow: `prep` writes step files -> generate each step in the Gemini app -> save downloads to the listed paths -> `import` -> `qa` -> `review` -> `upload`.

The ready-to-paste prompt for a fresh session doing this is at the bottom of this file.

## Design decisions worth keeping

- Pattern fidelity is the product: every prompt ends with a "Preserve the printed fabric pattern EXACTLY" suffix, and QA scores each image 0-10 against the reference fabric (threshold 7).
- Colorway swap technique: master scenes are generated once per design (first colorway), remaining colorways are edit-swaps attaching [master scene, target swatch]. This keeps scenes pixel-consistent across colors so the product page carousel can swap by selected color seamlessly.
- One colorway per chat/generation; mixed-colorway references cause color bleed.
- Scene sets are per category (bedspread/towel/table_linen/napkin/other), 4 shots each, defined in `src/prompts.ts`.
- Cloudinary naming: `sunfabb/products/{designNo}/{color}/{01-hero|...|swatch}` + tags including `ai-generated`; `work/uploads.json` maps design -> color -> images for future `ProductImage` seeding (images must be keyed by color/variant for the carousel).
- Honesty rule: keep at least one real photo or true-derived swatch per product; spot-check generated patterns against physical fabric before approving.

## Historical prompt for browser-driven free generation

The generation work described below is complete for 8569, 4219, and 8525. Keep this prompt as
historical reference, but do not follow it as pending work for those three designs.

Paste this into a fresh Claude Code session (Sonnet is fine):

```
Continue the catalog image-pipeline work in tools/image-pipeline (read HANDOFF.md and README.md there first).

Goal: generate the design 8569 image set for FREE by driving gemini.google.com in my Chrome (Claude in Chrome tools) using my logged-in Gemini Pro subscription. Do NOT use the paid Gemini API: never run "npm run pipeline -- generate" - if you think it is needed, stop and ask me.

Steps:
1. cd tools/image-pipeline. The plan is prepared: work/prep/8569-steps.md lists all 20 generation steps in order (files to attach, exact prompt, save path). Crops already exist in work/crops/.
2. Open a new tab at gemini.google.com. Use the image generation mode ("Create images"); prefer the Thinking/Pro image model if selectable.
3. Execute the 20 steps IN ORDER (swatches, then master scenes, then swaps - later steps attach files produced by earlier ones). For each step: start a fresh chat, attach the listed file(s), paste the prompt verbatim, wait for the image, download it, then move/rename it from ~/Downloads to the exact "Save result as" path.
4. Quality check per step before moving on: if the pattern is obviously mangled or the scene broke, retry once in a fresh chat.
5. When all 20 files exist: run "npm run pipeline -- import" then "npm run pipeline -- qa" (qa uses the free API tier). Then start "npm run pipeline -- review" in the background and tell me to open http://localhost:4977.
6. Report: which steps needed retries, QA scores, anything stuck.

Rules: my app quota is ~100 images/day and this run needs ~20-25 generations, so it fits. One colorway per chat. Do not commit anything to git. If the browser flow fails 3 times in a row, stop and report rather than grinding.
```

## After the first three designs work end to end

1. Drop the remaining photos into `input/`, run `scan`, review the manifest (Checkpoint A), `crop`, then `prep` and repeat the browser flow per design (or enable billing and use Route A for the bulk).
2. Approve in `review` (Checkpoint B), `upload` to Cloudinary.
3. Then wire the frontend: `ProductImage` keyed by color/variant, carousel swaps on color selection, `work/uploads.json` has everything needed for seeding.
