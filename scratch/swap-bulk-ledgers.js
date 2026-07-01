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

const ids = [
  1062, 1092, 1790, 1835, 1833, 1844, 1882, 1872, 1878, 1895, 1898, 1904, 1908, 1911,
  1930, 1934, 1938, 1941, 1948, 1953, 1957, 1980, 1974, 1983, 1986, 1989, 1992, 1999,
  2012, 2020, 2035, 2049, 2088, 2133, 2137, 4143, 2146, 2156, 2162, 2169, 2174, 2181,
  2187, 2190, 2193, 2197, 2200, 2203, 2206, 2213, 2220, 2223, 2226, 2239, 2242, 2257,
  2263, 2266, 2274, 2279, 2304, 2286, 2300, 2308, 2319, 2322, 2334, 2340, 2342, 2355,
  2388, 236
];

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

  const entries = await prisma.ledger.findMany({
    where: { l_id: { in: ids } }
  });

  if (entries.length === 0) {
    console.log('No entries found to swap.');
    return;
  }

  const affectedCusIds = new Set();
  console.log(`Found ${entries.length} matching entries. Swapping columns...`);

  const debitTypes = ['sale', 'receiving', 'order', 'purchase return', 'receipt'];

  for (const entry of entries) {
    affectedCusIds.add(entry.cus_id);
    const amount = Math.max(parseFloat(entry.debit_amount || 0), parseFloat(entry.credit_amount || 0));

    const currentLedgerType = (entry.ledger_type || '').toLowerCase();
    const isCurrentlyDebitInUI = debitTypes.includes(currentLedgerType);

    if (isCurrentlyDebitInUI) {
      // Swap to CREDIT
      await safeUpdateLedger(prisma, url, entry.l_id, {
        debit_amount: 0,
        credit_amount: amount,
        trnx_type: 'CREDIT',
        ledger_type: 'Payment'
      });
      console.log(`  L_ID: ${entry.l_id} (Cus_ID: ${entry.cus_id}) swapped from Debit to CREDIT (${amount}).`);
    } else {
      // Swap to DEBIT
      await safeUpdateLedger(prisma, url, entry.l_id, {
        debit_amount: amount,
        credit_amount: 0,
        trnx_type: 'DEBIT',
        ledger_type: 'Receiving'
      });
      console.log(`  L_ID: ${entry.l_id} (Cus_ID: ${entry.cus_id}) swapped from Credit to DEBIT (${amount}).`);
    }
  }

  // Recalculate running balances for all affected accounts
  console.log(`\nRecalculating balances for affected accounts: ${Array.from(affectedCusIds).join(', ')}...`);

  for (const cusId of affectedCusIds) {
    const account = await prisma.customer.findUnique({
      where: { cus_id: cusId },
      include: { customer_category: true }
    });

    if (!account) {
      console.log(`  Warning: Account ID ${cusId} not found.`);
      continue;
    }

    const remainingEntries = await prisma.ledger.findMany({
      where: { cus_id: cusId },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    if (remainingEntries.length === 0) continue;

    console.log(`  Recalculating ${remainingEntries.length} entries for "${account.cus_name}" (ID: ${cusId})...`);

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

      await safeUpdateLedger(prisma, url, entry.l_id, {
        opening_balance: Number(opening.toFixed(2)),
        closing_balance: Number(closing.toFixed(2))
      });
      balanceUpdateCount++;

      runningBalance = closing;
    }

    await safeUpdateCustomer(prisma, url, cusId, {
      cus_balance: Number(runningBalance.toFixed(2))
    });

    console.log(`  ✅ Account "${account.cus_name}" (ID: ${cusId}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
  }
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
