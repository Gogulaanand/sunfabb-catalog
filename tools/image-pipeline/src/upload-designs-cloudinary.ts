import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { ApiContractError } from './upload-designs-errors.js';
import type { ExpectedImage } from './upload-designs-input.js';

/** Canonical lookup colours. These are filter swatches, not inferred fibre facts. */
export const PALETTE: Record<string, string> = {
  beige: '#D9C7A7',
  'blue-grey-stripe': '#66788A',
  'blue-mint': '#78AFA8',
  'blue-red': '#6A5370',
  'blue-tan': '#8B8074',
  'blue-white-plaid': '#8CA5B8',
  'blue-grey': '#7A8CA3',
  brown: '#6B4A32',
  'brown-coral': '#9B6250',
  burgundy: '#6E1F2E',
  'burgundy-grey': '#735762',
  'burgundy-pink': '#A64F6B',
  'charcoal-coral': '#805D59',
  'charcoal-white': '#777674',
  copper: '#B4703A',
  'coral-black': '#8A4B43',
  'coral-red': '#C04E45',
  'coral-sage': '#A17A68',
  cream: '#F3EBDD',
  'dark-grey': '#4A4A4A',
  'dusty-pink-grey': '#9A7F87',
  'emerald-brown': '#426052',
  'green-coral-stripe': '#708064',
  'grey-blue': '#8296A8',
  'grey-navy': '#566071',
  'hot-pink': '#E0457B',
  'light-blue': '#A8C6E0',
  'magenta-cream': '#B67591',
  maroon: '#7B2D3B',
  multicolour: '#8B6F75',
  'multicolour-plaid': '#81746E',
  'navy-ochre-stripe': '#71623D',
  'ochre-forest': '#777037',
  'ochre-grey-plaid': '#93846B',
  'ochre-plum': '#8C5E55',
  'ochre-purple': '#8B6370',
  olive: '#7A7B3F',
  'olive-brown': '#6E6238',
  orange: '#E07B39',
  'orange-red': '#D9482B',
  'pink-black': '#8E596B',
  'pink-black-stripe': '#875764',
  'pink-forest': '#7A6C65',
  purple: '#6B4C9A',
  red: '#B3282D',
  'red-black': '#711F25',
  'red-navy': '#622F43',
  'rose-burgundy': '#A04E67',
  'rose-olive-stripe': '#87705F',
  'sage-navy': '#66756F',
  salmon: '#F0917C',
  seafoam: '#8FC7B5',
  'sky-blue': '#87B8D7',
  'slate-blue': '#5E6E8C',
  tan: '#C89F6E',
  taupe: '#A79383',
  teal: '#2C7A7B',
  terracotta: '#C25B3E',
  yellow: '#E3B33C',
};

export function cloudinaryCredentials(): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} {
  const keys = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ] as const;
  const resolved: Record<string, string> = {};
  for (const key of keys) resolved[key] = (process.env[key] ?? '').trim();
  if (keys.some((key) => !resolved[key])) {
    const backendEnv = resolve(import.meta.dirname, '../../../backend/.env');
    if (existsSync(backendEnv)) {
      for (const line of readFileSync(backendEnv, 'utf8').split('\n')) {
        const match = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line);
        if (!match?.[1] || !match[2]) continue;
        const key = match[1];
        if (!keys.includes(key as (typeof keys)[number]) || resolved[key]) {
          continue;
        }
        resolved[key] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  const missing = keys.filter((key) => !resolved[key]);
  if (missing.length) {
    throw new Error(`missing Cloudinary credentials: ${missing.join(', ')}`);
  }
  return {
    cloud_name: resolved.CLOUDINARY_CLOUD_NAME!,
    api_key: resolved.CLOUDINARY_API_KEY!,
    api_secret: resolved.CLOUDINARY_API_SECRET!,
  };
}

const CloudinaryUploadSchema = z.object({
  secure_url: z.string().min(1),
  public_id: z.string().min(1),
});

export async function configureCloudinary(): Promise<void> {
  cloudinary.config({ ...cloudinaryCredentials(), secure: true });
  await cloudinary.api.ping();
}

export async function uploadAssets(
  all: ExpectedImage[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (const image of all) {
    const result = CloudinaryUploadSchema.parse(
      await cloudinary.uploader.upload(image.file, {
        public_id: image.publicId,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
      }),
    );
    if (result.public_id !== image.publicId) {
      throw new ApiContractError(
        `Cloudinary returned ${result.public_id} for requested ${image.publicId}`,
      );
    }
    urls.set(image.publicId, result.secure_url);
  }
  return urls;
}
