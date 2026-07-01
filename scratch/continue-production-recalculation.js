const { PrismaClient } = require('@prisma/client');

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Resilient wrapper for any Prisma query
async function safeQuery(fn, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(20);
      return await fn();
    } catch (error) {
      console.warn(`⚠️ Warning: Query attempt ${attempt}/${retries} failed. Error: ${error.message}`);
      if (attempt === retries) throw error;
      
      if (error.message.includes('closed the connection') || error.message.includes('reach database') || error.message.includes('connection')) {
        console.log('🔄 Re-connecting to production database...');
        try { await prisma.$disconnect(); } catch (e) {}
        await sleep(1500 * attempt);
        prisma = new PrismaClient({
          datasources: {
            db: {
              url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
            }
          }
        });
        await prisma.$connect();
      } else {
        await sleep(500);
      }
    }
  }
}

async function main() {
  console.log('=== CONTINUING RESILIENT BALANCE RECALCULATION ON PRODUCTION DB ===');

  try {
    const accounts = await safeQuery(() => prisma.customer.findMany({
      include: { customer_category: true }
    }));
    
    console.log(`Loaded ${accounts.length} accounts. Starting chronological balance recalculation...`);

    let processedCount = 0;
    for (const account of accounts) {
      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`Progress: Processed ${processedCount}/${accounts.length} accounts...`);
      }

      // Fetch ledger entries safely
      const entries = await safeQuery(() => prisma.ledger.findMany({
        where: { cus_id: account.cus_id },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      }));

      if (entries.length === 0) continue;

      const categoryTitle = (account.customer_category?.cus_cat_title || '').toLowerCase();
      const isCashBank = categoryTitle.includes('cash') || categoryTitle.includes('bank');
      const isSupplier = categoryTitle.includes('supplier') || categoryTitle.includes('labour') || categoryTitle.includes('transport') || categoryTitle.includes('delivery');

      let runningBalance = parseFloat(entries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const entry of entries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        let change = 0;
        if (isCashBank) {
          change = debit - credit; // Asset: Debit increases, Credit decreases
        } else if (isSupplier) {
          change = debit - credit; // Supplier payable: Debit adds, Credit deducts
        } else {
          change = credit - debit; // Customer receivable: Credit adds, Debit deducts
        }

        const closing = opening + change;

        if (
          Math.abs(parseFloat(entry.opening_balance) - opening) > 0.01 ||
          Math.abs(parseFloat(entry.closing_balance) - closing) > 0.01
        ) {
          await safeQuery(() => prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: {
              opening_balance: Number(opening.toFixed(2)),
              closing_balance: Number(closing.toFixed(2))
            }
          }));
          balanceUpdateCount++;
        }

        runningBalance = closing;
      }

      // Update customer balance safely
      await safeQuery(() => prisma.customer.update({
        where: { cus_id: account.cus_id },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      }));

      if (balanceUpdateCount > 0) {
        console.log(`✅ [${processedCount}/${accounts.length}] Account ${account.cus_name} (ID: ${account.cus_id}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
      }
    }

    console.log('\n=== ALL PRODUCTION LEDGER BALANCES RECALCULATED AND RESYNCED ===');

  } catch (error) {
    console.error('Fatal production script error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
