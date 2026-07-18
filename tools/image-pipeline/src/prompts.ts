import type { Category } from './types.js';

/**
 * Appended to every generation prompt. Pattern fidelity is the whole game for a
 * textile catalog: the customer buys the design they see.
 */
const FIDELITY_SUFFIX =
  ' Preserve the printed fabric pattern EXACTLY as in the reference: the same motifs, the same' +
  ' colors, the same pattern scale and repeat. Do not redesign, simplify, restyle or recolor' +
  ' the pattern. Photorealistic, professional home-textile catalog photography.';

export const SCAN_PROMPT = `You are analyzing a supplier photo of printed home-textile fabric for a product catalog.

The photo shows either a single fabric, or several colorways (color variants of the same printed design) draped side by side as vertical strips.

Report:
1. designNo: the design/style number if a printed tag or sticker with a number is visible in the photo (digits/letters only, e.g. "8569"), otherwise null.
2. category: what product this fabric most likely is: bedspread, towel, table_linen, napkin, or other.
3. colorways: one entry per distinct colorway visible, left to right. For each:
   - colorName: a short lowercase color name a shopper would use (e.g. "blue", "dusty pink", "sage green", "peach").
   - box2d: the bounding box [yMin, xMin, yMax, xMax] (0-1000 normalized) of a region that contains ONLY that colorway's fabric. Stay well inside the strip: exclude the boundaries with neighboring strips, the background, tables, hands and tags.

Count colorways carefully: strips can be narrow and partially overlapping.`;

export const SWATCH_PROMPT =
  'This is a photo of a draped printed cotton fabric. Recreate it as a clean, flat product' +
  ' swatch: the fabric laid perfectly flat, viewed straight-on, evenly lit with soft diffused' +
  ' light, no wrinkles, folds, shadows or perspective distortion. Ignore any sliver of a' +
  ' different fabric, background or objects at the image edges. The fabric fills the entire' +
  ' frame.' +
  FIDELITY_SUFFIX;

export interface ShotSpec {
  shot: string;
  prompt: string;
}

