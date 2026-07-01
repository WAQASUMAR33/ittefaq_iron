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

async function recalculate(prisma, label) {
  console.log(`\n=== Recalculating Lucky Cement Limited on ${label} ===`);
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

    console.log(`Recalculating ${entries.length} entries...`);

    let runningBalance = parseFloat(entries[0].opening_balance || 0);
    let updatedCount = 0;

    for (const entry of entries) {
      const opening = runningBalance;
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      
      // Debit increases balance (+), Credit decreases balance (-)
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

    // Update customer balance
    await prisma.customer.update({
      where: { cus_id: account.cus_id },
      data: { cus_balance: Number(runningBalance.toFixed(2)) }
    });

    console.log(`✅ Completed. Updated ${updatedCount} entries. Final customer balance set to: ${runningBalance.toFixed(2)}`);

  } catch (error) {
    console.error(`Error on ${label}:`, error.message);
  }
}

async function main() {
  await recalculate(dbLocal, 'Office DB (72.60.76.68)');
  await recalculate(dbLive, 'Live DB (195.35.59.84)');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
