const { PrismaClient } = require('@prisma/client');

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== DELETING SPECIFIC LEDGER ENTRIES ON PRODUCTION ===');
  const targetIds = [1733, 1736, 1739, 1742, 1747, 1745, 1752];

  try {
    // 1. Get info on entries to see which cus_ids are affected
    const entries = await prisma.ledger.findMany({
      where: { l_id: { in: targetIds } }
    });

    const affectedCusIds = new Set(entries.map(e => e.cus_id));

    // 2. Delete the ledger entries
    const deleteResult = await prisma.ledger.deleteMany({
      where: { l_id: { in: targetIds } }
    });
    console.log(`Successfully deleted ${deleteResult.count} ledger entries from the database.`);

    // 3. Recalculate balances for all affected customer/cash accounts
    console.log(`\nRecalculating balances for ${affectedCusIds.size} affected accounts...`);

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

      if (remainingEntries.length === 0) {
        await prisma.customer.update({
          where: { cus_id: cusId },
          data: { cus_balance: 0 }
        });
        console.log(`Account ${account.cus_name} (ID: ${cusId}) has 0 entries now. Balance reset to 0.`);
        continue;
      }

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

      console.log(`✅ Recalculated account ${account.cus_name} (ID: ${cusId}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    console.log('\n=== LEDGER DELETION AND RECALCULATION COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Fatal production script error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
