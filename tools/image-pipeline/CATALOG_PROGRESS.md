# Catalog image progress tracker

Living doc, updated as work happens. Not auto-generated - keep it current by hand (or ask
Claude to update it) whenever a design's stage changes. Not committed to git yet by owner
request (see HANDOFF.md).

Generation route: free, manual/agent-driven (point a local reference image at a normal agent
session, no paid Gemini API calls). A small sparkle/watermark mark in the corner of "hero"
shots is expected/standard from the tool and is accepted, not treated as a defect.

**Rate limit (important - read before batching more work):** the generation tool enforces a
Google-documented compute-based usage system: your allowance refreshes every 5 hours (partial
reset) up to a weekly cap; exact image-per-window counts aren't published and depend on prompt
complexity, model, and chat length. Empirically, one continuous session got through ~19 of 20
queued generations before hitting the wall. At that rate, all 50 new designs (up to 20 images
each for a standard 4-colorway design) would take on the order of ~50 five-hour windows to clear
on the free route alone - realistically multiple weeks of calendar time if done a design or two
per window. The paid API has no such throughput ceiling (cost only, no rate limit) - worth
revisiting if the free route's pace becomes a real bottleneck. See Cost notes below for the
paid-route price if that trade becomes worth making.

update: we are moving away from gemini api calls to openai chatgpt and codex for image generation. we will be using gpt5.6-luna-high under the subscribed chatgpt plus plan . 

## Right now (read this first when resuming)

- Designs **8569, 4219, and 8525 are complete, owner-QA-signed-off, uploaded to Cloudinary,
  and attached to active catalog products**. They are the first three live catalog sets.
- `work/state.json` records the 60 signed-off artifacts as uploaded, and `work/uploads.json`
  contains the Cloudinary URLs used to attach them to the products.
- Design 8555 is now generation-complete locally (20/20: 4 swatches + 16 scenes), but remains
  deliberately excluded from this upload until owner visual QA/sign-off and the normal import,
  review, and upload stages are run.
- The remaining designs can continue through the same manual/agent generation loop when ready.

## Status legend

- `done` - generated, owner-QA-signed-off, and uploaded (when the design is released)
- `retrying` - a defect was found and regeneration is in progress
- `not started` - crop/prep hasn't happened yet
- `needs review` - ambiguous colorway count or category, needs a human look before cropping (Checkpoint A)
- `parked` - out of scope for now, see Parked section

## Design 8569 (bedspread, 4 colorways: blue/pink/green/peach) - pilot design - COMPLETE

All 20 images done and QA-verified good (20/20). The peach retry (hero/closeup/room) landed
correctly on the second attempt - petal color is now the correct maroon-red/burgundy, and
room.png generated successfully once the tool's rate limit reset. All "hero" shots across all
4 colorways carry the small sparkle/watermark mark - this is expected/standard from the
generation tool and is accepted, not a defect.

Owner sign-off is complete. The 20 artifacts were imported, approved, uploaded to Cloudinary,
and attached to the active product `bedspread-design-8569` with four Cotton/King variants.

## Design 4219 (bedspread, 4 colorways: pink/mustard/blue/magenta) - COMPLETE

All 20 images generated. QA'd against `work/crops/4219-*.jpg`. Pattern: concentric-circle rings
on a two-tone block background, with prominent DARK CIRCULAR MEDALLIONS each containing a
WHITE BIRCH LEAF (compact, single-leaf with veins). This motif must appear in every image.

The earlier automated QA pass recorded 10 PASS and 10 FAIL results:

