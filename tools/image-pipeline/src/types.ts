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

export const PRODUCT_TYPES = ['bedspread', 'bedsheet', 'blanket', 'unknown'] as const;
export const ProductTypeSchema = z.enum(PRODUCT_TYPES);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const CLASSIFICATION_STATUSES = [
  'unclassified',
  'ready',
  're-photograph',
  'identification-pending',
  'duplicate',
  'authorization-blocked',
] as const;
export const ClassificationStatusSchema = z.enum(CLASSIFICATION_STATUSES);
export type ClassificationStatus = z.infer<typeof ClassificationStatusSchema>;

export const CropQualitySchema = z.enum(['accepted', 're-photograph', 'not-reviewed']);
export type CropQuality = z.infer<typeof CropQualitySchema>;

export const SetContentsSchema = z.object({
  pieces: z.array(z.string().trim().min(1)).min(1),
  pillowCoverCount: z.number().int().min(0),
});

const OptionalCommercialCopy = z.string().trim().min(1).nullable().optional();

/** Classification and owner-recorded release facts. No commercial defaults belong here. */
export const ReleaseMetadataSchema = z.object({
  productType: ProductTypeSchema,
  measuredWidthCm: z.number().positive().nullable(),
  measuredLengthCm: z.number().positive().nullable(),
  materialConstruction: z.string().trim().min(1).nullable(),
  setContents: SetContentsSchema.nullable(),
  sourceQuality: CropQualitySchema,
  classificationStatus: ClassificationStatusSchema,
  commercialDesignNo: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/).nullable(),
  commercialName: z.string().trim().min(1).nullable(),
  variantSize: z.string().trim().min(1).nullable(),
  materialName: z.string().trim().min(1).nullable(),
  pricePaise: z.number().int().positive().nullable(),
  stockQuantity: z.number().int().positive().nullable(),
  /** Explicit owner-approved public copy; optional in classification files, required to publish. */
  description: OptionalCommercialCopy,
  careInstructions: OptionalCommercialCopy,
  notes: z.string().optional(),
});
export type ReleaseMetadata = z.infer<typeof ReleaseMetadataSchema>;

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
  release: ReleaseMetadataSchema.optional(),
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

export function classificationReadinessIssues(item: ManifestItem): string[] {
  const release = item.release;
  if (!release) return ['missing release classification'];
  const issues: string[] = [];
  if (release.productType === 'unknown') issues.push('product type is unknown');
  if (release.measuredWidthCm === null || release.measuredLengthCm === null) {
    issues.push('dimensions are not measured');
  }
  if (!release.materialConstruction?.trim()) issues.push('material/construction is missing');
  if (release.setContents === null) issues.push('set contents are incomplete');
  if (release.sourceQuality !== 'accepted') issues.push(`source quality is ${release.sourceQuality}`);
  if (release.classificationStatus !== 'ready') {
    issues.push(`classification status is ${release.classificationStatus}`);
  }
  return issues;
}

/** Commercial fields are deliberately a separate publication gate. */
export function publicationReadinessIssues(item: ManifestItem): string[] {
  const release = item.release;
  if (!release) return ['missing release classification'];
  const issues: string[] = [];
  if (!release.commercialDesignNo?.trim()) issues.push('commercial design number is missing');
  if (!release.commercialName?.trim()) issues.push('commercial name is missing');
  if (!release.variantSize?.trim()) issues.push('variant size is missing');
  if (!release.materialName?.trim()) issues.push('release material is missing');
  if (release.pricePaise === null || release.stockQuantity === null) {
    issues.push('release price/stock metadata is missing');
  }
  if (!release.description?.trim()) issues.push('commercial description is missing');
  if (!release.careInstructions?.trim()) issues.push('care instructions are missing');
  return issues;
}

export function isGenerationReady(item: ManifestItem): boolean {
  return classificationReadinessIssues(item).length === 0;
}
