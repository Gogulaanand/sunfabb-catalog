import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import { INPUT_DIR } from './config.js';
import { CropQualitySchema, ProductTypeSchema, SetContentsSchema, SlugSchema } from './types.js';
import { z } from 'zod';

export const REVIEW_STATUSES = [
  'candidate',
  'ready',
  'duplicate',
  're-photograph',
  'identification-pending',
  'authorization-blocked',
] as const;
export const ReviewStatusSchema = z.enum(REVIEW_STATUSES);

export const CandidateRecordSchema = z.object({
  candidateId: z.string().regex(/^SC-[A-Z0-9]+-(?:R\d+C\d+|SOURCE)$/),
  source: z.string().min(1),
  sourcePosition: z.string().min(1),
  bestCrop: z.string().nullable(),
  duplicateGroup: SlugSchema.nullable(),
  productType: ProductTypeSchema,
  measuredWidthCm: z.number().positive().nullable(),
  measuredLengthCm: z.number().positive().nullable(),
  materialConstruction: z.string().nullable(),
  setContents: SetContentsSchema.nullable(),
  colour: z.string().nullable(),
  commercialDesignNo: z.string().nullable(),
  commercialName: z.string().nullable(),
  cropQuality: CropQualitySchema,
  status: ReviewStatusSchema,
  notes: z.string().min(1),
});
export type CandidateRecord = z.infer<typeof CandidateRecordSchema>;

const unresolvedSources = [
  '166fe617-de48-4489-8e09-81515a97f1c8.jpg',
  '1789dc55-730b-44ec-881c-cd1c779f4ed1.jpg',
  '3aacdb42-6382-445c-a790-18d1ad2a7fed.jpg',
  '6839d886-dba1-4f3f-9ac3-c50654234c15.jpg',
  '90f6dc50-5f06-4bc1-be74-85f4610e1361.jpg',
  'a84884b7-78ca-4ce5-82db-2fded1f66858.jpg',
  '3407a693-34b8-42f8-852f-a6bee8452ee3.jpg',
  '4429',
  '517d4c37-40e1-4dcc-933c-656e7e9a1a3b.jpg',
  '6d19171f-bb61-49cf-96a2-29067c9009aa.jpg',
  '7624a2c0-3639-4c1b-be1b-a5fade985d7f.jpg',
  'a3158b6e-3f72-495f-bc3f-835a7eba996a.jpg',
  'bb73654a-1532-4d0d-9e9a-e43b1833d1f5.jpg',
  'befcaed9-1b70-42da-b901-0dfba9f7ec39.jpg',
  'cd76e872-4ac3-4338-86a7-72c9c0aad62f.jpg',
  'e9fd3907-473e-427f-ae96-4d34a2380d82.jpg',
] as const;

function stem(source: string): string {
  return source.split('.')[0]!.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
}

function record(
  source: string,
  position: string,
  status: CandidateRecord['status'],
  notes: string,
  row?: number,
  col?: number,
): CandidateRecord {
  const suffix = row === undefined || col === undefined ? 'SOURCE' : `R${row}C${col}`;
  return {
    candidateId: `SC-${stem(source)}-${suffix}`,
    source,
    sourcePosition: position,
    bestCrop: null,
    duplicateGroup: null,
    productType: 'unknown',
    measuredWidthCm: null,
    measuredLengthCm: null,
    materialConstruction: null,
    setContents: null,
    colour: null,
    commercialDesignNo: null,
    commercialName: null,
    cropQuality: 'not-reviewed',
    status,
    notes,
  };
}

