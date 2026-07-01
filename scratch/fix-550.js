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

async function processDb(prisma, label) {
  console.log(`\n==================================================`);
  console.log(`Processing Database: ${label}`);
  console.log(`==================================================`);

  const account = await prisma.customer.findUnique({
    where: { cus_id: 2577 }
  });

  if (!account) {
    console.log('ism steel gujranwala account (ID 2577) not found.');
    return;
  }

  const cusId = account.cus_id;
  console.log(`Found account "${account.cus_name}" with ID: ${cusId}`);

  // 2. Print entry 550 before
  const entryBefore = await prisma.ledger.findUnique({
    where: { l_id: 550 }
  });
  if (!entryBefore) {
    console.log('Ledger entry 550 not found.');
    return;
  }
  console.log('Entry 550 before modification:');
  console.log(JSON.stringify(entryBefore, null, 2));

  // 3. Update entry 550
  console.log('Updating entry 550...');
  await prisma.ledger.update({
    where: { l_id: 550 },
    data: {
      debit_amount: 1300000,
      credit_amount: 0,
      trnx_type: 'DEBIT'
    }
  });
  console.log('Entry 550 updated successfully.');

  // 4. Recalculate balances
  console.log('Recalculating ledger balances...');
  const entries = await prisma.ledger.findMany({
    where: { cus_id: cusId },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });

  if (entries.length === 0) {
    console.log('No ledger entries found to recalculate.');
    return;
  }

  let runningBalance = parseFloat(entries[0].opening_balance || 0);
  let updatedCount = 0;

  for (const entry of entries) {
    const opening = runningBalance;
    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);
    
    // Debit increases balance (+), Credit decreases balance (-)
    const closing = opening + debit - credit;

    const currentOpening = parseFloat(entry.opening_balance || 0);
    const currentClosing = parseFloat(entry.closing_balance || 0);

    if (
      Math.abs(currentOpening - opening) > 0.01 ||
      Math.abs(currentClosing - closing) > 0.01 ||
      entry.l_id === 550
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

  // 5. Update customer balance in customer table
  await prisma.customer.update({
    where: { cus_id: cusId },
    data: { cus_balance: Number(runningBalance.toFixed(2)) }
  });

  console.log(`Recalculation complete. Updated ${updatedCount} entries.`);
  console.log(`Final customer balance set in table: ${runningBalance.toFixed(2)}`);

  // 6. Print all entries after to verify
  console.log('\nVerified ledger entries after update:');
  const verifiedEntries = await prisma.ledger.findMany({
    where: { cus_id: cusId },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });
  for (const entry of verifiedEntries) {
    console.log(`  L_ID: ${entry.l_id}, Opening: ${entry.opening_balance}, Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount}, Closing: ${entry.closing_balance}, Trnx Type: ${entry.trnx_type}`);
  }
}

async function main() {
  try {
    await processDb(dbLocal, 'Office DB (72.60.76.68)');
    await processDb(dbLive, 'Live DB (195.35.59.84)');
  } catch (error) {
    console.error('An error occurred during execution:', error);
  } finally {
    await dbLocal.$disconnect();
    await dbLive.$disconnect();
  }
}

main();
