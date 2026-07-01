const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron"
    }
  }
});

async function main() {
  console.log('=== SWAPPING SPECIFIC UBL ENTRIES ON OFFICE DB (72.60.76.68) ===');
  const targetIds = [1567, 1562, 1560, 1558, 1356];
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

      let targetDebit = 0;
      let targetCredit = 0;
      let targetTrnxType = '';
      let targetLedgerType = entry.ledger_type;

      if (debit > 0) {
        targetDebit = 0;
        targetCredit = amount;
        targetTrnxType = 'CREDIT';
        targetLedgerType = entry.ledger_type === 'Receiving' ? 'Payment' : 'Payment';
      } else {
        targetDebit = amount;
        targetCredit = 0;
        targetTrnxType = 'DEBIT';
        targetLedgerType = entry.ledger_type === 'Payment' ? 'Receiving' : 'Receiving';
      }

      await prisma.ledger.update({
        where: { l_id: entry.l_id },
        data: {
          debit_amount: targetDebit,
          credit_amount: targetCredit,
          trnx_type: targetTrnxType,
          ledger_type: targetLedgerType
        }
      });
      console.log(`🔄 Swapped entry ${entry.l_id} to ${targetTrnxType} (${targetLedgerType})`);
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
