# Catalog production tracker

**Last verified:** 2026-08-01 (Asia/Kolkata)

Current scope is classification, local image preparation, owner QA, and eventual publication of
the home-textile catalog. Local swatches are reference assets and are intentionally unpublished.
No row may skip a stage or receive guessed commercial metadata.

## Release stages

`classification → crop → generation → owner QA → publication`

- Classification records product type, measured dimensions, construction, exact set contents, and
  source quality. Unresolved or unauthorized rows remain blocked.
- Crop creates isolated source references and must be checked before generation.
- Generation creates one square swatch plus the four canonical scenes (`hero`, `closeup`,
  `folded`, `room`) for each selected product.
- Owner QA checks pattern fidelity, construction, dimensions, set contents, crop contamination,
  swatch aspect ratio (1:1), and scene aspect ratio (4:3).
- Publication requires commercial design number/name, variant size, material lookup value, price,
  and stock. Upload and product creation refuse missing values.

## Production designs

41 numbered production designs are published and active. Their four local swatches remain
unpublished; the numbered designs are:

`8569, 4219, 8525, 8555, 4461, 8470, 4388, 8571, 4221, 8501, 4610, 8563, 4216, 8517, 8496,
8522, 8519, 4592, 4195, 4207, 4603, 4425, 8473, 4337, 8521, 4217, 8479, 4468, 8476, 8511,
8474, 8507, 4210, 8559, 4462, 8481, 8560, 4208, 4607, 8576, 8545`.

## Active demo products

Five non-production demos remain active for storefront and admin development. They are not release
evidence and must not be confused with the numbered production designs:

`UNKNOWN-PLAID1, UNKNOWN-PLAID2, UNKNOWN-PLAID3, UNKNOWN-STRIPE1, UNKNOWN-STRIPE2`.

## Classified 166 grid

Source: `166fe617-de48-4489-8e09-81515a97f1c8.jpg`. The structured inventory in
`classification/unresolved-inventory.json` is authoritative; `classification/unresolved-review.md`
is generated from it. Dimensions for classified candidates are recorded as `60 × 90 in`
(`152.4 × 228.6 cm`). Fibre is unknown unless separately confirmed.

| Positions | Classification | Set contents | Status |
|---|---|---|---|
| R1C1, R1C3 | Single-cot bedspread; woven plaid/check | Bedspread + 1 pillow cover | Classified |
| R1C2 | Already completed | Omit as duplicate | Omitted |
| R1C4, R2C4 | Thick bedsheet, also usable as a bedspread; thick woven textile | Bedsheet only; no pillow cover | Classified |
| R2C1 | Single-cot bedspread; printed textile | Bedspread + 1 pillow cover | Classified |
| R2C2, R2C3, R3C1–R3C4 | Single-cot bedspread; woven textile | Bedspread + 1 pillow cover | Classified |

Candidate IDs are `SC-166F-R1C1` through `SC-166F-R3C4`; the old `SC-166F-SOURCE` identifier
is retired. Eleven candidates are classified and one is the omitted duplicate. Commercial names,
prices, stock, variant size, and material lookup values are still required before publication.

### Authorized local pilots

Only the classified rows listed here receive prep and generated assets. They have not been imported,
uploaded, or used to create products.

| Candidate | Product | Scene family | Local status |
|---|---|---|---|
| `SC-166F-R1C1` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | B | 5/5 generated and centrally reviewed |
| `SC-166F-R1C3` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | A | Parked at 4/5; hero failed 3 repeat-scale retries and is excluded from the canonical set |
| `SC-166F-R1C4` | Thick bedsheet; 60 × 90 in; bedsheet only; zero pillow covers | C | 5/5 generated and centrally reviewed |
| `SC-166F-R2C4` | Thick bedsheet; 60 × 90 in; bedsheet only; zero pillow covers | B | 5/5 generated and centrally reviewed |
| `SC-166F-R2C2` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | C | 5/5 generated and centrally reviewed |
| `SC-166F-R2C3` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | D | 5/5 generated and centrally reviewed |
| `SC-166F-R2C1` | Printed single-cot bedspread; 60 × 90 in; one matching pillow cover | D | Parked at 4/5; room failed 3 repeat-scale retries and is excluded from the canonical set |
| `SC-166F-R3C1` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | B | 5/5 generated and centrally reviewed |
| `SC-166F-R3C2` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | A | 5/5 generated and centrally reviewed; whole swatch repeats at 25% tighter scale with recurring pale bands |
| `SC-166F-R3C3` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | A | 5/5 generated and centrally reviewed |
| `SC-166F-R3C4` | Woven single-cot bedspread; 60 × 90 in; one matching pillow cover | C | 5/5 generated and centrally reviewed |

A complete pilot has one 1:1 swatch and four 4:3 scenes. Local paths are under
`work/swatches/SC-166F-*` and `work/scenes/SC-166F-*`. Owner QA, import, approval, and
publication remain pending. Rejected R3C2 folded and room assets are retained outside the
canonical scene set under `work/rejected/SC-166F-R3C2/source/`; the accepted pre-density-adjustment
revision is preserved under `work/revisions/SC-166F-R3C2/pre-25pct-density-adjustment/`.

### Parked local generation

| Candidate | Accepted assets | Parking reason | Parked path |
|---|---:|---|---|
| `SC-166F-R1C3` | 4/5 | The hero scene retained one whole pattern unit across the mattress top after three targeted retries; the folded and room scenes correctly show about two. | `work/parked/repeat-fidelity/SC-166F-R1C3/source/hero.png` |
| `SC-166F-R2C1` | 4/5 | The room scene retained one whole pattern unit across the bed after three targeted retries; hero scale requires about two. | `work/parked/repeat-fidelity/SC-166F-R2C1/source/room.png` |

## Remaining source work

- Unidentified single-design photos: assign commercial identity and release facts before crop.
- Re-photograph candidates: towel grid, packaged/overlapping items, and any source whose crop or
  dimensions cannot be confirmed from the photo.
- Floral grid, packaged warehouse photos, plaid grids, and stripe grids: split into positional
  candidates first; do not treat unrelated pieces as colorways.
- `4429`: authorization-blocked. Do not regenerate, alter the moderation workflow, or publish
  until an authorized alternative is supplied.

## Safety gates

- Classification, dimensions, construction, exact set contents, source quality, and `ready`
  status are required before prep or generation.
- Publication additionally requires commercial design number/name, variant size, material lookup,
  price, and stock. Missing values fail closed; no defaults are allowed.
- Never upload, call Cloudinary, or create products during local pilot generation.
