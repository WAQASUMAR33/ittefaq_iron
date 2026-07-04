const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeUpdate(l_id, data, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(20);
      return await prisma.ledger.update({
        where: { l_id },
        data
      });
    } catch (error) {
      console.warn(`⚠️ Warning: Attempt ${attempt}/${retries} failed for l_id ${l_id}. Error: ${error.message}`);
      if (attempt === retries) throw error;
      await sleep(500);
    }
  }
}

async function main() {
  console.log('=== FIXING ALL CASH & BANK LEDGER TYPES ON PRODUCTION ===');

  try {
    const cashBankCategories = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });

    const categoryIds = cashBankCategories.map(c => c.cus_cat_id);
    const accounts = await prisma.customer.findMany({
      where: {
        cus_category: { in: categoryIds }
      }
    });

    console.log(`Found ${accounts.length} Cash/Bank accounts.`);

    for (const account of accounts) {
      console.log(`\nProcessing account: ${account.cus_name} (ID: ${account.cus_id})`);

      const entries = await prisma.ledger.findMany({
        where: { cus_id: account.cus_id },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      let updatedCount = 0;
      for (const entry of entries) {
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);
        const detLower = (entry.details || '').toLowerCase();

        let targetLedgerType = entry.ledger_type;

        if (detLower.includes('order') || detLower.includes('advance payment')) {
          targetLedgerType = 'Order';
        } else if (debit > 0) {
          targetLedgerType = 'Receiving';
        } else if (credit > 0) {
          targetLedgerType = 'Payment';
        }

        if (entry.ledger_type !== targetLedgerType) {
          await safeUpdate(entry.l_id, {
            ledger_type: targetLedgerType
          });
          entry.ledger_type = targetLedgerType;
          updatedCount++;
        }
      }

      console.log(`- Updated ${updatedCount} entries' ledger_type.`);

      // Recalculate running balance
      let runningBalance = entries.length > 0 ? parseFloat(entries[0].opening_balance || 0) : 0;
      let balanceUpdateCount = 0;

      for (const entry of entries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        const change = debit - credit;
        const closing = opening + change;

        if (
          Math.abs(parseFloat(entry.opening_balance) - opening) > 0.01 ||
          Math.abs(parseFloat(entry.closing_balance) - closing) > 0.01
        ) {
          await safeUpdate(entry.l_id, {
            opening_balance: Number(opening.toFixed(2)),
            closing_balance: Number(closing.toFixed(2))
          });
          balanceUpdateCount++;
        }

        runningBalance = closing;
      }

      console.log(`- Recalculated balances. Updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);

      await prisma.customer.update({
        where: { cus_id: account.cus_id },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });
    }

    console.log('\n=== ALL CASH & BANK TYPES & BALANCES COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Fatal production script error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
