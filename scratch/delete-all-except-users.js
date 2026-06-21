#!/usr/bin/env node

/**
 * Delete All Data Except Users Table
 * Wipes every data table in FK-safe order, but keeps the complete 'users' and 'fingerprints' tables intact.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const forceDelete = process.argv.includes('--force');

const modelsToWipe = [
  // 1. Detail / Child tables
  'stockTransferDetail', 'saleReturnDetail', 'purchaseReturnDetail', 'saleDetail',
  'purchaseDetail', 'holdBillDetail', 'journalDetail', 'dayEndDetail', 'paymentDetail',
  
  // 2. Transaction / Mid-level tables
  'splitPayment', 'ledger', 'expense', 'saleReturn', 'purchaseReturn',
  'sale', 'purchase', 'holdBill', 'journal', 'dayEnd', 'stockTransfer', 'payment',
  
  // 3. Other tables
  'draftSale', 'subscription', 'storeStock',
  
  // 4. Master data tables
  'product', 'subCategory', 'categories', 'customer', 'customerCategory',
  'customerType', 'city', 'expenseTitle', 'vehicle', 'loader', 'cargo', 'package', 'store'
];

async function getCounts() {
  const counts = {};
  for (const model of modelsToWipe) {
    try {
      counts[model] = await prisma[model].count();
    } catch (e) {
      counts[model] = null;
    }
  }
  try {
    counts.users = await prisma.users.count();
  } catch (e) {
    counts.users = null;
  }
  return counts;
}

async function run() {
  console.log('\n======================================================');
  console.log('      WIPE ALL DATA EXCEPT USERS TABLE');
  console.log('======================================================\n');

  const initial = await getCounts();

  console.log('📊 Current records count:');
  for (const [model, count] of Object.entries(initial)) {
    if (count !== null) {
      const displayName = model.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      console.log(`   • ${displayName}: ${count}`);
    }
  }

  if (!forceDelete) {
    console.log('\n⚠️  WARNING: This will delete ALL database records except the Users table!');
    console.log('   Run with --force to execute:');
    console.log('   node scratch/delete-all-except-users.js --force\n');
    await prisma.$disconnect();
    return;
  }

  console.log('\n🗑️  Deleting all tables in FK-safe order...\n');
  let totalDeleted = 0;

  for (const model of modelsToWipe) {
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

  console.log(`\n📊 Total records deleted (excluding users): ${totalDeleted}`);
  
  // Verify remaining counts
  console.log('\n📋 Verification:');
  const final = await getCounts();
  let remainingCount = 0;
  for (const model of modelsToWipe) {
    if (final[model] > 0) {
      const displayName = model.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      console.log(`   ⚠️  ${displayName}: ${final[model]} records still remain!`);
      remainingCount += final[model];
    }
  }

  if (remainingCount === 0) {
    console.log('   ✅ All target tables successfully cleared.');
  } else {
    console.log('   ⚠️  Some records still remain. Check foreign key dependencies.');
  }

  console.log(`   👤 Users table size: ${final.users} (kept intact)`);
  console.log('\n✅ Operation complete.\n');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('\n❌ Error executing cleanup:', e);
  await prisma.$disconnect();
  process.exit(1);
});