const SCENE_SETS: Record<Category, ShotSpec[]> = {
  bedspread: [
    {
      shot: 'hero',
      prompt:
        'Using the attached fabric swatch as the exact reference, a queen-size bed dressed in a' +
        ' bedspread made from this exact fabric, with two matching pillow covers. Bright minimal' +
        ' bedroom, warm white walls, light wood floor, soft natural window light from the left.' +
        ' Slightly elevated three-quarter view, 50mm lens, f/4.',
    },
    {
      shot: 'closeup',
      prompt:
        'Using the attached fabric swatch as the exact reference, a close-up of one corner of a' +
        ' bedspread in this exact fabric draped over a mattress edge, showing the print detail' +
        ' and soft cotton texture. Shallow depth of field, soft window light from the left.',
    },
    {
      shot: 'folded',
      prompt:
        'Using the attached fabric swatch as the exact reference, a neatly folded and stacked' +
        ' bedspread in this exact fabric on a light wooden bench against a plain warm-white' +
        ' wall, soft daylight, a small potted plant to one side, minimal styling.',
    },
    {
      shot: 'room',
      prompt:
        'Using the attached fabric swatch as the exact reference, a wide view of a serene' +
        ' bedroom with a full bed dressed in a bedspread of this exact fabric, bedside table' +
        ' with a ceramic lamp, morning light through sheer curtains.',
    },
  ],
  towel: [
    {
      shot: 'hero',
      prompt:
        'Using the attached fabric swatch as the exact reference, a neat stack of three folded' +
        ' towels in this exact fabric on a light stone shelf in a bright modern bathroom, soft' +
        ' natural light, minimal styling.',
    },
    {
      shot: 'hanging',
      prompt:
        'Using the attached fabric swatch as the exact reference, a towel in this exact fabric' +
        ' hanging from a brushed-metal rail beside a white basin, bright airy bathroom, soft' +
        ' daylight.',
    },
    {
      shot: 'rolled',
      prompt:
        'Using the attached fabric swatch as the exact reference, spa-style rolled towels in' +
        ' this exact fabric arranged in a woven basket, warm neutral background, soft daylight.',
    },
    {
      shot: 'closeup',
      prompt:
        'Using the attached fabric swatch as the exact reference, a macro close-up of the towel' +
        ' fabric in this exact print showing the weave texture and hem stitching, shallow depth' +
        ' of field.',
    },
  ],
  table_linen: [
    {
      shot: 'hero',
      prompt:
        'Using the attached fabric swatch as the exact reference, a dining table dressed with a' +
        ' tablecloth in this exact fabric, set with simple white ceramic plates and glassware,' +
        ' bright dining room, soft window light, slightly elevated three-quarter view.',
    },
    {
      shot: 'overhead',
      prompt:
        'Using the attached fabric swatch as the exact reference, an overhead flat-lay of a set' +
        ' dining table with a tablecloth in this exact fabric, white plates, linen napkins and' +
        ' cutlery, soft even daylight.',
    },
    {
      shot: 'closeup',
      prompt:
        'Using the attached fabric swatch as the exact reference, a close-up of the tablecloth' +
        ' edge in this exact fabric draping over the table corner, showing print detail and hem,' +
        ' shallow depth of field.',
    },
    {
      shot: 'folded',
      prompt:
        'Using the attached fabric swatch as the exact reference, folded table linen in this' +
        ' exact fabric stacked on a rustic wooden sideboard with a small vase of flowers, soft' +
        ' daylight.',
    },
  ],
  napkin: [
    {
      shot: 'hero',
      prompt:
        'Using the attached fabric swatch as the exact reference, four napkins in this exact' +
        ' fabric folded on a set dining table beside white ceramic plates, bright natural light,' +
        ' three-quarter view.',
    },
    {
      shot: 'ring',
      prompt:
        'Using the attached fabric swatch as the exact reference, a single napkin in this exact' +
        ' fabric rolled into a brass napkin ring on a white plate, soft window light, shallow' +
        ' depth of field.',
    },
    {
      shot: 'overhead',
      prompt:
        'Using the attached fabric swatch as the exact reference, an overhead flat-lay of' +
        ' napkins in this exact fabric with cutlery and a small sprig of greenery on a linen' +
        ' background, soft even daylight.',
    },
    {
      shot: 'closeup',
      prompt:
        'Using the attached fabric swatch as the exact reference, a macro close-up of the napkin' +
        ' fabric in this exact print showing weave and hem detail.',
    },
  ],
  other: [
    {
      shot: 'hero',
      prompt:
        'Using the attached fabric swatch as the exact reference, this exact fabric elegantly' +
        ' draped over a light wooden display stand in a bright studio, soft natural light,' +
        ' minimal styling, three-quarter view.',
    },
    {
      shot: 'drape',
      prompt:
        'Using the attached fabric swatch as the exact reference, this exact fabric flowing in' +
        ' soft folds across a neutral linen surface, showing how the print looks in natural' +
        ' drape, soft window light.',
    },
    {
      shot: 'folded',
      prompt:
        'Using the attached fabric swatch as the exact reference, this exact fabric neatly' +
        ' folded in a stack on a wooden shelf, warm neutral background, soft daylight.',
    },
    {
      shot: 'closeup',
      prompt:
        'Using the attached fabric swatch as the exact reference, a macro close-up of this exact' +
        ' fabric showing the print detail and weave texture, shallow depth of field.',
    },
  ],
};

export function sceneSetFor(category: Category): ShotSpec[] {
  return SCENE_SETS[category];
}

export function scenePrompt(category: Category, shot: string): string {
  const spec = SCENE_SETS[category].find((s) => s.shot === shot);
  if (!spec) throw new Error(`Unknown shot "${shot}" for category "${category}"`);
  return spec.prompt + FIDELITY_SUFFIX;
}

/** First image part: the finished master scene. Second image part: the target colorway swatch. */
export const SWAP_PROMPT =
  'The first image is a finished catalog photo. The second image is a fabric swatch. Replace' +
  ' the fabric of the textile product in the first image with the exact fabric from the second' +
  ' image. Keep everything else completely unchanged: the same room, furniture, drape folds,' +
  ' lighting, shadows, camera angle and composition. Keep the pattern scale consistent with the' +
  ' first image. Only the printed pattern and its colors change, and they must match the second' +
  ' image exactly.' +
  FIDELITY_SUFFIX;

/** Appended to a retry after QA failure, with the QA notes inlined. */
export function retryNote(qaNotes: string): string {
  return ` A previous attempt failed quality review for this reason: "${qaNotes}". Correct this while keeping everything else consistent.`;
}

export const QA_PROMPT = `You are the quality gate for a home-textile e-commerce catalog. The first image is the reference fabric. The second image is an AI-generated catalog photo that must show a product made of that exact fabric.

Judge ONLY whether the fabric in the generated photo faithfully reproduces the reference:
- motifs: same shapes and details, none invented or dropped
- colors: same hues, no drift
- scale: pattern size plausible for the product shown, repeat not stretched

Also flag rendering artifacts (warped geometry, impossible folds, garbled areas, text or watermarks).

Report fidelityScore 0-10 (10 = indistinguishable pattern; below 7 = a shopper could feel misled), artifacts (true if any defect a shopper would notice), and one or two sentences of notes naming the single worst problem if any.`;
