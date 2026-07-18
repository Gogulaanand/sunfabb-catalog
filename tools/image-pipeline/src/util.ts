import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function listInputImages(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort();
}

export function mimeTypeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

export async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return answer.trim().toLowerCase().startsWith('y');
  } finally {
    rl.close();
  }
}

/** Run tasks with a fixed concurrency limit; collects errors instead of aborting the batch. */
export async function runLimited<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<{ ok: number; failed: { item: T; error: Error }[] }> {
  const queue = [...items];
  const failed: { item: T; error: Error }[] = [];
  let ok = 0;
  const lanes = Array.from({ length: Math.max(1, limit) }, async () => {
    for (;;) {
      const item = queue.shift();
      if (item === undefined) return;
      try {
        await worker(item);
        ok += 1;
      } catch (error) {
        failed.push({ item, error: error instanceof Error ? error : new Error(String(error)) });
      }
    }
  });
  await Promise.all(lanes);
  return { ok, failed };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cloudinary public id for a catalog image, e.g. sunfabb/products/8569/blue/01-hero */
export function buildPublicId(
  folder: string,
  designNo: string,
  color: string,
  shot: string,
  shotIndex: number,
): string {
  const suffix = shot === 'swatch' ? 'swatch' : `${String(shotIndex).padStart(2, '0')}-${shot}`;
  return `${folder}/products/${designNo}/${color}/${suffix}`;
}
