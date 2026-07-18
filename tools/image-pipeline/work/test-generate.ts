// One-off CLI test: generate a single image with a chosen model, to compare
// quality/cost before committing a model choice in pipeline.config.json.
// Not part of the pipeline itself - safe to delete any time.
//
// Usage:
//   npx tsx work/test-generate.ts <model>
//
// Examples:
//   npx tsx work/test-generate.ts gemini-3-pro-image-preview   (current default, $0.134/image)
//   npx tsx work/test-generate.ts gemini-3.1-flash-image        ($0.067/image)
//   npx tsx work/test-generate.ts gemini-3.1-flash-lite-image   ($0.0336/image)

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../src/gemini.js';
import { ROOT } from '../src/config.js';

const PRICE: Record<string, number> = {
  'gemini-3-pro-image-preview': 0.134,
  'gemini-3.1-flash-image': 0.067,
  'gemini-3.1-flash-lite-image': 0.0336,
};

async function main() {
  const model = process.argv[2];
  if (!model) {
    console.error('Usage: npx tsx work/test-generate.ts <model>');
    console.error('Known models: ' + Object.keys(PRICE).join(', '));
    process.exit(1);
  }

  // Step 2 of 8569-steps.md - swatch: 8569/pink - not generated yet.
  const inputPath = path.join(ROOT, 'work', 'crops', '8569-pink.jpg');
  const prompt =
    'This is a photo of a draped printed cotton fabric. Recreate it as a clean, flat product' +
    ' swatch: the fabric laid perfectly flat, viewed straight-on, evenly lit with soft diffused' +
    ' light, no wrinkles, folds, shadows or perspective distortion. Ignore any sliver of a' +
    ' different fabric, background or objects at the image edges. The fabric fills the entire' +
    ' frame. Preserve the printed fabric pattern EXACTLY as in the reference: the same motifs,' +
    ' the same colors, the same pattern scale and repeat. Do not redesign, simplify, restyle or' +
    ' recolor the pattern. Photorealistic, professional home-textile catalog photography.' +
    ' Square 1:1 aspect ratio.';

  const price = PRICE[model];
  console.log(`Model: ${model}`);
  console.log(`Estimated cost: ${price !== undefined ? `$${price.toFixed(4)}` : 'unknown (not in local price table - check pricing page)'}`);
  console.log(`Input: ${inputPath}`);
  console.log('Generating...');

  const gemini = new GeminiClient();
  const imageData = fs.readFileSync(inputPath);
  const result = await gemini.generateImage({
    model,
    prompt,
    images: [{ data: imageData, mimeType: 'image/jpeg' }],
    imageSize: '1K',
    label: `test ${model}`,
  });

  const outDir = path.join(ROOT, 'work', 'test-output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${model}-8569-pink-swatch.png`);
  fs.writeFileSync(outPath, result);
  console.log(`Saved: ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
