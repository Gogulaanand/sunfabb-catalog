import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import { CROPS_DIR, INPUT_DIR } from '../config.js';
import { activeItems, loadManifest } from '../state.js';
import type { Box } from '../types.js';
import { ensureDir } from '../util.js';

export function cropFileName(designNo: string, color: string): string {
  return `${designNo}-${color}.jpg`;
}

/** Clamp a (possibly hand-edited) manifest box to the actual image bounds. */
function clampBox(box: Box, width: number, height: number): Box {
  const x = Math.min(Math.max(0, box.x), width - 16);
  const y = Math.min(Math.max(0, box.y), height - 16);
  return {
    x,
    y,
    w: Math.min(box.w, width - x),
    h: Math.min(box.h, height - y),
  };
}

export async function runCrop(options: { force?: boolean } = {}): Promise<void> {
  const manifest = loadManifest();
  const items = activeItems(manifest);
  if (items.length === 0) {
    console.log('Manifest is empty. Run: npm run pipeline -- scan');
    return;
  }
  ensureDir(CROPS_DIR);

  let written = 0;
  let skipped = 0;
  for (const item of items) {
    const sourcePath = path.join(INPUT_DIR, item.source);
    const meta = await sharp(sourcePath).metadata();
    for (const colorway of item.colorways) {
      const outPath = path.join(CROPS_DIR, cropFileName(item.designNo, colorway.color));
      if (fs.existsSync(outPath) && !options.force) {
        skipped += 1;
        continue;
      }
      const box = clampBox(colorway.box, meta.width as number, meta.height as number);
      await sharp(sourcePath)
        .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
        .jpeg({ quality: 92 })
        .toFile(outPath);
      written += 1;
    }
  }
  console.log(`Crops: ${written} written, ${skipped} already present, in ${CROPS_DIR}`);
  console.log('Eyeball them quickly: each crop must contain ONLY its own colorway.');
  console.log('If one is wrong, edit its "box" in work/manifest.json and rerun with --force.');
}
