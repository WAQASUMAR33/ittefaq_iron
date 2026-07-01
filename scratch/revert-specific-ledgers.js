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

async function revertDb(prisma, label, url, isLive) {
  console.log(`\n==================================================`);
  console.log(`Reverting Changes on: ${label}`);
  console.log(`==================================================`);

  // Original states list
  const originals = [
    { id: 254, debit: isLive ? 0 : 5000, credit: 5000, type: 'CREDIT' },
    { id: 256, debit: 0, credit: 30000, type: 'CREDIT' },
    { id: 258, debit: 0, credit: 50000, type: 'CREDIT' },
    { id: 260, debit: 0, credit: 90000, type: 'CREDIT' },
    { id: 262, debit: 0, credit: 50000, type: 'CREDIT' },
    { id: 266, debit: 78000, credit: 0, type: 'DEBIT' },
    { id: 272, debit: isLive ? 0 : 62250, credit: isLive ? 62250 : 0, type: isLive ? 'CREDIT' : 'DEBIT' },
    { id: 651, debit: 17452, credit: 0, type: 'DEBIT' },
    { id: 958, debit: 0, credit: 6000, type: 'CREDIT' }
  ];

  const affectedCusIds = new Set();

  for (const orig of originals) {
    const entry = await prisma.ledger.findUnique({ where: { l_id: orig.id } });
    if (!entry) {
      console.log(`  Warning: Entry ${orig.id} not found.`);
      continue;
    }
    affectedCusIds.add(entry.cus_id);

    await safeUpdateLedger(prisma, url, orig.id, {
      debit_amount: orig.debit,
      credit_amount: orig.credit,
      trnx_type: orig.type
    });
    console.log(`  Restored entry ${orig.id}: Debit=${orig.debit}, Credit=${orig.credit}, Type=${orig.type}`);
  }

  // Recalculate balances
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
    await revertDb(dbLocal, 'Office DB (72.60.76.68)', localUrl, false);
    await revertDb(dbLive, 'Live DB (195.35.59.84)', liveUrl, true);
  } catch (error) {
    console.error('An error occurred during execution:', error);
  } finally {
    try { await dbLocal.$disconnect(); } catch (e) {}
    try { await dbLive.$disconnect(); } catch (e) {}
  }
}

main();
