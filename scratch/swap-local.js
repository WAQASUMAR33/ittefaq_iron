const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('=== FORCING SPECIFIC ENTRIES LOCALLY TO DEBIT (UBL) ===');
  const targetIds = [1118, 1187];
  const affectedCusIds = new Set();

  try {
    const entries = await prisma.ledger.findMany({
      where: { l_id: { in: targetIds } }
    });

    console.log(`Found ${entries.length} entries.`);

    for (const entry of entries) {
      affectedCusIds.add(entry.cus_id);
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      const amount = Math.max(debit, credit);

      await prisma.ledger.update({
        where: { l_id: entry.l_id },
        data: {
          debit_amount: amount,
          credit_amount: 0,
          trnx_type: 'DEBIT',
          ledger_type: 'Receiving'
        }
      });
      console.log(`🔄 Forced entry ${entry.l_id} to DEBIT (Receiving) with amount ${amount}`);
    }

    console.log('\nRecalculating balances...');
    for (const cusId of affectedCusIds) {
      const account = await prisma.customer.findUnique({
        where: { cus_id: cusId },
        include: { customer_category: true }
      });
      if (!account) continue;

      const remainingEntries = await prisma.ledger.findMany({
        where: { cus_id: cusId },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      if (remainingEntries.length === 0) continue;

      const categoryTitle = (account.customer_category?.cus_cat_title || '').toLowerCase();
      const isCashBank = categoryTitle.includes('cash') || categoryTitle.includes('bank');
      const isSupplier = categoryTitle.includes('supplier') || categoryTitle.includes('labour') || categoryTitle.includes('transport') || categoryTitle.includes('delivery');

      let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const entry of remainingEntries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        let change = 0;
        if (isCashBank) {
          change = debit - credit;
        } else if (isSupplier) {
          change = debit - credit;
        } else {
          change = credit - debit;
        }

        const closing = opening + change;

        if (
          Math.abs(parseFloat(entry.opening_balance) - opening) > 0.01 ||
          Math.abs(parseFloat(entry.closing_balance) - closing) > 0.01
        ) {
          await prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: {
              opening_balance: Number(opening.toFixed(2)),
              closing_balance: Number(closing.toFixed(2))
            }
          });
          balanceUpdateCount++;
        }

        runningBalance = closing;
      }

      await prisma.customer.update({
        where: { cus_id: cusId },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      console.log(`✅ Recalculated account ${account.cus_name}: updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    console.log('\n=== COMPLETE ===');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
