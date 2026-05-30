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
    },
    {
      slug: 'towels',
      name: 'Towels',
      description: 'Soft, absorbent towels for bath, hand, and kitchen use',
    },
    {
      slug: 'table-linen',
      name: 'Table Linen',
      description: 'Tablecloths, napkins, and runners for every occasion',
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
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

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
