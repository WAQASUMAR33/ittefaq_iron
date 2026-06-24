const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Products Dropdown select directly...');
    const products = await prisma.product.findMany({
      select: {
        pro_id: true,
        pro_title: true,
        pro_cost_price: true,
        pro_sale_price: true,
        pro_baser_price: true,
        pro_crate: true,
        pro_unit: true,
        pro_packing: true
      },
      take: 5
    });
    console.log('Successfully fetched products:', products.length);
    console.log('Sample product:', products[0]);
  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
