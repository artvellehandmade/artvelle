import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany();
  console.log(JSON.stringify(products.map(p => ({name: p.name, images: p.images})), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