export function unresolvedCandidates(): CandidateRecord[] {
  const rows: CandidateRecord[] = [];
  for (const source of unresolvedSources) {
    if (source === unresolvedSources[0]) {
      const grid = [
        ['single-cot bedspread', 'woven plaid/check; fibre unknown', 'bedspread + 1 pillow cover'],
        ['duplicate', null, null],
        ['single-cot bedspread', 'woven plaid/check; fibre unknown', 'bedspread + 1 pillow cover'],
        ['thick bedsheet', 'thick woven textile; fibre unknown', 'bedsheet only; no pillow cover'],
        ['single-cot bedspread', 'printed textile; fibre unknown', 'bedspread + 1 pillow cover'],
        ['single-cot bedspread', 'woven textile; fibre unknown', 'bedspread + 1 pillow cover'],
        ['single-cot bedspread', 'woven textile; fibre unknown', 'bedspread + 1 pillow cover'],
        ['thick bedsheet', 'thick woven textile; fibre unknown', 'bedsheet only; no pillow cover'],
        ['single-cot bedspread', 'woven textile; fibre unknown', 'bedspread + 1 pillow cover'],
        ['single-cot bedspread', 'woven textile; fibre unknown', 'bedspread + 1 pillow cover'],
        ['single-cot bedspread', 'woven textile; fibre unknown', 'bedspread + 1 pillow cover'],
        ['single-cot bedspread', 'woven textile; fibre unknown', 'bedspread + 1 pillow cover'],
      ] as const;
      grid.forEach(([product, construction, contents], index) => {
        const row = Math.floor(index / 4) + 1;
        const col = (index % 4) + 1;
        const duplicate = product === 'duplicate';
        rows.push({
          ...record(source, `grid position R${row}C${col}`, duplicate ? 'duplicate' : 'ready', duplicate ? 'Already completed; omit as a duplicate.' : `Classified as ${product}; ${construction}; ${contents}.`, row, col),
          bestCrop: duplicate ? null : `work/crops/SC-166F-R${row}C${col}-source.jpg`,
          duplicateGroup: duplicate ? 'sc-166f-r1c2' : null,
          productType: duplicate ? 'unknown' : product === 'thick bedsheet' ? 'bedsheet' : 'bedspread',
          measuredWidthCm: duplicate ? null : 152.4,
          measuredLengthCm: duplicate ? null : 228.6,
          materialConstruction: construction,
          setContents: contents === null ? null : { pieces: contents.split(' + '), pillowCoverCount: contents.includes('1 pillow cover') ? 1 : 0 },
          cropQuality: duplicate ? 'not-reviewed' : 'accepted',
        });
      });
    } else if (source === '6d19171f-bb61-49cf-96a2-29067c9009aa.jpg') {
      for (let i = 0; i < 9; i++) rows.push(record(source, `floor-grid tile ${i + 1}`, 're-photograph', 'Separate candidate; towel grouping is not a colourway set.', Math.floor(i / 3) + 1, (i % 3) + 1));
    } else if (source === '6839d886-dba1-4f3f-9ac3-c50654234c15.jpg') {
      for (let i = 0; i < 11; i++) rows.push(record(source, `floral grid tile ${i + 1}`, 'identification-pending', 'Inventory-only floral candidate pending commercial identification.', Math.floor(i / 4) + 1, (i % 4) + 1));
    } else if (source === '90f6dc50-5f06-4bc1-be74-85f4610e1361.jpg') {
      for (let i = 0; i < 2; i++) rows.push(record(source, `packaged item ${i + 1}`, 're-photograph', 'Overlapping packaged design; the visible 60 x 90 label is not sufficient classification.', 1, i + 1));
    } else if (source === '4429') {
      rows.push(record(source, 'existing manifest row', 'authorization-blocked', 'Parked until an authorized workflow is established.'));
    } else {
      rows.push(record(source, 'whole frame / needs physical review', 'candidate', 'Candidate is inventoried but not generation-ready. Confirm type, dimensions, construction and set contents.'));
    }
  }
  return rows;
}

export async function writeClassificationArtifacts(): Promise<void> {
  const candidates = unresolvedCandidates().map((candidate) => CandidateRecordSchema.parse(candidate));
  const outDir = path.resolve('classification');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'unresolved-inventory.json'), JSON.stringify({ candidates }, null, 2) + '\n');
  const lines = [
    '# Unclear textile recovery review table', '',
    'Generated from the local unresolved source inventory. No row is generation-, swatch-, upload-, or product-ready until the classification fields are completed and status is `ready`.', '',
    '| Candidate ID | Source / position | Duplicate group | Type | Dimensions cm | Material / construction | Set contents | Colour | Commercial design/name | Crop | Status | Notes |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...candidates.map((candidate) => `| ${candidate.candidateId} | ${candidate.source} / ${candidate.sourcePosition} | ${candidate.duplicateGroup ?? '—'} | ${candidate.productType} | ${candidate.measuredWidthCm === null ? '—' : `${candidate.measuredWidthCm} × ${candidate.measuredLengthCm} cm`} | ${candidate.materialConstruction ?? '—'} | ${candidate.setContents ? `${candidate.setContents.pieces.join(' + ')} (${candidate.setContents.pillowCoverCount} pillow covers)` : '—'} | ${candidate.colour ?? '—'} | ${candidate.commercialDesignNo ?? '—'} / ${candidate.commercialName ?? '—'} | ${candidate.cropQuality} | ${candidate.status} | ${candidate.notes} |`),
    '', `Total candidate records: ${candidates.length}. Source photographs inventoried: ${new Set(candidates.map((candidate) => candidate.source)).size}.`,
  ];
  fs.writeFileSync(path.join(outDir, 'unresolved-review.md'), lines.join('\n') + '\n');

  const sources = unresolvedSources.filter((source) => source.endsWith('.jpg') && fs.existsSync(path.join(INPUT_DIR, source)));
  const tileWidth = 320;
  const tileHeight = 240;
  const columns = 4;
  const composites = [];
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]!;
    const image = await sharp(path.join(INPUT_DIR, source)).resize(tileWidth, tileHeight, { fit: 'inside', background: '#f6f1e8' }).toBuffer();
    composites.push({ input: image, left: (i % columns) * tileWidth, top: Math.floor(i / columns) * tileHeight });
  }
  if (composites.length) {
    await sharp({ create: { width: columns * tileWidth, height: Math.ceil(composites.length / columns) * tileHeight, channels: 3, background: '#f6f1e8' } }).composite(composites).jpeg({ quality: 88 }).toFile(path.join(outDir, 'unresolved-contact-sheet.jpg'));
  }
  console.log(`Wrote ${candidates.length} candidate records and ${sources.length} source tiles to ${outDir}`);
}
