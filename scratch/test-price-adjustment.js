const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- Price Adjustment Formula Verification ---');
  try {
    // 1. Find a category with products
    const products = await prisma.product.findMany({
      take: 5,
      include: {
        category: true
      }
    });

    if (products.length === 0) {
      console.log('No products found in the database. Please make sure database has seed data.');
      return;
    }

    console.log(`Found ${products.length} products to verify formulas.\n`);

    for (const p of products) {
      const basePrice = parseFloat(p.pro_baser_price || 0);
      const originalCrate = parseFloat(p.pro_crate || 0);
      const originalCostPrice = parseFloat(p.pro_cost_price || 0);
      const originalSalePrice = parseFloat(p.pro_sale_price || 0);

      console.log(`Product: [ID: ${p.pro_id}] "${p.pro_title}" (Category: "${p.category?.cat_name}")`);
      console.log(`  Current Rates:`);
      console.log(`    Base Rate:     ${basePrice}`);
      console.log(`    Purchase Rate (pro_crate): ${originalCrate}`);
      console.log(`    Cost Price (pro_cost_price): ${originalCostPrice}`);
      console.log(`    Sale Price:    ${originalSalePrice}`);

      // Scenario 1: Both purchase percentage (e.g. 10%) and sale percentage (e.g. 15%) provided
      const purchaseVal = 10;
      const saleVal = 15;

      const newPurchase = parseFloat((basePrice + basePrice * (purchaseVal / 100)).toFixed(2));
      const finalPurchase = parseFloat(Math.max(0, newPurchase).toFixed(2));

      const refPurchaseRateScenario1 = finalPurchase;
      const newSalePriceScenario1 = parseFloat((refPurchaseRateScenario1 + refPurchaseRateScenario1 * (saleVal / 100)).toFixed(2));
      const finalSalePriceScenario1 = parseFloat(Math.max(0, newSalePriceScenario1).toFixed(2));

      console.log(`  Scenario 1: Purchase Adjustment = ${purchaseVal}%, Sale Adjustment = ${saleVal}%`);
      console.log(`    New Purchase Rate (should be base * 1.10): ${finalPurchase} (Expected: ${(basePrice * 1.1).toFixed(2)})`);
      console.log(`    New Sale Rate (should be newPurchase * 1.15): ${finalSalePriceScenario1} (Expected: ${(refPurchaseRateScenario1 * 1.15).toFixed(2)})`);

      // Scenario 2: Only sale percentage (e.g. 20%) provided, purchase percentage is null
      const saleValOnly = 20;
      const refPurchaseRateScenario2 = originalCrate || originalCostPrice || 0;
      const newSalePriceScenario2 = parseFloat((refPurchaseRateScenario2 + refPurchaseRateScenario2 * (saleValOnly / 100)).toFixed(2));
      const finalSalePriceScenario2 = parseFloat(Math.max(0, newSalePriceScenario2).toFixed(2));

      console.log(`  Scenario 2: Purchase Adjustment = N/A, Sale Adjustment = ${saleValOnly}%`);
      console.log(`    New Purchase Rate: (unaffected)`);
      console.log(`    New Sale Rate (should be existingPurchase * 1.20): ${finalSalePriceScenario2} (Expected: ${(refPurchaseRateScenario2 * 1.20).toFixed(2)})`);
      console.log('----------------------------------------------------');
    }
  } catch (err) {
    console.error('Error running test script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
