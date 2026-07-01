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
          console.warn('  ⚠️ Reconnection failed:', reconnectErr.message);
        }
      } else {
        await sleep(1000);
      }
    }
  }
}

async function swapLedgerEntries(isLive, label, targetLIds) {
  console.log(`\n==================================================`);
  console.log(`Swapping target entries in ${label}...`);
  console.log(`==================================================`);

  let modifiedCount = 0;

  for (const targetLId of targetLIds) {
    const entry = await safeQuery(isLive, async (tx) => {
      return await tx.ledger.findUnique({ where: { l_id: targetLId } });
    });

    if (!entry) {
      console.log(`  Entry ${targetLId} not found.`);
      continue;
    }

    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);

    let newDebit = 0;
    let newCredit = 0;
    let newTrnxType = 'CREDIT';
    let newLedgerType = 'Payment';

    // If it is currently DEBIT, change to CREDIT
    if (debit > 0 && credit === 0) {
      newDebit = 0;
      newCredit = debit;
      newTrnxType = 'CREDIT';
      newLedgerType = 'Payment';
    } 
    // If it is currently CREDIT, change to DEBIT
    else if (credit > 0 && debit === 0) {
      newDebit = credit;
      newCredit = 0;
      newTrnxType = 'DEBIT';
      newLedgerType = 'Receiving';
    }
    // Fallback if both or none (unlikely but safe)
    else {
      newDebit = credit;
      newCredit = debit;
      newTrnxType = entry.trnx_type === 'DEBIT' ? 'CREDIT' : 'DEBIT';
      newLedgerType = newTrnxType === 'DEBIT' ? 'Receiving' : 'Payment';
    }

    await safeQuery(isLive, async (tx) => {
      return await tx.ledger.update({
        where: { l_id: targetLId },
        data: {
          debit_amount: newDebit,
          credit_amount: newCredit,
          trnx_type: newTrnxType,
          ledger_type: newLedgerType
        }
      });
    });

    console.log(`  ✅ Entry ${targetLId} swapped: [Debit: ${debit} -> ${newDebit}] [Credit: ${credit} -> ${newCredit}] [Type: ${entry.ledger_type} -> ${newLedgerType}]`);
    modifiedCount++;
  }

  return modifiedCount > 0;
}

async function recalculateCashAccount(isLive, label) {
  console.log(`\nRecalculating balances for Cash Account (ID: 2551) in ${label}...`);
  
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

  console.log(`  Calculating balances for ${remainingEntries.length} entries in memory...`);

  let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
  const whenOpening = [];
  const whenClosing = [];
  const idsToUpdate = [];

  for (const entry of remainingEntries) {
    const opening = runningBalance;
    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);

    const change = debit - credit;
    const closing = opening + change;

    whenOpening.push(`WHEN ${entry.l_id} THEN ${Number(opening.toFixed(2))}`);
    whenClosing.push(`WHEN ${entry.l_id} THEN ${Number(closing.toFixed(2))}`);
    idsToUpdate.push(entry.l_id);

    runningBalance = closing;
  }

  console.log('  Executing fast bulk SQL update...');
  const query = `
    UPDATE ledger
    SET
      opening_balance = CASE l_id
        ${whenOpening.join('\n')}
      END,
      closing_balance = CASE l_id
        ${whenClosing.join('\n')}
      END
    WHERE l_id IN (${idsToUpdate.join(',')})
  `;

  await safeQuery(isLive, async (prisma) => {
    return await prisma.$executeRawUnsafe(query);
  });

  await safeQuery(isLive, async (prisma) => {
    return await prisma.customer.update({
      where: { cus_id: 2551 },
      data: { cus_balance: Number(runningBalance.toFixed(2)) }
    });
  });

  console.log(`  ✅ Cash Account balance recalculation complete. Final balance: ${runningBalance.toFixed(2)}`);
}

async function main() {
  const targetLIds = [2502, 2428, 1960, 1891, 1868, 1865, 1862, 1859, 1853, 1850, 1847, 1838, 1841, 1830, 236];

  // 1. Process Office DB
  try {
    const modified = await swapLedgerEntries(false, 'Office DB (72.60.76.68)', targetLIds);
    if (modified) {
      await recalculateCashAccount(false, 'Office DB');
    }
    console.log('✅ Completed Office DB processing successfully.');
  } catch (error) {
    console.error('❌ Failed processing Office DB:', error.message);
  }

  // 2. Process Live DB
  try {
    const modified = await swapLedgerEntries(true, 'Live DB (195.35.59.84)', targetLIds);
    if (modified) {
      await recalculateCashAccount(true, 'Live DB');
    }
    console.log('✅ Completed Live DB processing successfully.');
  } catch (error) {
    console.error('❌ Failed processing Live DB:', error.message);
  }

  try { await dbLocal.$disconnect(); } catch (e) {}
  try { await dbLive.$disconnect(); } catch (e) {}
}

main();
