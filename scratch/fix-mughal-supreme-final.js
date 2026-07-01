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
    where: { cus_id: 2558 }
  });

  if (!account) {
    console.log('Mughal Supreme account not found.');
    return;
  }

  const cusId = account.cus_id;
  console.log(`Found account "${account.cus_name}" with ID: ${cusId}`);

  // 1. Ensure entries 726, 728, 730 are DEBIT (debit_amount = amount, credit_amount = 0)
  console.log('Ensuring ledger entries 726, 728, 730 are DEBIT...');
  const debitTargets = [
    { id: 726, amount: 1255000 },
    { id: 728, amount: 2350000 },
    { id: 730, amount: 1000000 }
  ];

  for (const target of debitTargets) {
    await prisma.ledger.update({
      where: { l_id: target.id },
      data: {
        debit_amount: target.amount,
        credit_amount: 0,
        trnx_type: 'DEBIT'
      }
    });
    console.log(`  Set entry ${target.id} to DEBIT (${target.amount}).`);
  }

  // 2. Ensure entries 1286, 1287 are CREDIT (debit_amount = 0, credit_amount = amount)
  console.log('Ensuring ledger entries 1286, 1287 are CREDIT...');
  const creditTargets = [
    { id: 1286, amount: 7559143 },
    { id: 1287, amount: 5079969 }
  ];

  for (const target of creditTargets) {
    await prisma.ledger.update({
      where: { l_id: target.id },
      data: {
        debit_amount: 0,
        credit_amount: target.amount,
        trnx_type: 'CREDIT',
        ledger_type: 'Purchase'
      }
    });
    console.log(`  Set entry ${target.id} to CREDIT (${target.amount}).`);
  }

  // 3. Recalculate balances
  console.log('Recalculating ledger balances (debit adds, credit subtracts)...');
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
    
    // Debit increases supplier balance (+), Credit decreases supplier balance (-)
    const closing = opening + debit - credit;

    await prisma.ledger.update({
      where: { l_id: entry.l_id },
      data: {
        opening_balance: Number(opening.toFixed(2)),
        closing_balance: Number(closing.toFixed(2))
      }
    });
    updatedCount++;

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
