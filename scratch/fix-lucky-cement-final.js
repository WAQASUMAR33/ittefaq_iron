const { PrismaClient } = require('@prisma/client');

const dbLocal = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron"
    }
  }
});

const dbLive = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

async function runFix(prisma, label) {
  console.log(`\n=== Fixing Lucky Cement Limited on ${label} ===`);
  try {
    const account = await prisma.customer.findFirst({
      where: { cus_name: { contains: 'lucky' } }
    });

    if (!account) {
      console.log('Account "lucky cement limited" not found.');
      return;
    }

    console.log(`Target Customer ID: ${account.cus_id}`);

    const entries = await prisma.ledger.findMany({
      where: { cus_id: account.cus_id },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    if (entries.length === 0) {
      console.log('No ledger entries found.');
      return;
    }

    console.log(`Aligning columns for ${entries.length} entries with their transaction types...`);

    for (const entry of entries) {
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      const amount = Math.max(debit, credit);

      const type = (entry.trnx_type || '').toUpperCase();
      let targetDebit = 0;
      let targetCredit = 0;

      if (type === 'DEBIT' || type === 'RECEIVING') {
        targetDebit = amount;
        targetCredit = 0;
      } else {
        // CREDIT, CASH_PAYMENT, BANK_PAYMENT, etc.
        targetDebit = 0;
        targetCredit = amount;
      }

      await prisma.ledger.update({
        where: { l_id: entry.l_id },
        data: {
          debit_amount: targetDebit,
          credit_amount: targetCredit
        }
      });
    }

    console.log('Recalculating running balances...');
    // Re-fetch aligned entries to do chronological balance chaining
    const alignedEntries = await prisma.ledger.findMany({
      where: { cus_id: account.cus_id },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    let runningBalance = parseFloat(alignedEntries[0].opening_balance || 0);
    let updatedCount = 0;

    for (const entry of alignedEntries) {
      const opening = runningBalance;
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      
      const closing = opening + debit - credit;

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
        updatedCount++;
      }

      runningBalance = closing;
    }

    // Update customer table balance
    await prisma.customer.update({
      where: { cus_id: account.cus_id },
      data: { cus_balance: Number(runningBalance.toFixed(2)) }
    });

    console.log(`✅ Complete. Updated ${updatedCount} entries. Final balance: ${runningBalance.toFixed(2)}`);

  } catch (error) {
    console.error(`Error on ${label}:`, error.message);
  }
}

async function main() {
  await runFix(dbLocal, 'Office DB (72.60.76.68)');
  await runFix(dbLive, 'Live DB (195.35.59.84)');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
