import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCENES_DIR } from './config.js';
import type { ProductType } from './types.js';

export const DEFAULT_API = 'https://sunfabb-backend.onrender.com';
export const SCENE_ORDER = ['hero', 'closeup', 'folded', 'room'] as const;
export type Scene = (typeof SCENE_ORDER)[number];

export interface Args {
  designs: string[];
  tokenFile: string;
  api: string;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): Args {
  const designs: string[] = [];
  let tokenFile = '';
  let api = DEFAULT_API;
  let dryRun = false;
  const requireValue = (flag: string, value: string | undefined): string => {
    if (value === undefined) throw new Error(`${flag} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--token-file') tokenFile = requireValue(arg, argv[++i]);
    else if (arg === '--api') api = requireValue(arg, argv[++i]);
    else if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--')) throw new Error(`unknown flag: ${arg}`);
    else designs.push(arg);
  }
  if (!designs.length) throw new Error('pass at least one design id');
  if (new Set(designs).size !== designs.length) {
    throw new Error('design ids must be unique');
  }
  if (!dryRun && !tokenFile) {
    throw new Error('--token-file is required unless --dry-run');
  }
  return { designs, tokenFile, api: api.replace(/\/$/, ''), dryRun };
}

export function toColorName(folder: string): string {
  return folder
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalize(name: string): string {
  return name.toLowerCase().replace(/[\s-]+/g, '-');
}

export interface DesignInput {
  id: string;
  colorways: { color: string; scenes: Scene[] }[];
}

/** Read a complete canonical scene set before any API or Cloudinary write. */
export function readDesign(designId: string): DesignInput {
  const dir = join(SCENES_DIR, designId);
  if (!existsSync(dir)) {
    throw new Error(`no scenes folder for design ${designId} at ${dir}`);
  }
  const colors = readdirSync(dir)
    .filter(
      (entry) =>
        !entry.startsWith('.') && statSync(join(dir, entry)).isDirectory(),
    )
    .sort();
  if (!colors.length) throw new Error(`design ${designId} has no colourway folders`);
  return {
    id: designId,
    colorways: colors.map((color) => {
      const files = readdirSync(join(dir, color)).filter((file) =>
        file.endsWith('.png'),
      );
      const unknown = files.filter(
        (file) => !SCENE_ORDER.includes(file.replace('.png', '') as Scene),
      );
      if (unknown.length) {
        throw new Error(
          `design ${designId}/${color}: unrecognised scenes ${unknown.join(', ')}`,
        );
      }
      const missing = SCENE_ORDER.filter(
        (scene) => !files.includes(`${scene}.png`),
      );
      if (missing.length) {
        throw new Error(
          `design ${designId}/${color}: missing canonical scenes ${missing.join(', ')}`,
        );
      }
      return { color, scenes: [...SCENE_ORDER] };
    }),
  };
}

export function categoryName(
  productType: Exclude<ProductType, 'unknown'>,
): string {
  return productType === 'bedsheet'
    ? 'Bedsheets'
    : productType === 'blanket'
      ? 'Blankets'
      : 'Bedspreads';
}

export function skuFor(
  productType: Exclude<ProductType, 'unknown'>,
  designNo: string,
  color: string,
): string {
  return `${productType.toUpperCase()}-${designNo}-${color.toUpperCase()}`;
}

export function publicIdFor(
  folder: string,
  designNo: string,
  color: string,
  scene: Scene,
): string {
  return `${folder}/products/${designNo}/${color}/${String(SCENE_ORDER.indexOf(scene) + 1).padStart(2, '0')}-${scene}`;
}

export interface ExpectedImage {
  color: string;
  scene: Scene;
  publicId: string;
  order: number;
  file: string;
  primary: boolean;
}

export function expectedImages(
  folder: string,
  design: DesignInput,
  designNo: string,
): ExpectedImage[] {
  const images: ExpectedImage[] = [];
  for (const colorway of design.colorways) {
    for (const scene of SCENE_ORDER) {
      images.push({
        color: colorway.color,
        scene,
        publicId: publicIdFor(folder, designNo, colorway.color, scene),
        order: SCENE_ORDER.indexOf(scene),
        file: join(SCENES_DIR, design.id, colorway.color, `${scene}.png`),
        primary: images.length === 0 && scene === 'hero',
      });
    }
  }
  return images;
}
