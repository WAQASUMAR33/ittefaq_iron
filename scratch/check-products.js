const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const productsCount = await prisma.product.count();
    console.log('Total Products in Database:', productsCount);

    const categoriesCount = await prisma.categories.count();
    console.log('Total Categories in Database:', categoriesCount);

    const products = await prisma.product.findMany({
      take: 5,
      select: {
        pro_id: true,
        pro_title: true,
        pro_code: true
      }
    });
    console.log('Sample Products:', products);

  } catch (error) {
    console.error('Error running diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
