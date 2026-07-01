const { PrismaClient } = require('@prisma/client');

const localUrl = "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron";
const liveUrl = "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali";

let dbLocal = new PrismaClient({
  datasources: { db: { url: localUrl } }
});

let dbLive = new PrismaClient({
  datasources: { db: { url: liveUrl } }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getDbClient(isLive) {
  return isLive ? dbLive : dbLocal;
}

async function safeQuery(isLive, queryFn, retries = 5) {
  let url = isLive ? liveUrl : localUrl;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await getDbClient(isLive);
      return await queryFn(client);
    } catch (error) {
      console.warn(`⚠️ Warning: Query attempt ${attempt}/${retries} failed. Error: ${error.message}`);
      if (attempt === retries) throw error;
      if (error.message.includes('closed the connection') || error.message.includes('Can\'t reach database') || error.message.includes('connection')) {
        console.log('🔄 Re-connecting to database...');
        try {
          const oldClient = await getDbClient(isLive);
          await oldClient.$disconnect();
        } catch (e) {}
        await sleep(2000 * attempt);
        try {
          const newClient = new PrismaClient({
            datasources: { db: { url } }
          });
          await newClient.$connect();
          if (isLive) {
            dbLive = newClient;
          } else {
            dbLocal = newClient;
          }
          console.log('  ✅ Reconnected successfully.');
        } catch (reconnectErr) {
          console.warn(`  ⚠️ Reconnection attempt ${attempt} failed: ${reconnectErr.message}`);
        }
      } else {
        await sleep(1000);
      }
    }
  }
}

async function processDb(isLive, label) {
  console.log(`\n==================================================`);
  console.log(`Processing Database: ${label}`);
  console.log(`==================================================`);

  // 1. Check if source account 2729 exists
  const sourceAccount = await safeQuery(isLive, async (prisma) => {
    return await prisma.customer.findUnique({
      where: { cus_id: 2729 }
    });
  });

  if (!sourceAccount) {
    console.log(`  Source account ID 2729 ("masjid binat chak zahir") not found in ${label}. Skipping transfer.`);
  } else {
    console.log(`  Found source account: "${sourceAccount.cus_name}" (ID: 2729)`);

    // 2. Fetch all ledger entries of 2729
    const entries = await safeQuery(isLive, async (prisma) => {
      return await prisma.ledger.findMany({
        where: { cus_id: 2729 }
      });
    });

    if (entries.length > 0) {
      console.log(`  Moving ${entries.length} entries to Cash Account (ID: 2551)...`);

      for (const entry of entries) {
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        let alignedLedgerType = entry.ledger_type;
        if (debit > 0) {
          alignedLedgerType = 'Receiving';
        } else if (credit > 0) {
          alignedLedgerType = 'Payment';
        }

        await safeQuery(isLive, async (prisma) => {
          return await prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: {
              cus_id: 2551,
              ledger_type: alignedLedgerType
            }
          });
        });
      }
    } else {
      console.log('  No remaining entries to move (already moved).');
    }

    // Reset source customer balance
    await safeQuery(isLive, async (prisma) => {
      return await prisma.customer.update({
        where: { cus_id: 2729 },
        data: { cus_balance: 0 }
      });
    });
    console.log(`  ✅ Checked entries and reset balance for account 2729 to 0.`);
  }

  // 3. Recalculate Cash Account (2551) running balance
  console.log('\nRecalculating balances for Cash Account (ID: 2551)...');
  const remainingEntries = await safeQuery(isLive, async (prisma) => {
    return await prisma.ledger.findMany({
      where: { cus_id: 2551 },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });
  });

  if (remainingEntries.length === 0) {
    console.log('  No entries found for Cash Account.');
    return;
  }

  let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
  let balanceUpdateCount = 0;

  for (const entry of remainingEntries) {
    const opening = runningBalance;
    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);

    const change = debit - credit;
    const closing = opening + change;

    await safeQuery(isLive, async (prisma) => {
      return await prisma.ledger.update({
        where: { l_id: entry.l_id },
        data: {
          opening_balance: Number(opening.toFixed(2)),
          closing_balance: Number(closing.toFixed(2))
        }
      });
    });
    balanceUpdateCount++;

    runningBalance = closing;
  }

  await safeQuery(isLive, async (prisma) => {
    return await prisma.customer.update({
      where: { cus_id: 2551 },
      data: { cus_balance: Number(runningBalance.toFixed(2)) }
    });
  });

  console.log(`  ✅ Cash Account: updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
}

async function main() {
  try {
    await processDb(false, 'Office DB (72.60.76.68)');
    await processDb(true, 'Live DB (195.35.59.84)');
  } catch (error) {
    console.error('An error occurred during execution:', error);
  } finally {
    try { await dbLocal.$disconnect(); } catch (e) {}
    try { await dbLive.$disconnect(); } catch (e) {}
  }
}

main();
