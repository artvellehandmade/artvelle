import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
async function run() {
  const products = await prisma.product.findMany({ select: { name: true, variants: true, options: true, category: true, isFeatured: true } });
  let output = '# Product Catalog & Variants\n\n';
  for (const p of products) {
    output += `## ${p.name}\n`;
    output += `**Category**: ${p.category}\n\n`;
    if (!p.variants || !Array.isArray(p.variants) || p.variants.length === 0) {
      output += '- No variants\n';
    } else {
      for (const v of p.variants) {
        if (v.combo) {
          const comboStr = Object.entries(v.combo).map(([k, val]) => `${k}: ${val}`).join(' | ');
          output += `- ${comboStr}\n`;
        }
      }
    }
    output += '\n';
  }
  fs.writeFileSync('C:\\Users\\15ind\\.gemini\\antigravity-ide\\brain\\b9de643d-8a9c-4d44-9e27-2f9b698a6392\\product-catalog.md', output);
}
run().catch(console.error).finally(() => prisma.$disconnect());
