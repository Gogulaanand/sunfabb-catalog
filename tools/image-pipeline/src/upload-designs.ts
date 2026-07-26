/**
 * Uploads QA-signed-off design scenes to Cloudinary and registers them as
 * catalog products in the backend.
 *
 *   npx tsx src/upload-designs.ts --token-file <path> [--api <url>] [--dry-run] <design_id>...
 *
 * Conventions here are derived from the three designs already live (8569,
 * 4219, 8525), not from the skill doc, which had drifted. Re-read a live
 * product before changing any of them.
 */
import 'dotenv/config';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

const SCENES_ROOT = resolve(import.meta.dirname, '../work/scenes');
const DEFAULT_API = 'https://sunfabb-backend.onrender.com';

/** Gallery order. Index is the sort_order; the filename prefix mirrors it. */
const SCENE_ORDER = ['hero', 'closeup', 'folded', 'room'] as const;

const PRICE_PAISE = 149_900; // ₹1,499
const STOCK = 10;
const SIZE = 'King';
const MATERIAL = 'Cotton';

/**
 * Canonical swatch colours for lookup rows the DB is missing. These are the
 * filter facet, not a per-design pixel sample: one "Maroon" has to stand in
 * for every design's maroon, so they are chosen to read correctly as a small
 * dot next to a colour name. Editable later in the admin UI.
 */
const PALETTE: Record<string, string> = {
  beige: '#D9C7A7',
  'blue-grey': '#7A8CA3',
  brown: '#6B4A32',
  burgundy: '#6E1F2E',
  copper: '#B4703A',
  cream: '#F3EBDD',
  'dark-grey': '#4A4A4A',
  'grey-blue': '#8296A8',
  'hot-pink': '#E0457B',
  'light-blue': '#A8C6E0',
  maroon: '#7B2D3B',
  olive: '#7A7B3F',
  'olive-brown': '#6E6238',
  orange: '#E07B39',
  'orange-red': '#D9482B',
  purple: '#6B4C9A',
  red: '#B3282D',
  salmon: '#F0917C',
  seafoam: '#8FC7B5',
  'slate-blue': '#5E6E8C',
  tan: '#C89F6E',
  taupe: '#A79383',
  teal: '#2C7A7B',
  terracotta: '#C25B3E',
  yellow: '#E3B33C',
};

interface Args {
  designs: string[];
  tokenFile: string;
  api: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
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
  if (!dryRun && !tokenFile) throw new Error('--token-file is required unless --dry-run');
  return { designs, tokenFile, api, dryRun };
}

/** Title-cases a folder name into the DB's colour naming (`slate-blue` -> `Slate Blue`). */
function toColorName(folder: string): string {
  return folder
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[\s-]+/g, '-');
}

/** Reads the colourways and scenes actually present on disk for a design. */
function readDesign(designId: string) {
  const dir = join(SCENES_ROOT, designId);
  if (!existsSync(dir)) throw new Error(`no scenes folder for design ${designId} at ${dir}`);

  const colors = readdirSync(dir)
    .filter((entry) => !entry.startsWith('.') && statSync(join(dir, entry)).isDirectory())
    .sort();
  if (!colors.length) throw new Error(`design ${designId} has no colourway folders`);

  return colors.map((color) => {
    const files = readdirSync(join(dir, color)).filter((f) => f.endsWith('.png'));
    // Derive from what is present rather than assuming all four scenes exist,
    // but keep the canonical gallery order for those that do.
    const scenes = SCENE_ORDER.filter((scene) => files.includes(`${scene}.png`));
    const unknown = files.filter(
      (f) => !SCENE_ORDER.includes(f.replace('.png', '') as (typeof SCENE_ORDER)[number]),
    );
    if (unknown.length) throw new Error(`design ${designId}/${color}: unrecognised scenes ${unknown.join(', ')}`);
    if (!scenes.length) throw new Error(`design ${designId}/${color} has no scene images`);
    return { color, scenes };
  });
}

