const { PrismaClient } = require('@prisma/client');

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeUpdate(l_id, data, retries = 5) {
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
      if (error.message.includes('closed the connection') || error.message.includes('Can\'t reach database')) {
        console.log('🔄 Re-connecting to production database...');
        try { await prisma.$disconnect(); } catch (e) {}
        await sleep(1000 * attempt);
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
  console.log('=== ALIGNING AND RECALCULATING ALL LEDGER ENTRIES ON PRODUCTION DB ===');

  try {
    // 1. Get Cash and Bank categories to check accounts
    const cashBankCats = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });
    const cashBankCatIds = cashBankCats.map(c => c.cus_cat_id);

    // 2. Fetch all PAY- entries
    const payEntries = await prisma.ledger.findMany({
      where: {
        bill_no: { startsWith: 'PAY-' }
      },
      include: {
        customer: true
      }
    });

    console.log(`Found ${payEntries.length} entries starting with PAY-. Resolving correct types and columns...`);

    let resolvedCount = 0;
    for (const entry of payEntries) {
      const match = entry.bill_no.match(/^PAY-(\d+)$/i);
      if (!match) continue;
      
      const paymentId = parseInt(match[1]);
      const payment = await prisma.payment.findUnique({
        where: { payment_id: paymentId }
      });

      if (!payment) {
        console.log(`⚠️ Payment ID ${paymentId} not found in payments table for entry ${entry.l_id}`);
        continue;
      }

      const isCashBank = cashBankCatIds.includes(entry.customer.cus_category);
      const isReceive = payment.payment_type === 'RECEIVE';
      
      // Determine target properties
      let targetLedgerType = isReceive ? 'Receiving' : 'Payment';
      let targetDebit = 0;
      let targetCredit = 0;
      let targetTrnxType = '';

      const amount = Math.max(parseFloat(entry.debit_amount || 0), parseFloat(entry.credit_amount || 0));

      if (isReceive) {
        if (isCashBank) {
          // Cash/Bank account receiving money -> Debit
          targetDebit = amount;
          targetCredit = 0;
          targetTrnxType = 'DEBIT';
        } else {
          // Customer account paying us -> Credit
          targetDebit = 0;
          targetCredit = amount;
          targetTrnxType = 'CREDIT';
        }
      } else {
        // PAY
        if (isCashBank) {
          // Cash/Bank account paying money -> Credit
          targetDebit = 0;
          targetCredit = amount;
          targetTrnxType = 'CREDIT';
        } else {
          // Supplier/Customer receiving money -> Debit
          targetDebit = amount;
          targetCredit = 0;
          targetTrnxType = 'DEBIT';
        }
      }

      if (
        entry.ledger_type !== targetLedgerType ||
        Math.abs(parseFloat(entry.debit_amount) - targetDebit) > 0.01 ||
        Math.abs(parseFloat(entry.credit_amount) - targetCredit) > 0.01 ||
        entry.trnx_type !== targetTrnxType
      ) {
        await safeUpdate(entry.l_id, {
          ledger_type: targetLedgerType,
          debit_amount: targetDebit,
          credit_amount: targetCredit,
          trnx_type: targetTrnxType
        });
        resolvedCount++;
      }
    }

    console.log(`Resolved and aligned columns for ${resolvedCount} payment entries.`);

    // 3. Now recalculate all balances for all accounts to reflect changes
    const accounts = await prisma.customer.findMany({
      include: { customer_category: true }
    });
    console.log(`\nRecalculating balances for ${accounts.length} accounts...`);

    for (const account of accounts) {
      const entries = await prisma.ledger.findMany({
        where: { cus_id: account.cus_id },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

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
          change = debit - credit; // Asset rule: Debit increases, Credit decreases
        } else if (isSupplier) {
          change = debit - credit; // Supplier payable rule: Debit adds, Credit deducts
        } else {
          change = credit - debit; // Customer receivable rule: Credit adds, Debit deducts (Wait! Default in recalculate script is credit adds, debit deducts)
        }

        const closing = opening + change;

        if (
          Math.abs(parseFloat(entry.opening_balance) - opening) > 0.01 ||
          Math.abs(parseFloat(entry.closing_balance) - closing) > 0.01
        ) {
          await safeUpdate(entry.l_id, {
            opening_balance: Number(opening.toFixed(2)),
            closing_balance: Number(closing.toFixed(2))
          });
          balanceUpdateCount++;
        }

        runningBalance = closing;
      }

      // Update customer balance
      await prisma.customer.update({
        where: { cus_id: account.cus_id },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      if (balanceUpdateCount > 0) {
        console.log(`- Account ${account.cus_name} (ID: ${account.cus_id}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
      }
    }

    console.log('\n=== ALL LEDGER ENTRIES SUCCESSFULLY ALIGNED AND RECALCULATED ===');

  } catch (error) {
    console.error('Fatal production script error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