| Image | Result | Notes |
|---|---|---|
| swatch: pink | PASS | Correct coral/pink background, circles, dark-circle + white birch leaf |
| swatch: mustard | PASS | Correct mustard/gold background, circles, leaf medallion accurate |
| swatch: blue | FAIL | Leaf medallion completely absent - only concentric circles rendered, no dark circle or leaf |
| swatch: magenta | FAIL | Invented wrong leaf type - large ornate feather/frond in top-right; original is a compact birch leaf |
| pink/hero | PASS | Pattern faithful, good bedroom composition |
| pink/closeup | PASS | Clear detail, leaf medallion accurate |
| pink/folded | PASS | Stack on bench, pattern correct |
| pink/room | PASS | Wide view, pattern accurate |
| mustard/hero | PASS | Pattern faithful |
| mustard/closeup | PASS | Pattern accurate |
| mustard/folded | PASS | Pattern accurate |
| mustard/room | PASS | Pattern accurate |
| blue/hero | FAIL | Circles-only pattern, no leaf medallion (inherited from bad blue swatch) |
| blue/closeup | FAIL | Circles only, no leaf |
| blue/folded | FAIL | Circles only, no leaf |
| blue/room | FAIL | Near-circles-only; faint shapes from pink base but no dark-circle + white leaf |
| magenta/hero | FAIL | Large elongated feather shapes instead of compact birch leaf |
| magenta/closeup | FAIL | Freestanding feather-leaf shapes; inconsistent with original |
| magenta/folded | FAIL | Ornate feather visible on top piece |
| magenta/room | FAIL | Large standalone feather shapes, no leaf-in-circle medallion |

**Root cause:** The blue and magenta swatches were defective. Blue dropped the leaf motif entirely
(circles only). Magenta invented a completely different ornate feather. All 8 scenes for those
two colorways were generated by swapping those bad swatches onto the pink master shots, so they
all inherited the same defect. Fix: re-generate both swatches, then re-run the 4 scene swaps
for each.

The retry prompts below are retained as reference material for future image generations. They
are not pending work for the current release: the owner has completed QA/sign-off for all 20
images, and all 20 were uploaded to Cloudinary and attached to `bedspread-design-4219`.

If this design is regenerated in the future, run the retries in order - the swatch retries must
complete before the scene swaps.

### Retry A - swatch: 4219/blue/swatch (replaces Step 3)

Attach 1: work/crops/4219-blue.jpg
Save result as: work/swatches/4219-blue.png

Prompt:
```
This is a photo of a draped printed cotton fabric. Recreate it as a clean, flat product swatch:
the fabric laid perfectly flat, viewed straight-on, evenly lit with soft diffused light, no
wrinkles, folds, shadows or perspective distortion. Ignore any sliver of a different fabric,
background or objects at the image edges. The fabric fills the entire frame.

This fabric has TWO distinct elements - both must appear in the output:
1. Concentric circle rings scattered across the background in two shades of blue.
2. Large dark circular medallions, each containing a single WHITE LEAF (birch-style: one plain
   leaf with visible veins, not a feather, not a frond, not an ornate botanical shape).

Preserve the printed fabric pattern EXACTLY as in the reference: the same motifs, the same
colors, the same pattern scale and repeat. Do not drop, simplify, or substitute either element.
Photorealistic, professional home-textile catalog photography. Square 1:1 aspect ratio.
```

### Retry B - swatch: 4219/magenta/swatch (replaces Step 4)

Attach 1: work/crops/4219-magenta.jpg
Save result as: work/swatches/4219-magenta.png

Prompt:
```
This is a photo of a draped printed cotton fabric. Recreate it as a clean, flat product swatch:
the fabric laid perfectly flat, viewed straight-on, evenly lit with soft diffused light, no
wrinkles, folds, shadows or perspective distortion. Ignore any sliver of a different fabric,
background or objects at the image edges. The fabric fills the entire frame.

This fabric has TWO distinct elements - both must appear in the output:
1. Concentric circle rings scattered across the hot-pink/magenta background.
2. Large dark circular medallions, each containing a single WHITE LEAF (a simple birch or maple
   leaf: one plain leaf with visible veins). The leaf is simple and flat - NOT an ornate feather,
   NOT a palm frond, NOT a multi-leaf botanical illustration. One plain leaf per medallion.

Preserve the printed fabric pattern EXACTLY as in the reference: the same motifs, the same
colors, the same pattern scale and repeat. Do not redesign, simplify, restyle or recolor the
pattern. Photorealistic, professional home-textile catalog photography. Square 1:1 aspect ratio.
```

### Retry C - swap: 4219/blue/hero (replaces Step 10)

Wait for Retry A to complete first.

Attach 1: work/scenes/4219/pink/hero.png
Attach 2: work/swatches/4219-blue.png (the new corrected version)
Save result as: work/scenes/4219/blue/hero.png

