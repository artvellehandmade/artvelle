import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany();
  console.log(JSON.stringify(products.filter(p => p.variants && p.variants.length > 0), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