class Api {
  constructor(
    private readonly base: string,
    private readonly token: string,
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
    }
    return (await res.json()) as T;
  }
}

interface Lookup {
  id: string;
  name: string;
}

/**
 * Resolves Cloudinary credentials, falling back to `backend/.env` when the
 * pipeline's own `.env` leaves them blank - which is the documented default
 * there, so the keys exist but are empty strings rather than absent. Treating
 * empty as unset is the whole point; `??` would happily hand back "".
 */
function cloudinaryCredentials(): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} {
  const KEYS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
  const resolved: Record<string, string> = {};

  for (const key of KEYS) {
    resolved[key] = (process.env[key] ?? '').trim();
  }

  if (KEYS.some((key) => !resolved[key])) {
    const backendEnv = resolve(import.meta.dirname, '../../../backend/.env');
    if (existsSync(backendEnv)) {
      for (const line of readFileSync(backendEnv, 'utf8').split('\n')) {
        const match = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line);
        if (!match) continue;
        const key = match[1];
        const rawValue = match[2];
        if (key === undefined || rawValue === undefined) continue;
        if (!KEYS.includes(key as (typeof KEYS)[number]) || resolved[key]) continue;
        resolved[key] = rawValue.trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  const stillMissing = KEYS.filter((key) => !resolved[key]);
  if (stillMissing.length) {
    throw new Error(
      `missing Cloudinary credentials: ${stillMissing.join(', ')} - set them in ` +
        `tools/image-pipeline/.env or backend/.env`,
    );
  }

  return {
    cloud_name: resolved.CLOUDINARY_CLOUD_NAME ?? '',
    api_key: resolved.CLOUDINARY_API_KEY ?? '',
    api_secret: resolved.CLOUDINARY_API_SECRET ?? '',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const token = args.dryRun ? '' : readFileSync(args.tokenFile, 'utf8').trim();
  if (!args.dryRun && !token) {
    throw new Error(
      `token file ${args.tokenFile} is empty - re-run the login block in a real terminal`,
    );
  }

  const api = new Api(args.api, token);

  // Read the design folders up front so a missing scene aborts before any write.
  const designs = args.designs.map((id) => ({ id, colorways: readDesign(id) }));
  const usedColors = new Set(designs.flatMap((d) => d.colorways.map((c) => c.color)));

  const [categories, materials] = await Promise.all([
    api.get<Lookup[]>('/categories'),
    api.get<Lookup[]>('/materials'),
  ]);
  let colors = await api.get<Lookup[]>('/colors');

  const category = categories.find((c) => c.name === 'Bedspreads');
  if (!category) throw new Error('category "Bedspreads" not found');
  const material = materials.find((m) => m.name === MATERIAL);
  if (!material) throw new Error(`material "${MATERIAL}" not found`);

  // --- Colours -----------------------------------------------------------
  const byNormalizedName = () => new Map(colors.map((c) => [normalize(c.name), c]));
  const missing = [...usedColors].filter((folder) => !byNormalizedName().has(normalize(folder))).sort();

  if (missing.length) {
    const unpriced = missing.filter((folder) => !PALETTE[folder]);
    if (unpriced.length) {
      throw new Error(`no canonical hex defined for: ${unpriced.join(', ')} - add them to PALETTE`);
    }
    console.log(`creating ${missing.length} missing colour(s): ${missing.join(', ')}`);
    for (const folder of missing) {
      if (args.dryRun) {
        console.log(`  [dry-run] would create ${toColorName(folder)} ${PALETTE[folder]}`);
        continue;
      }
      const created = await api.post<Lookup>('/colors', {
        name: toColorName(folder),
        hex_code: PALETTE[folder],
      });
      console.log(`  created ${created.name}`);
    }
    if (!args.dryRun) colors = await api.get<Lookup[]>('/colors');
  }

  const colorIndex = byNormalizedName();

  // --- Cloudinary --------------------------------------------------------
  const credentials = cloudinaryCredentials();
  cloudinary.config({ ...credentials, secure: true });
  // Fail before touching the filesystem or the API: an unauthenticated upload
  // returns a confusing 404 on /v1_1//ping rather than a credentials error.
  await cloudinary.api.ping();

  const report: unknown[] = [];

  for (const design of designs) {
    const slug = `bedspread-design-${design.id}`;
    console.log(`\n=== design ${design.id} (${design.colorways.length} colourways) ===`);

    // A rerun after a partial failure must not create a second product row.
    const existing = await fetch(`${args.api}/products/${slug}`);
    if (existing.ok) {
      console.log(`  skipped: ${slug} already exists`);
      continue;
    }

    const uploaded: { color: string; scene: string; url: string; publicId: string; order: number }[] = [];

    for (const { color, scenes } of design.colorways) {
      for (const scene of scenes) {
        const order = SCENE_ORDER.indexOf(scene);
        const publicId = `sunfabb/products/${design.id}/${color}/${String(order + 1).padStart(2, '0')}-${scene}`;
        const file = join(SCENES_ROOT, design.id, color, `${scene}.png`);

        if (args.dryRun) {
          console.log(`  [dry-run] would upload ${publicId}`);
          uploaded.push({ color, scene, url: `dry-run://${publicId}`, publicId, order });
          continue;
        }

        const res = await cloudinary.uploader.upload(file, {
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
        });
        console.log(`  uploaded ${publicId}`);
        uploaded.push({ color, scene, url: res.secure_url, publicId: res.public_id, order });
      }
    }

    if (args.dryRun) {
      report.push({ design: design.id, slug, images: uploaded.length, dryRun: true });
      continue;
    }

    const product = await api.post<{ id: string }>('/products', {
      name: `Bedspread Design ${design.id}`,
      slug,
      category_id: category.id,
      description:
        `Printed cotton bedspread design ${design.id}, available in ` +
        `${design.colorways.length} colourways. Colour and product details can be refined in the admin catalog.`,
      care_instructions:
        'Machine wash separately in cold water. Do not bleach. Tumble dry low and iron on the reverse side.',
    });
    console.log(`  product ${product.id}`);

    const variantByColor = new Map<string, string>();
    for (const { color } of design.colorways) {
      const lookup = colorIndex.get(normalize(color));
      if (!lookup) throw new Error(`colour ${color} still missing after creation step`);

      const variant = await api.post<{ id: string }>(`/products/${product.id}/variants`, {
        color_id: lookup.id,
        material_id: material.id,
        size: SIZE,
        price: PRICE_PAISE,
        stock_quantity: STOCK,
        sku: `BEDSPREAD-${design.id}-${color.toUpperCase().replace(/-/g, '-')}`,
      });
      variantByColor.set(color, variant.id);
      console.log(`  variant ${lookup.name} -> ${variant.id}`);
    }

    // Only the very first colourway's hero is primary; it is the catalog card
    // image for unfiltered views.
    let primaryAssigned = false;
    for (const image of uploaded) {
      const isPrimary = !primaryAssigned && image.scene === 'hero';
      if (isPrimary) primaryAssigned = true;

      await api.post(`/products/${product.id}/images`, {
        url: image.url,
        public_id: image.publicId,
        variant_id: variantByColor.get(image.color),
        image_role: 'GALLERY',
        sort_order: image.order,
        is_primary: isPrimary,
        alt_text: `Bedspread design ${design.id} in ${image.color.replace(/-/g, ' ')} - ${image.scene}`,
      });
    }
    console.log(`  attached ${uploaded.length} images`);

    report.push({ design: design.id, slug, productId: product.id, images: uploaded.length });
  }

  console.log(`\n${JSON.stringify(report, null, 2)}`);
}

main().catch((error: unknown) => {
  // The Cloudinary SDK rejects with a plain object, not an Error, so
  // String(error) would flatten a real diagnostic into "[object Object]".
  const detail =
    error instanceof Error ? error.stack ?? error.message : JSON.stringify(error, null, 2);
  console.error(`\nFAILED: ${detail}`);
  process.exitCode = 1;
});