Prompt: (same as original Step 10)
```
The first image is a finished catalog photo. The second image is a fabric swatch. Replace the
fabric of the textile product in the first image with the exact fabric from the second image.
Keep everything else completely unchanged: the same room, furniture, drape folds, lighting,
shadows, camera angle and composition. Keep the pattern scale consistent with the first image.
Only the printed pattern and its colors change, and they must match the second image exactly.
Preserve the printed fabric pattern EXACTLY as in the reference: the same motifs, the same
colors, the same pattern scale and repeat. Do not redesign, simplify, restyle or recolor the
pattern. Photorealistic, professional home-textile catalog photography. Landscape 4:3 aspect ratio.
```

### Retry D - swap: 4219/blue/closeup (replaces Step 13)

Attach 1: work/scenes/4219/pink/closeup.png
Attach 2: work/swatches/4219-blue.png (corrected)
Save result as: work/scenes/4219/blue/closeup.png
Prompt: same as Retry C above.

### Retry E - swap: 4219/blue/folded (replaces Step 16)

Attach 1: work/scenes/4219/pink/folded.png
Attach 2: work/swatches/4219-blue.png (corrected)
Save result as: work/scenes/4219/blue/folded.png
Prompt: same as Retry C above.

### Retry F - swap: 4219/blue/room (replaces Step 19)

Attach 1: work/scenes/4219/pink/room.png
Attach 2: work/swatches/4219-blue.png (corrected)
Save result as: work/scenes/4219/blue/room.png
Prompt: same as Retry C above.

### Retry G - swap: 4219/magenta/hero (replaces Step 11)

Wait for Retry B to complete first.

Attach 1: work/scenes/4219/pink/hero.png
Attach 2: work/swatches/4219-magenta.png (corrected)
Save result as: work/scenes/4219/magenta/hero.png
Prompt: same as Retry C above.

### Retry H - swap: 4219/magenta/closeup (replaces Step 14)

Attach 1: work/scenes/4219/pink/closeup.png
Attach 2: work/swatches/4219-magenta.png (corrected)
Save result as: work/scenes/4219/magenta/closeup.png
Prompt: same as Retry C above.

### Retry I - swap: 4219/magenta/folded (replaces Step 17)

Attach 1: work/scenes/4219/pink/folded.png
Attach 2: work/swatches/4219-magenta.png (corrected)
Save result as: work/scenes/4219/magenta/folded.png
Prompt: same as Retry C above.

### Retry J - swap: 4219/magenta/room (replaces Step 20)

Attach 1: work/scenes/4219/pink/room.png
Attach 2: work/swatches/4219-magenta.png (corrected)
Save result as: work/scenes/4219/magenta/room.png
Prompt: same as Retry C above.

## Design 8525 (bedspread, 4 colorways: mauve/grey/lavender/gold) - COMPLETE

All 20 generated images have been owner-QA-signed-off. The set was uploaded to Cloudinary and
attached to the active product `bedspread-design-8525` with four Cotton/King variants.

## Design 8555 (bedspread, 4 colorways: maroon/slate-blue/olive-brown/grey-blue) - GENERATION COMPLETE

All 20 images are generated locally: 4 swatches plus 4 scenes for each colorway (hero, closeup,
folded, room). The pattern is a woven square-grid ground with tan/beige leaves, pale colorway-
matched branching sprigs, and white fern-like sprigs. Owner visual QA, import, review, and upload
are still pending; do not treat 8555 as released yet.

## The other 55 source photos

56 photos total in `~/Downloads/all-fabric-designs/`, minus the 1 duplicate of 8569 = 55 to account for.

**Status: manifest populated, crop done (184 crop files, all 50 designs), verification in
progress.** A fresh session estimated colorway boxes for all 50 usable designs and wrote them to
`work/manifest.json`; the local (free, no-API) `crop` stage then ran successfully.

