const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeUpdate(l_id, data, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(10);
      return await prisma.ledger.update({
        where: { l_id },
        data
      });
    } catch (error) {
      console.warn(`⚠️ Warning: Attempt ${attempt}/${retries} failed for l_id ${l_id}. Error: ${error.message}`);
      if (attempt === retries) throw error;
      await sleep(200);
    }
  }
}

async function main() {
  console.log(`=== SWAPPING COLUMNS AND RECALCULATING FOR SPECIFIC LEDGER ENTRIES ON DATABASE: ${process.env.DATABASE_URL.split('@')[1]} ===`);
  
  const targetIds = [
    437, 535, 551, 571, 588, 590, 593, 615, 661, 666, 668, 673, 675, 767, 729, 745, 
    874, 889, 897, 891, 899, 901, 956, 966, 994, 1017, 1053, 1055, 1088, 1090, 1096, 
    1112, 1155, 1166, 1183, 1189, 1219, 1221, 1223, 1225, 1227, 1230, 1233, 1235, 1237, 
    1240, 1243, 1250, 1252, 1254, 1258, 1260, 1262, 1264, 1266, 1268, 1279, 1272, 1283, 
    1310, 1312, 1321, 1333, 1335, 1337, 1347, 1366, 1409, 1419, 1425, 1450, 1488, 1495, 
    1532, 1534, 1252, 1556
  ];

  try {
    const entries = await prisma.ledger.findMany({
      where: { l_id: { in: targetIds } }
    });

    console.log(`Found ${entries.length} entries of ${targetIds.length} target IDs to swap.`);
    const affectedCusIds = new Set();

    for (const entry of entries) {
      affectedCusIds.add(entry.cus_id);
      
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      const amount = Math.max(debit, credit);

      let targetDebit = 0;
      let targetCredit = 0;
      let targetTrnxType = '';
      let targetLedgerType = entry.ledger_type;

      if (debit > 0) {
        targetDebit = 0;
        targetCredit = amount;
        targetTrnxType = 'CREDIT';
        targetLedgerType = 'Payment';
      } else {
        targetDebit = amount;
        targetCredit = 0;
        targetTrnxType = 'DEBIT';
        targetLedgerType = 'Receiving';
      }

      await safeUpdate(entry.l_id, {
        debit_amount: targetDebit,
        credit_amount: targetCredit,
        trnx_type: targetTrnxType,
        ledger_type: targetLedgerType
      });
      console.log(`🔄 Swapped entry ${entry.l_id}: was ${debit > 0 ? 'DEBIT' : 'CREDIT'} (${amount}) -> now ${targetTrnxType}`);
    }

    // Recalculate balances
    console.log(`\nRecalculating balances for affected accounts...`);

    for (const cusId of affectedCusIds) {
      const account = await prisma.customer.findUnique({
        where: { cus_id: cusId },
        include: { customer_category: true }
      });

      if (!account) continue;

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
          balanceUpdateCount++;
        }

        runningBalance = closing;
      }

      await prisma.customer.update({
        where: { cus_id: cusId },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      console.log(`✅ Recalculated account ${account.cus_name} (ID: ${cusId}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    console.log('\n=== SWAP AND RECALCULATION COMPLETED COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Fatal local database script error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
