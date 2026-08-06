import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function run() {
  const products = await prisma.product.findMany({
    select: {
      name: true,
      category: true,
      subcategory: {
        select: {
          name: true
        }
      }
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  let output = '# Current Product Catalog\n\n';
  output += '| Product Name | Category | Subcategory |\n';
  output += '|---|---|---|\n';

  for (const p of products) {
    const sub = p.subcategory ? p.subcategory.name : '-';
    output += `| ${p.name} | ${p.category} | ${sub} |\n`;
  }

  // Use the current artifact directory based on the conversation ID
  const dest = 'C:\\Users\\15ind\\.gemini\\antigravity-ide\\brain\\d34eb3e6-d1c5-45e9-8ee2-1d02cae383a4\\product-catalog.md';
  fs.writeFileSync(dest, output);
  console.log(`Wrote catalog to ${dest}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
