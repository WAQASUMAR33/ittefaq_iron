const { PrismaClient } = require('@prisma/client');

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

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
      console.warn(`⚠️ Warning: Attempt ${attempt}/${retries} failed. Error: ${error.message}`);
      if (attempt === retries) throw error;
      if (error.message.includes('closed the connection') || error.message.includes('Can\'t reach database')) {
        console.log('🔄 Re-connecting to production database...');
        try { await prisma.$disconnect(); } catch (e) {}
        await sleep(1000 * attempt);
        prisma = new PrismaClient({
          datasources: {
            db: {
              url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
            }
          }
        });
        await prisma.$connect();
      } else {
        await sleep(500);
      }
    }
  }
}

async function main() {
  console.log('=== FORCING ALL "Receiving" ENTRIES ON "Cash Account" TO DEBIT ===');

  try {
    const entries = await prisma.ledger.findMany({
      where: {
        cus_id: 2551,
        ledger_type: 'Receiving'
      }
    });

    console.log(`Found ${entries.length} "Receiving" entries in Cash Account.`);
    let updatedCount = 0;

    for (const entry of entries) {
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      const amount = Math.max(debit, credit);

      if (credit > 0 || debit === 0) {
        await safeUpdate(entry.l_id, {
          debit_amount: amount,
          credit_amount: 0,
          trnx_type: 'DEBIT'
        });
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} entries to DEBIT in the database.`);

    // Recalculate balances
    console.log('\nRecalculating balances for Cash Account...');
    const remainingEntries = await prisma.ledger.findMany({
      where: { cus_id: 2551 },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    if (remainingEntries.length > 0) {
      let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const entry of remainingEntries) {
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

      await prisma.customer.update({
        where: { cus_id: 2551 },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      console.log(`✅ Recalculated Cash Account: updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    console.log('\n=== DB MIGRATION COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Fatal production error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
