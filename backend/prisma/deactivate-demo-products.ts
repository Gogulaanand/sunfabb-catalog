import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  DEMO_PRODUCT_IDENTIFIERS,
  isDemoProductIdentifier,
} from '../src/products/demo-product-identifiers.js';

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

async function deactivateDemoProducts() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { slug: { in: [...DEMO_PRODUCT_IDENTIFIERS] } },
        { name: { in: [...DEMO_PRODUCT_IDENTIFIERS] } },
        {
          variants: {
            some: { sku: { in: [...DEMO_PRODUCT_IDENTIFIERS] } },
          },
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      variants: {
        where: { sku: { in: [...DEMO_PRODUCT_IDENTIFIERS] } },
        select: { sku: true },
      },
    },
  });

  const matchedIdentifiers = new Set<string>();
  for (const product of products) {
    if (isDemoProductIdentifier(product.slug)) {
      matchedIdentifiers.add(product.slug);
    }
    if (isDemoProductIdentifier(product.name)) {
      matchedIdentifiers.add(product.name);
    }
    for (const variant of product.variants) matchedIdentifiers.add(variant.sku);
  }

  const missing = DEMO_PRODUCT_IDENTIFIERS.filter(
    (identifier) => !matchedIdentifiers.has(identifier),
  );
  if (missing.length > 0) {
    throw new Error(
      `Refusing partial demo deactivation; identifiers not found: ${missing.join(', ')}`,
    );
  }

  const productIds = products.map((product) => product.id);
  const result = await prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.updateMany({
      where: { product_id: { in: productIds } },
      data: { is_active: false },
    });
    const deactivatedProducts = await tx.product.updateMany({
      where: { id: { in: productIds } },
      data: { is_active: false },
    });
    return { products: deactivatedProducts.count, variants: variants.count };
  });

  console.log(
    `Deactivated ${result.products} demo products and ${result.variants} variants.`,
  );
}

deactivateDemoProducts()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
