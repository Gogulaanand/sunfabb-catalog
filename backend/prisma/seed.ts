import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

// pg.Pool with a connectionString passes through pg-connection-string, which in pg 8.21+
// treats sslmode=require as verify-full. Parsing manually bypasses that and lets us set ssl directly.
const dbUrl = new URL(databaseUrl);
const adapter = new PrismaPg({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '5432'),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Categories ---
  const categories = [
    {
      slug: 'bedspreads',
      name: 'Bedspreads',
      description: 'Handcrafted bedspreads in traditional and contemporary designs',
      image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
    },
    {
      slug: 'towels',
      name: 'Towels',
      description: 'Soft, absorbent towels for bath, hand, and kitchen use',
      image_url: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80',
    },
    {
      slug: 'table-linen',
      name: 'Table Linen',
      description: 'Tablecloths, napkins, and runners for every occasion',
      image_url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80',
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { image_url: category.image_url, description: category.description },
      create: category,
    });
  }

  // --- Materials ---
  const materials = ['Cotton', 'Linen', 'Polyester'];

  for (const name of materials) {
    await prisma.material.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // --- Colors ---
  const colors = [
    { name: 'White', hex_code: '#FFFFFF' },
    { name: 'Navy Blue', hex_code: '#1F3A5F' },
    { name: 'Dusty Rose', hex_code: '#C9A0A0' },
  ];

  for (const color of colors) {
    await prisma.color.upsert({
      where: { name: color.name },
      update: {},
      create: color,
    });
  }

  // --- Products, variants, images ---
  const categoryRows = await prisma.category.findMany();
  const materialRows = await prisma.material.findMany();
  const colorRows = await prisma.color.findMany();
  const categoryBySlug = Object.fromEntries(categoryRows.map((c) => [c.slug, c]));
  const materialByName = Object.fromEntries(materialRows.map((m) => [m.name, m]));
  const colorByName = Object.fromEntries(colorRows.map((c) => [c.name, c]));

  const products = [
    {
      slug: 'heritage-linen-bedspread',
      name: 'Heritage Linen Bedspread',
      description: 'A breathable pure-linen bedspread with a hand-finished hem, woven for year-round comfort.',
      care_instructions: 'Machine wash cold, line dry. Cool iron if needed.',
      categorySlug: 'bedspreads',
      heroImage: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=80',
      galleryImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
      variants: [
        { material: 'Linen', color: 'White', size: 'Queen', price: 449900, stock: 18, sku: 'BSP-HLB-LIN-WHT-Q' },
        { material: 'Linen', color: 'Dusty Rose', size: 'King', price: 549900, stock: 9, sku: 'BSP-HLB-LIN-DRS-K' },
        { material: 'Cotton', color: 'Navy Blue', size: 'Queen', price: 389900, stock: 14, sku: 'BSP-HLB-COT-NVY-Q' },
      ],
    },
    {
      slug: 'quilted-cotton-bedspread',
      name: 'Quilted Cotton Bedspread',
      description: 'Plush, diamond-quilted cotton bedspread with reversible styling for two looks in one.',
      care_instructions: 'Machine wash warm, tumble dry low.',
      categorySlug: 'bedspreads',
      heroImage: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
      galleryImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
      variants: [
        { material: 'Cotton', color: 'White', size: 'King', price: 419900, stock: 11, sku: 'BSP-QCB-COT-WHT-K' },
        { material: 'Cotton', color: 'Dusty Rose', size: 'Queen', price: 369900, stock: 20, sku: 'BSP-QCB-COT-DRS-Q' },
      ],
    },
    {
      slug: 'turkish-cotton-bath-towel',
      name: 'Turkish Cotton Bath Towel',
      description: 'Ultra-absorbent, long-staple Turkish cotton towel that stays soft wash after wash.',
      care_instructions: 'Machine wash warm. Avoid fabric softener for best absorbency.',
      categorySlug: 'towels',
      heroImage: 'https://images.unsplash.com/photo-1583845112239-97ef1341b271?w=1200&q=80',
      galleryImage: 'https://images.unsplash.com/photo-1583845112239-97ef1341b271?w=1200&q=80',
      variants: [
        { material: 'Cotton', color: 'White', size: 'Bath', price: 89900, stock: 40, sku: 'TWL-TCB-COT-WHT-B' },
        { material: 'Cotton', color: 'Navy Blue', size: 'Bath', price: 89900, stock: 32, sku: 'TWL-TCB-COT-NVY-B' },
        { material: 'Cotton', color: 'Dusty Rose', size: 'Hand', price: 39900, stock: 50, sku: 'TWL-TCB-COT-DRS-H' },
      ],
    },
    {
      slug: 'waffle-weave-hand-towel',
      name: 'Waffle Weave Hand Towel',
      description: 'Lightweight waffle-textured hand towel with a quick-dry weave, ideal for daily use.',
      care_instructions: 'Machine wash cold, tumble dry low.',
      categorySlug: 'towels',
      heroImage: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1200&q=80',
      galleryImage: 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=1200&q=80',
      variants: [
        { material: 'Cotton', color: 'White', size: 'Hand', price: 34900, stock: 60, sku: 'TWL-WWH-COT-WHT-H' },
        { material: 'Polyester', color: 'Navy Blue', size: 'Hand', price: 29900, stock: 45, sku: 'TWL-WWH-POL-NVY-H' },
      ],
    },
    {
      slug: 'linen-table-runner',
      name: 'Linen Table Runner',
      description: 'A tactile linen runner with mitred corners, anchoring the table with quiet texture.',
      care_instructions: 'Hand wash or gentle machine cycle. Iron on linen setting while damp.',
      categorySlug: 'table-linen',
      heroImage: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200&q=80',
      galleryImage: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=1200&q=80',
      variants: [
        { material: 'Linen', color: 'White', size: 'Standard', price: 129900, stock: 22, sku: 'TBL-LTR-LIN-WHT-S' },
        { material: 'Linen', color: 'Dusty Rose', size: 'Standard', price: 129900, stock: 16, sku: 'TBL-LTR-LIN-DRS-S' },
      ],
    },
    {
      slug: 'embroidered-napkin-set',
      name: 'Embroidered Napkin Set',
      description: 'A set of four cotton napkins finished with delicate hand embroidery along the edge.',
      care_instructions: 'Machine wash cold, cool iron.',
      categorySlug: 'table-linen',
      heroImage: 'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?w=1200&q=80',
      galleryImage: 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=1200&q=80',
      variants: [
        { material: 'Cotton', color: 'White', size: 'Set of 4', price: 99900, stock: 28, sku: 'TBL-ENS-COT-WHT-S4' },
        { material: 'Cotton', color: 'Navy Blue', size: 'Set of 4', price: 99900, stock: 19, sku: 'TBL-ENS-COT-NVY-S4' },
      ],
    },
  ];

  for (const p of products) {
    const category = categoryBySlug[p.categorySlug];
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        care_instructions: p.care_instructions,
        category_id: category.id,
      },
    });

    const existingImages = await prisma.productImage.count({ where: { product_id: product.id } });
    if (existingImages === 0) {
      await prisma.productImage.create({
        data: { product_id: product.id, url: p.heroImage, alt_text: p.name, sort_order: 0, is_primary: true },
      });
      await prisma.productImage.create({
        data: { product_id: product.id, url: p.galleryImage, alt_text: `${p.name} detail`, sort_order: 1, is_primary: false },
      });
    }

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          product_id: product.id,
          material_id: materialByName[v.material].id,
          color_id: colorByName[v.color].id,
          size: v.size,
          price: v.price,
          stock_quantity: v.stock,
          sku: v.sku,
        },
      });
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
