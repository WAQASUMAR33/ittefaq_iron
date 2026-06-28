const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tablesToWipe = [
  // 1. Child/Detail tables first
  'saleReturnDetail',
  'purchaseReturnDetail',
  'saleDetail',
  'purchaseDetail',
  'holdBillDetail',
  'journalDetail',
  'dayEndDetail',
  'paymentDetail',
  'stockTransferDetail',

  // 2. Main Transaction/Ledger tables next
  'splitPayment',
  'ledger',
  'expense',
  'saleReturn',
  'purchaseReturn',
  'sale',
  'purchase',
  'holdBill',
  'journal',
  'dayEnd',
  'payment',
  'draftSale',
  'subscription',
  'cargo',
  'stockTransfer'
];

async function getCounts() {
  const counts = {};
  for (const model of tablesToWipe) {
    try {
      counts[model] = await prisma[model].count();
    } catch (e) {
      counts[model] = null;
    }
  }
  return counts;
}

async function main() {
  try {
    console.log('=== BEFORE RESET: Record Counts ===');
    const beforeCounts = await getCounts();
    for (const [model, count] of Object.entries(beforeCounts)) {
      console.log(`${model}: ${count}`);
    }

    console.log('\n=== Wiping transaction data... ===');
    for (const model of tablesToWipe) {
      if (beforeCounts[model] > 0) {
        const { count } = await prisma[model].deleteMany({});
        console.log(`Cleared ${count} entries from ${model}`);
      }
    }

    console.log('\n=== Resetting customer balances to 0... ===');
    const customerUpdate = await prisma.customer.updateMany({
      data: { cus_balance: 0 }
    });
    console.log(`Reset balance to 0 for ${customerUpdate.count} customers.`);

    console.log('\n=== Resetting loader balances to 0... ===');
    const loaderUpdate = await prisma.loader.updateMany({
      data: { loader_balance: 0 }
    });
    console.log(`Reset balance to 0 for ${loaderUpdate.count} loaders.`);

    console.log('\n=== Resetting store stock quantities to 0... ===');
    const storeStockUpdate = await prisma.storeStock.updateMany({
      data: { stock_quantity: 0 }
    });
    console.log(`Reset stock quantities to 0 for ${storeStockUpdate.count} store stock records.`);

    console.log('\n=== Resetting product stock quantities to 0... ===');
    const productUpdate = await prisma.product.updateMany({
      data: { pro_stock_qnty: 0 }
    });
    console.log(`Reset stock quantities to 0 for ${productUpdate.count} products.`);

    console.log('\n=== AFTER RESET: Verification ===');
    const afterCounts = await getCounts();
    let totalRemaining = 0;
    for (const [model, count] of Object.entries(afterCounts)) {
      if (count > 0) {
        console.log(`⚠️ WARNING: ${model} still has ${count} records!`);
        totalRemaining += count;
      }
    }
    
    if (totalRemaining === 0) {
      console.log('✅ Success: All transaction tables successfully cleared and balances reset to 0.');
    } else {
      console.log('⚠️ Warning: Some transaction tables could not be completely cleared due to foreign keys.');
    }

  } catch (error) {
    console.error('Error during reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
