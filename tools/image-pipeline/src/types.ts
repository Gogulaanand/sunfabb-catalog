import { z } from 'zod';

/** Pixel-space crop box on the original source photo. */
export const BoxSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(16),
  h: z.number().int().min(16),
});
export type Box = z.infer<typeof BoxSchema>;

export const CATEGORIES = ['bedspread', 'towel', 'table_linen', 'napkin', 'other'] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

/** Lowercase kebab-case slug, e.g. "dusty-pink". */
export const SlugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const ColorwaySchema = z.object({
  color: SlugSchema,
  box: BoxSchema,
});
export type Colorway = z.infer<typeof ColorwaySchema>;

export const ManifestItemSchema = z.object({
  source: z.string().min(1),
  designNo: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/),
  category: CategorySchema,
  /** Set true in Checkpoint A to exclude a photo from all later stages. */
  skip: z.boolean().optional(),
  colorways: z.array(ColorwaySchema).min(1),
});
export type ManifestItem = z.infer<typeof ManifestItemSchema>;

export const ManifestSchema = z.object({
  items: z.array(ManifestItemSchema),
});
export type Manifest = z.infer<typeof ManifestSchema>;

/** What the scan model returns for one photo (validated at the API boundary). */
export const ScanResultSchema = z.object({
  designNo: z.string().nullable(),
  category: CategorySchema,
  colorways: z
    .array(
      z.object({
        colorName: z.string().min(1),
        /** [yMin, xMin, yMax, xMax] normalized to 0-1000, Gemini's box convention. */
        box2d: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      }),
    )
    .min(1),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

/** What the QA model returns for one generated image. */
export const QaResultSchema = z.object({
  fidelityScore: z.number().min(0).max(10),
  artifacts: z.boolean(),
  notes: z.string(),
});
export type QaResult = z.infer<typeof QaResultSchema>;

export const ARTIFACT_STATUSES = [
  'generated',
  'qa_passed',
  'qa_failed',
  'approved',
  'rejected',
  'uploaded',
] as const;
export const ArtifactStatusSchema = z.enum(ARTIFACT_STATUSES);
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;

export const ArtifactSchema = z.object({
  key: z.string(),
  designNo: z.string(),
  color: SlugSchema,
  /** "swatch" or a scene shot id like "hero". */
  shot: z.string(),
  /** Path relative to the workspace work/ dir. */
  file: z.string(),
  status: ArtifactStatusSchema,
  attempts: z.number().int().min(1),
  fidelity: z.number().optional(),
  qaNotes: z.string().optional(),
  publicId: z.string().optional(),
  url: z.string().optional(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const StateSchema = z.object({
  artifacts: z.record(z.string(), ArtifactSchema),
});
export type State = z.infer<typeof StateSchema>;

export function artifactKey(designNo: string, color: string, shot: string): string {
  return `${designNo}/${color}/${shot}`;
}

/**
 * Convert a Gemini box_2d ([yMin, xMin, yMax, xMax], 0-1000 normalized) into a
 * pixel crop box on the original image, inset on every side so slivers of the
 * neighboring colorway strips stay out of the crop.
 */
export function box2dToPixels(
  box2d: [number, number, number, number],
  imageWidth: number,
  imageHeight: number,
  insetFraction = 0.06,
): Box {
  const [yMin, xMin, yMax, xMax] = box2d;
  let x = (xMin / 1000) * imageWidth;
  let y = (yMin / 1000) * imageHeight;
  let w = ((xMax - xMin) / 1000) * imageWidth;
  let h = ((yMax - yMin) / 1000) * imageHeight;

  const insetX = w * insetFraction;
  const insetY = h * insetFraction;
  x += insetX;
  y += insetY;
  w -= insetX * 2;
  h -= insetY * 2;

  x = Math.max(0, Math.round(x));
  y = Math.max(0, Math.round(y));
  w = Math.max(16, Math.round(Math.min(w, imageWidth - x)));
  h = Math.max(16, Math.round(Math.min(h, imageHeight - y)));
  return { x, y, w, h };
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed'
  );
}
