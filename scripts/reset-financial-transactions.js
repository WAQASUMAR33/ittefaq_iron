#!/usr/bin/env node

/**
 * Delete financial / operational transaction history while keeping master data
 * (customers, products, users, categories, etc.).
 *
 * **Full reset** (`--force`):
 * - Sale returns, then sales (orders/quotations/bills are all rows on `sales` via bill_type)
 * - Purchases (+ purchase returns + lines via cascade)
 * - Ledger
 * - Payments (+ details) — pay and receive ("receivings")
 * - Journals (+ details) — receipt/payment entries
 * - Hold bills, draft sales, day ends
 *
 * **Core reset** (`--force --core`) — only what you asked for when cleaning bills + books:
 * - Sale returns, sales, purchases, all ledger rows
 * - Sets every customer's `cus_balance` to 0 and every loader's `loader_balance` to 0
 * - Does **not** delete payments, journals, hold bills, draft sales, day ends (those may be orphaned
 *   from ledger; use full reset if you want everything aligned)
 *
 * Does NOT delete: products, store stock, expenses, stock transfers, subscriptions, users.
 * Product stock quantities are unchanged — adjust manually if needed.
 *
 * Usage:
 *   node scripts/reset-financial-transactions.js --force
 *   node scripts/reset-financial-transactions.js --force --core
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const force = process.argv.includes('--force');
const coreOnly = process.argv.includes('--core');

async function main() {
  console.log('\nReset financial transactions + zero customer balances\n');
  if (coreOnly) {
    console.log('Mode: CORE (--core)');
    console.log('Deletes: sale returns, sales, purchases, ledger.');
    console.log('Sets: all customers.cus_balance and loaders.loader_balance → 0\n');
  } else {
    console.log('Mode: FULL');
    console.log('Deletes: ledger, sales/orders, purchases, payments, journals, hold bills, drafts, day ends.');
    console.log('Keeps: customers, products, users. Sets all cus_balance and loader_balance to 0.\n');
  }

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

      if (!coreOnly) {
        out.payment = (await tx.payment.deleteMany({})).count;
        out.journal = (await tx.journal.deleteMany({})).count;
        out.holdBill = (await tx.holdBill.deleteMany({})).count;
        out.draftSale = (await tx.draftSale.deleteMany({})).count;
        out.dayEnd = (await tx.dayEnd.deleteMany({})).count;
      }

      const bal = await tx.customer.updateMany({ data: { cus_balance: 0 } });
      out.customersBalanceReset = bal.count;

      const loaders = await tx.loader.updateMany({ data: { loader_balance: 0 } });
      out.loadersBalanceReset = loaders.count;

      return out;
    },
    { maxWait: 60_000, timeout: 600_000 }
  );

  console.log('Deleted / updated:');
  for (const [k, v] of Object.entries(result)) {
    console.log(`  ${k}: ${v}`);
  }
  if (coreOnly) {
    console.log('\nNote: Payments/journals/hold bills/drafts/day-ends were left in place.');
    console.log('If finance screens look inconsistent, run again without --core for a full wipe.\n');
  } else {
    console.log('\nDone.\n');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
