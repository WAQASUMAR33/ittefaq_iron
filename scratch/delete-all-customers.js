#!/usr/bin/env node

/**
 * Delete All Customers
 * Clears all transactions, ledgers, sales, purchases, payments, and details first,
 * then deletes all records from the 'customer' table.
 * Keeps products, categories, subcategories, stores, and users intact.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const forceDelete = process.argv.includes('--force');

const tablesToWipe = [
  // Child tables
  'saleDetail', 'purchaseDetail', 'holdBillDetail', 'journalDetail', 
  'paymentDetail', 'saleReturnDetail', 'purchaseReturnDetail',
  
  // Transaction / intermediate tables referencing Customer
  'splitPayment', 'ledger', 'expense', 'saleReturn', 'purchaseReturn',
  'sale', 'purchase', 'holdBill', 'journal', 'payment', 'draftSale', 'subscription',
  
  // Finally, Customer table
  'customer'
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

async function run() {
  console.log('\n======================================================');
  console.log('      DELETE ALL CUSTOMER RECORDS');
  console.log('======================================================\n');

  const initial = await getCounts();

  console.log('📊 Records currently in tables to clear:');
  for (const [model, count] of Object.entries(initial)) {
    if (count !== null) {
      const displayName = model.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      console.log(`   • ${displayName}: ${count}`);
    }
  }

  if (!forceDelete) {
    console.log('\n⚠️  WARNING: This will delete ALL customer records and all referencing transactions/ledgers/sales/purchases!');
    console.log('   Run with --force to execute:');
    console.log('   node scratch/delete-all-customers.js --force\n');
    await prisma.$disconnect();
    return;
  }

  console.log('\n🗑️  Deleting records in safe order...\n');
  let totalDeleted = 0;

  for (const model of tablesToWipe) {
    if (initial[model] === null || initial[model] === 0) continue;
    try {
      const { count } = await prisma[model].deleteMany({});
      const displayName = model.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      console.log(`✅ Deleted ${count} records from ${displayName}`);
      totalDeleted += count;
    } catch (e) {
      console.log(`⚠️  Could not wipe ${model}: ${e.message}`);
    }
  }

  console.log(`\n📊 Total customer-related records deleted: ${totalDeleted}`);
  
  // Verification
  console.log('\n📋 Verification:');
  const final = await getCounts();
  let remainingCount = 0;
  for (const model of tablesToWipe) {
    if (final[model] > 0) {
      const displayName = model.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      console.log(`   ⚠️  ${displayName}: ${final[model]} records still remain!`);
      remainingCount += final[model];
    }
  }

  if (remainingCount === 0) {
    console.log('   ✅ All customer records successfully deleted.');
  } else {
    console.log('   ⚠️  Some records still remain. Check foreign key constraints.');
  }

  console.log('\n✅ Operation complete.\n');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('\n❌ Error executing cleanup:', e);
  await prisma.$disconnect();
  process.exit(1);
});