**Data quality finding (resolved):** the automated cropping pass was unreliable - across the
initial 5-design spot-check plus a full 3-agent verification of the remaining 45, **23 of 50
designs (46%) needed correction**:
- 2 fully fabricated (wrong design number AND colors that didn't match the source photo at all):
  `3407a693`, `3fa9c707`
- 2 with swapped/wrong design numbers and box templates: `34cb3c44`, `40059ce4`/`485fc9da`
- 6 with completely scrambled color labels (crop geometry fine, but color names didn't match
  what was actually shown - e.g. a crop labeled "teal" was actually the mustard strip):
  `4219`, `8525`, `8555`, `4461`, `8470`, `SILVER-STAR`
- 13 with boundary bleed (correct colors, box just drawn too loose/into a neighboring strip,
  some severe - e.g. `8559`/olive was ~65% the wrong neighboring strip): `8473`, `8479`, `8474`,
  `8507` (name only), `4210`, `8559`, `4462`, `8560`, `4208`, `4607`, `8576`, `8545`

All 23 fixed by directly viewing the source photo for each (pixel-color-sampling the real
strip boundaries where the boundary wasn't obvious to the eye, especially on a couple of
photos with severe perspective skew where the color boundary shifted ~30px between the top
and bottom of a tall crop box) and re-cropping. Every fix was re-viewed after re-cropping to
confirm. The remaining 27 designs passed verification as-is.

**Status: all 50 designs cropped and verified good** (184 crop files in `work/crops/`). Ready
to move into swatch/scene generation via the same manual/agent loop used for 8569.

### Usable designs - cropped and verified, ready for swatch/scene generation (50)

| Design No | Category | Colorways | Status |
|---|---|---|---|
| 8569 | bedspread | 4 | uploaded (owner QA signed off, 20/20) |
| 4219 | bedspread | 4 | uploaded (owner QA signed off, 20/20) |
| 8525 | bedspread | 4 | uploaded (owner QA signed off, 20/20) |
| 8555 | bedspread | 4 | generated locally (20/20; owner QA/import/upload pending) |
| 4461 | bedspread | 4 | generated locally (20/20; owner QA/import/review/upload pending) |
| 8470 | bedspread | 4 | generated locally (20/20; scene family A; owner visual QA, import, review, and upload pending) |
| 4388 | bedspread | 4 (pink/yellow/teal/orange - corrected, was fabricated as 8472 beige/blue/yellow/pink) | generated locally (20/20; scene family B; owner visual QA, import, review, and upload pending) |
| 8571 | bedspread | 3 (grey-blue/yellow/pink - corrected, was fabricated as 4222 brown/teal/grey/red) | generated locally (15/15; scene family C; owner visual QA, import, review, and upload pending) |
| 4221 | bedspread | 4 (brown/blue-grey/mustard/mauve - corrected, was mislabeled 8498) | generated locally (20/20; scene family D; owner visual QA, import, review, and upload pending) |
| 8501 | bedspread | 4 (red/teal/mustard/light-blue - corrected, was mislabeled 4221 with wrong box layout) | generated locally (20/20; scene family A; owner visual QA, import, review, and upload pending) |
| 4610 | bedspread | 4 | generated locally (20/20; scene family B; owner visual QA, import, review, and upload pending) |
| 8563 | bedspread | 4 | generated locally (20/20; scene family C; owner visual QA, import, review, and upload pending) |
| 4216 | bedspread | 4 | generated locally (20/20; scene family D; owner visual QA, import, review, and upload pending) |
| 8517 | bedspread | 4 | generated locally (20/20; scene family A; owner visual QA, import, review, and upload pending) |
| 8496 | bedspread | 4 | generated locally (20/20; scene family B; owner visual QA, import, review, and upload pending) |
| 8522 | bedspread | 4 | generated locally (20/20; scene family C; owner visual QA, import, review, and upload pending) |
| 8519 | bedspread | 4 | generated locally (20/20; scene family D; owner visual QA, import, review, and upload pending) |
| 4592 | bedspread | 4 | generated locally (20/20; scene family A; owner visual QA, import, review, and upload pending) |
| 4195 | bedspread | 4 | generated locally (20/20; scene family B; owner visual QA, import, review, and upload pending) |
| 4207 | bedspread | 4 | cropped |
| 4429 | bedspread | 4 (Mickey Mouse novelty print) | generation stopped (Step 1 cyan swatch moderation-blocked on 3 attempts; 0/20 generated; owner review needed for an authorized alternative workflow) |
| 4603 | bedspread | 4 | cropped |
| 4425 | bedspread | 4 | cropped |
| 8473 | bedspread | 4 | cropped |
| 4337 | bedspread | 4 | cropped |
| 8521 | bedspread | 4 | cropped |
| 4217 | bedspread | 4 | cropped |
| 8479 | bedspread | 4 | cropped |
| 4468 | bedspread | 4 | cropped |
| 8476 | bedspread | 4 | cropped |
| 8511 | bedspread | 4 | cropped |
| 8474 | bedspread | 4 | cropped |
| 8507 | bedspread | 4 | cropped |
| 4210 | bedspread | 4 | cropped |
| 8559 | bedspread | 4 | cropped |
| 4462 | bedspread | 4 | cropped |
| 8481 | bedspread | 4 | cropped |
| 8560 | bedspread | 4 | cropped |
| 4208 | bedspread | 4 | cropped |
| 4607 | bedspread | 4 | cropped |
| 8576 | bedspread | 4 | cropped |
| 8545 ("108\" Gloria (Cotton)") | bedspread | 4 | cropped |

That's 40 of the 50 - the "standard" 4-colorway bedspread pattern. The remaining 10 need a
judgment call at Checkpoint A before cropping:

| Source file (no confirmed design no. yet) | Category | Colorways | Needs review because |
|---|---|---|---|
| 3407a693-...jpg (now `UNKNOWN-PLAID4`) | other | 1 (confirmed: no design tag visible anywhere in the photo) | Two navy/white plaid pieces, slightly different check scale - treated as 1 SKU like the other untagged pairs; cropped and re-verified |
| 517d4c37-...jpg ("SILVER STAR") | other | **Resolved: 1** (not 4) | Photo actually shows several unrelated fabric samples stacked together; only the bottom one is tagged "SILVER STAR" (a navy/cream/light-blue/olive plaid). Reduced to that 1 confirmed colorway; the other folded layers are a different, unidentified product and were dropped from this entry |
| 6d19171f-...jpg | towel | 9 (kept as-is) | 3x3 grid of striped towels, one design with 9 colorways - verification confirmed all 9 share the same stripe pattern varying only in base color, so treating as 9 colorways of one design holds up; could still be read as 9 separate SKUs if preferred |
| 7624a2c0-...jpg | other | 1 or 2 | Two pieces shown, slightly different plaid layout - one design or two? |
| a3158b6e-...jpg | other | 1 | Two identical pieces of same fabric shown - straightforward, just needs a design number |
| bb73654a-...jpg | other | 1 | Two identical pieces shown - needs a design number |
| befcaed9-...jpg | table_linen | 1 | Two identical pieces shown - needs a design number |
| cd76e872-...jpg | table_linen | 1 | Two identical pieces shown - needs a design number |
| e9fd3907-...jpg | table_linen | 1 | Two identical pieces shown - needs a design number |

### Parked for later (6 photos)

Not lost, just out of scope until someone splits them into individual per-design photos - the
current pipeline assumes one photo = one design (with colorway variants), and these don't fit
that shape:

| Source file | Why parked |
|---|---|
| 1789dc55-...jpg | Duplicate of design 8569 (already being done as the pilot) - no action needed, just don't double-process |
| 166fe617-...jpg | Grid/lookbook photo, ~12 distinct plaid/check designs in one image, not colorways of one design |
| 3aacdb42-...jpg | Same situation, ~10 distinct designs |
| 6839d886-...jpg | Same situation, ~11 distinct "SUN FABB" designs |
| 90f6dc50-...jpg | Warehouse/stock photo, ~10+ distinct bedspread packages, not colorways |
| a84884b7-...jpg | Same situation, ~12 distinct plaid/stripe designs |

To unlock these: someone (a fresh agent or manual work) would need to crop each individual
design out of the grid photo first, effectively turning 1 photo into ~10-12 new single-design
source photos, each of which then enters the normal pipeline from scratch. Worth doing
eventually since it's free colorway data, just a separate task from the current batch.

## Cost notes

Generation for 8569 and the other 50 designs is happening entirely via the free manual/agent
route - no Gemini API spend. The paid-API cost estimates from earlier planning
(~$87 / ~₹8,300 for the 50 designs at the default model mix, ranging down to ~$31 / ~₹2,930 with
Flash-Lite everywhere) are parked as a reference in case the free route ever gets rate-limited
hard enough to be worth supplementing with paid calls - not needed right now.
