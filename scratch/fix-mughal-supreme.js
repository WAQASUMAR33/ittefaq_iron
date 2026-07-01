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

  // 1. Get the account
  const account = await prisma.customer.findUnique({
    where: { cus_id: 2558 }
  });

  if (!account) {
    console.log('Mughal Supreme account not found.');
    return;
  }

  const cusId = account.cus_id;
  console.log(`Found account "${account.cus_name}" with ID: ${cusId}`);

  // 2. Update specific entries: 726, 728, 730
  const targetIds = [726, 728, 730];
  console.log(`Updating ledger entries ${targetIds.join(', ')} to debit...`);

  for (const id of targetIds) {
    const entry = await prisma.ledger.findUnique({ where: { l_id: id } });
    if (!entry) {
      console.log(`  Warning: Ledger entry ${id} not found.`);
      continue;
    }

    const amount = Math.max(parseFloat(entry.debit_amount || 0), parseFloat(entry.credit_amount || 0), parseFloat(entry.payments || 0));

    await prisma.ledger.update({
      where: { l_id: id },
      data: {
        debit_amount: amount,
        credit_amount: 0,
        trnx_type: 'DEBIT'
      }
    });
    console.log(`  Updated entry ${id}: Debit set to ${amount}.`);
  }

  // 3. Recalculate balances
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
      targetIds.includes(entry.l_id)
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

  // 4. Update customer balance in customer table
  await prisma.customer.update({
    where: { cus_id: cusId },
    data: { cus_balance: Number(runningBalance.toFixed(2)) }
  });

  console.log(`Recalculation complete. Updated ${updatedCount} entries.`);
  console.log(`Final customer balance set in table: ${runningBalance.toFixed(2)}`);

  // 5. Print all entries after to verify
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
