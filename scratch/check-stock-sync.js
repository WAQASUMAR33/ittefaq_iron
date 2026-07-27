const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- COMPARING PRODUCTS STOCK VS STORE STOCKS ---');
  
  const products = await prisma.product.findMany({
    include: {
      store_stocks: true
    }
  });

  let discrepancies = 0;
  for (const p of products) {
    const totalStoreStock = p.store_stocks.reduce((sum, ss) => sum + parseFloat(ss.stock_quantity || 0), 0);
    const productStock = parseFloat(p.pro_stock_qnty || 0);
    
    if (Math.abs(totalStoreStock - productStock) > 0.001) {
      discrepancies++;
      console.log(`Product: ${p.pro_title} (ID: ${p.pro_id})`);
      console.log(`  - product.pro_stock_qnty (Product table): ${productStock}`);
      console.log(`  - Sum of store_stocks (StoreStock table): ${totalStoreStock}`);
      console.log(`  - Difference: ${totalStoreStock - productStock}`);
    }
  }

  console.log(`\nTotal products checked: ${products.length}`);
  console.log(`Products with stock mismatch between tables: ${discrepancies}`);
}

main().finally(() => prisma.$disconnect());
