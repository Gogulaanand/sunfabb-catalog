import * as path from 'node:path';
import sharp from 'sharp';
import { INPUT_DIR } from '../config.js';
import { GeminiClient } from '../gemini.js';
import { SCAN_PROMPT } from '../prompts.js';
import { activeItems, loadManifest, saveManifest } from '../state.js';
import { CATEGORIES, ScanResultSchema, box2dToPixels, slugify, type ManifestItem } from '../types.js';
import { listInputImages, sleep } from '../util.js';
import type { PipelineConfig } from '../config.js';

const SCAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    designNo: { type: ['string', 'null'] },
    category: { type: 'string', enum: [...CATEGORIES] },
    colorways: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          colorName: { type: 'string' },
          box2d: { type: 'array', items: { type: 'number' }, minItems: 4, maxItems: 4 },
        },
        required: ['colorName', 'box2d'],
      },
    },
  },
  required: ['designNo', 'category', 'colorways'],
};

function designNoFromFilename(file: string): string {
  const base = slugify(path.basename(file, path.extname(file)));
  return /^[a-z0-9]/.test(base) ? base : `design-${base}`;
}

function dedupeColors(colors: string[]): string[] {
  const seen = new Map<string, number>();
  return colors.map((color) => {
    const count = (seen.get(color) ?? 0) + 1;
    seen.set(color, count);
    return count === 1 ? color : `${color}-${count}`;
  });
}

export async function runScan(config: PipelineConfig): Promise<void> {
  const files = listInputImages(INPUT_DIR);
  if (files.length === 0) {
    console.log(`No images found. Drop your source photos (.jpg/.png/.webp) into ${INPUT_DIR}`);
    return;
  }

  const gemini = new GeminiClient();
  const manifest = loadManifest();
  const known = new Set(manifest.items.map((item) => item.source));
  const pending = files.filter((f) => !known.has(f));
  console.log(`Scanning ${pending.length} new photo(s) of ${files.length} in input/ ...`);

  for (const file of pending) {
    const absPath = path.join(INPUT_DIR, file);
    const meta = await sharp(absPath).metadata();
    if (!meta.width || !meta.height) throw new Error(`${file}: could not read image dimensions`);

    // Downscale for the API call: cheaper, faster, and plenty for box detection.
    const scanJpeg = await sharp(absPath)
      .resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const result = await gemini.analyzeJson({
      model: config.models.analysis,
      prompt: SCAN_PROMPT,
      images: [{ data: scanJpeg, mimeType: 'image/jpeg' }],
      jsonSchema: SCAN_JSON_SCHEMA,
      zodSchema: ScanResultSchema,
      label: `scan ${file}`,
    });

    const colors = dedupeColors(result.colorways.map((c) => slugify(c.colorName)));
    const item: ManifestItem = {
      source: file,
      designNo: result.designNo?.trim() || designNoFromFilename(file),
      category: result.category,
      colorways: result.colorways.map((colorway, i) => ({
        color: colors[i] as string,
        box: box2dToPixels(colorway.box2d, meta.width as number, meta.height as number),
      })),
    };
    manifest.items.push(item);
    saveManifest(manifest);
    console.log(
      `  ${file}: design ${item.designNo}, ${item.category}, ` +
        `${item.colorways.length} colorway(s): ${colors.join(', ')}`,
    );
    await sleep(500); // stay friendly with free-tier rate limits
  }

  const total = activeItems(manifest);
  const colorways = total.reduce((n, item) => n + item.colorways.length, 0);
  console.log(`\nManifest: ${total.length} design(s), ${colorways} colorway(s) total.`);
  console.log('\nCheckpoint A - review work/manifest.json before generating:');
  console.log('  - fix any misread design numbers or color names');
  console.log('  - fix any wrong category (bedspread | towel | table_linen | napkin | other)');
  console.log('  - set "skip": true on photos to exclude');
  console.log('Then run: npm run pipeline -- crop   (to verify the colorway crops visually)');
}
