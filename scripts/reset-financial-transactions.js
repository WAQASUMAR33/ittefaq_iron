#!/usr/bin/env node

/**
 * Delete financial / operational transaction history while keeping master data
 * (customers, products, users, categories, etc.):
 * - Sale returns, then sales (orders/quotations/bills are all rows on `sales` via bill_type)
 * - Purchases (+ purchase returns + lines via cascade)
 * - Ledger
 * - Payments (+ details) — pay and receive ("receivings")
 * - Journals (+ details) — receipt/payment entries
 * - Hold bills, draft sales, day ends
 *
 * Then sets every customer's cus_balance to 0.
 *
 * Does NOT delete: products, store stock, expenses, stock transfers, subscriptions, users.
 * Product stock quantities are unchanged — adjust manually if needed.
 *
 * Usage: node scripts/reset-financial-transactions.js --force
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const force = process.argv.includes('--force');

async function main() {
  console.log('\nReset financial transactions + zero customer balances\n');
  console.log('Deletes: ledger, sales/orders, purchases, payments, journals, hold bills, drafts, day ends.');
  console.log('Keeps: customers, products, users. Sets all cus_balance to 0.\n');

  if (!force) {
    console.log('Refusing to run without --force\n');
    process.exit(1);
  }

  // Large tables can exceed Prisma's default interactive transaction timeout (5s).
  const result = await prisma.$transaction(
    async (tx) => {
      const out = {};

      out.saleReturnDetail = (await tx.saleReturnDetail.deleteMany({})).count;
      out.saleReturn = (await tx.saleReturn.deleteMany({})).count;
      out.sale = (await tx.sale.deleteMany({})).count;
      out.purchase = (await tx.purchase.deleteMany({})).count;
      out.ledger = (await tx.ledger.deleteMany({})).count;
      out.payment = (await tx.payment.deleteMany({})).count;
      out.journal = (await tx.journal.deleteMany({})).count;
      out.holdBill = (await tx.holdBill.deleteMany({})).count;
      out.draftSale = (await tx.draftSale.deleteMany({})).count;
      out.dayEnd = (await tx.dayEnd.deleteMany({})).count;

      const bal = await tx.customer.updateMany({ data: { cus_balance: 0 } });
      out.customersBalanceReset = bal.count;

      return out;
    },
    { maxWait: 60_000, timeout: 600_000 }
  );

  console.log('Deleted / updated:');
  for (const [k, v] of Object.entries(result)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('\nDone.\n');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
