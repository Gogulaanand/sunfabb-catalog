import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { ProductImageRole } from '../generated/prisma/enums.js';

export const TARGET_PRODUCT_SLUGS = [
  'bedspread-design-8569',
  'bedspread-design-4219',
  'bedspread-design-8525',
] as const;

const EXPECTED_SWATCH_COUNT = 12;

export interface SwatchBackfillRecord {
  id: string;
  variant_id: string | null;
  image_role: ProductImageRole;
  product: { slug: string };
}

export interface SwatchBackfillOperations {
  findMatchingSwatches: () => Promise<SwatchBackfillRecord[]>;
  setSwatchRole: (imageId: string) => Promise<void>;
}

export async function classifyKnownSwatches(
  operations: SwatchBackfillOperations,
): Promise<number> {
  const matches = await operations.findMatchingSwatches();

  if (matches.length !== EXPECTED_SWATCH_COUNT) {
    throw new Error(
      `Swatch backfill preflight failed: expected exactly ${EXPECTED_SWATCH_COUNT} matching records, found ${matches.length}`,
    );
  }

  const missingVariant = matches.find((image) => image.variant_id === null);
  if (missingVariant) {
    throw new Error(
      `Swatch backfill preflight failed: image '${missingVariant.id}' has no variant association`,
    );
  }

  const matchedSlugs = new Set(matches.map((image) => image.product.slug));
  const missingProduct = TARGET_PRODUCT_SLUGS.find(
    (slug) => !matchedSlugs.has(slug),
  );
  if (missingProduct) {
    throw new Error(
      `Swatch backfill preflight failed: no matching record belongs to '${missingProduct}'`,
    );
  }

  let updatedCount = 0;
  for (const image of matches) {
    if (image.image_role === ProductImageRole.SWATCH) continue;
    await operations.setSwatchRole(image.id);
    updatedCount += 1;
  }

  return updatedCount;
}

async function backfillSwatches(prisma: PrismaClient): Promise<number> {
  return prisma.$transaction((tx) =>
    classifyKnownSwatches({
      findMatchingSwatches: () =>
        tx.productImage.findMany({
          where: {
            product: { slug: { in: [...TARGET_PRODUCT_SLUGS] } },
            public_id: { endsWith: '/swatch' },
          },
          select: {
            id: true,
            variant_id: true,
            image_role: true,
            product: { select: { slug: true } },
          },
        }),
      setSwatchRole: async (imageId) => {
        await tx.productImage.update({
          where: { id: imageId },
          data: { image_role: ProductImageRole.SWATCH },
        });
      },
    }),
  );
}

export async function runBackfill(): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const dbUrl = new URL(databaseUrl);
  const adapter = new PrismaPg({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || '5432'),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    ssl:
      dbUrl.searchParams.get('sslmode') === 'require'
        ? { rejectUnauthorized: false }
        : undefined,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    return await backfillSwatches(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const scriptPath = process.argv[1] ?? '';
const isDirectExecution =
  scriptPath.endsWith('backfill-product-image-roles.ts') ||
  scriptPath.endsWith('backfill-product-image-roles.js');

if (isDirectExecution) {
  runBackfill()
    .then((updatedCount) => {
      console.log(`Classified ${updatedCount} product image swatches.`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
