const { PrismaClient } = require('@prisma/client');

let dbLocal = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron"
    }
  }
});

let dbLive = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeUpdateLedger(prisma, url, l_id, data, retries = 5) {
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
      if (error.message.includes('closed the connection') || error.message.includes('Can\'t reach database') || error.message.includes('connection')) {
        console.log('🔄 Re-connecting to database...');
        try { await prisma.$disconnect(); } catch (e) {}
        await sleep(1000 * attempt);
        prisma = new PrismaClient({
          datasources: { db: { url } }
        });
        await prisma.$connect();
      } else {
        await sleep(500);
      }
    }
  }
}

async function safeUpdateCustomer(prisma, url, cus_id, data, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(20);
      return await prisma.customer.update({
        where: { cus_id },
        data
      });
    } catch (error) {
      console.warn(`⚠️ Warning: Attempt ${attempt}/${retries} failed for customer ${cus_id}. Error: ${error.message}`);
      if (attempt === retries) throw error;
      if (error.message.includes('closed the connection') || error.message.includes('Can\'t reach database') || error.message.includes('connection')) {
        console.log('🔄 Re-connecting to database...');
        try { await prisma.$disconnect(); } catch (e) {}
        await sleep(1000 * attempt);
        prisma = new PrismaClient({
          datasources: { db: { url } }
        });
        await prisma.$connect();
      } else {
        await sleep(500);
      }
    }
  }
}

async function processDb(prisma, label, url) {
  console.log(`\n==================================================`);
  console.log(`Processing Database: ${label}`);
  console.log(`==================================================`);

  const creditIds = [266, 272, 1051];
  const debitIds = [254, 256, 258, 260, 262, 958];

  // 1. Process Credit targets
  console.log('Processing CREDIT updates...');
  for (const id of creditIds) {
    const entry = await prisma.ledger.findUnique({ where: { l_id: id } });
    if (!entry) {
      console.log(`  Warning: Entry ${id} not found.`);
      continue;
    }
    const amount = Math.max(parseFloat(entry.debit_amount || 0), parseFloat(entry.credit_amount || 0));

    await safeUpdateLedger(prisma, url, id, {
      debit_amount: 0,
      credit_amount: amount,
      trnx_type: 'CREDIT',
      ledger_type: 'Payment' // Any type not in ['sale', 'receiving', 'order', 'purchase return', 'receipt'] to render under credit
    });
    console.log(`  Set entry ${id} to CREDIT (${amount}) and ledger_type=Payment.`);
  }

  // 2. Process Debit targets
  console.log('Processing DEBIT updates...');
  for (const id of debitIds) {
    const entry = await prisma.ledger.findUnique({ where: { l_id: id } });
    if (!entry) {
      console.log(`  Warning: Entry ${id} not found.`);
      continue;
    }
    const amount = Math.max(parseFloat(entry.debit_amount || 0), parseFloat(entry.credit_amount || 0));

    await safeUpdateLedger(prisma, url, id, {
      debit_amount: amount,
      credit_amount: 0,
      trnx_type: 'DEBIT',
      ledger_type: 'Receiving' // Any type in ['sale', 'receiving', 'order', 'purchase return', 'receipt'] to render under debit
    });
    console.log(`  Set entry ${id} to DEBIT (${amount}) and ledger_type=Receiving.`);
  }

  // 3. Recalculate Cash Account (2551) running balance
  console.log('\nRecalculating balances for Cash Account (ID: 2551)...');
  const remainingEntries = await prisma.ledger.findMany({
    where: { cus_id: 2551 },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });

  if (remainingEntries.length === 0) {
    console.log('No entries found.');
    return;
  }

  let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
  let balanceUpdateCount = 0;

  for (const entry of remainingEntries) {
    const opening = runningBalance;
    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);

    // Cash/Bank uses: change = debit - credit
    const change = debit - credit;
    const closing = opening + change;

    await safeUpdateLedger(prisma, url, entry.l_id, {
      opening_balance: Number(opening.toFixed(2)),
      closing_balance: Number(closing.toFixed(2))
    });
    balanceUpdateCount++;

    runningBalance = closing;
  }

  await safeUpdateCustomer(prisma, url, 2551, {
    cus_balance: Number(runningBalance.toFixed(2))
  });

  console.log(`  ✅ Cash Account: updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
}

async function main() {
  const localUrl = "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron";
  const liveUrl = "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali";

  try {
    await processDb(dbLocal, 'Office DB (72.60.76.68)', localUrl);
    await processDb(dbLive, 'Live DB (195.35.59.84)', liveUrl);
  } catch (error) {
    console.error('An error occurred during execution:', error);
  } finally {
    try { await dbLocal.$disconnect(); } catch (e) {}
    try { await dbLive.$disconnect(); } catch (e) {}
  }
}

main();
