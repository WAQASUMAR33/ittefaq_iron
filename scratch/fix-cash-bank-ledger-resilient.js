const { PrismaClient } = require('@prisma/client');
let prisma = new PrismaClient();

// Helper for sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Resilient update function
async function safeUpdate(l_id, data, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Small delay between calls to avoid spamming the DB connection
      await sleep(30);
      
      return await prisma.ledger.update({
        where: { l_id },
        data
      });
    } catch (error) {
      console.warn(`⚠️ Warning: Attempt ${attempt}/${retries} failed for l_id ${l_id}. Error: ${error.message}`);
      if (attempt === retries) {
        throw error;
      }
      // Re-initialize Prisma client on connection closed error
      if (error.message.includes('closed the connection') || error.message.includes('Can\'t reach database')) {
        console.log('🔄 Re-connecting to database...');
        try {
          await prisma.$disconnect();
        } catch (e) {}
        await sleep(1000 * attempt); // exponential backoff
        prisma = new PrismaClient();
        await prisma.$connect();
      } else {
        await sleep(500);
      }
    }
  }
}

async function main() {
  console.log('=== RESILIENT FIXING OF CASH & BANK LEDGER ENTRIES ===');

  try {
    const cashBankCategories = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });

    const categoryIds = cashBankCategories.map(c => c.cus_cat_id);
    const accounts = await prisma.customer.findMany({
      where: {
        cus_category: { in: categoryIds }
      }
    });

    console.log(`Found categories: ${cashBankCategories.map(c => c.cus_cat_title).join(', ')}`);
    console.log(`Found ${accounts.length} accounts.`);

    // Process accounts in order
    for (const account of accounts) {
      console.log(`\nProcessing account: ${account.cus_name} (ID: ${account.cus_id})`);

      const entries = await prisma.ledger.findMany({
        where: { cus_id: account.cus_id },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      console.log(`- Found ${entries.length} entries.`);

      let updatedCount = 0;
      for (const entry of entries) {
        const type = entry.ledger_type;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);
        const amount = Math.max(debit, credit);

        let targetDebit = debit;
        let targetCredit = credit;
        let targetTrnxType = entry.trnx_type;

        if (amount > 0) {
          if (['Sale', 'Receiving', 'Purchase Return', 'Order'].includes(type)) {
            targetDebit = amount;
            targetCredit = 0;
            targetTrnxType = 'DEBIT';
          } else if (['Purchase', 'Payment', 'Expense', 'Sale Return'].includes(type)) {
            targetDebit = 0;
            targetCredit = amount;
            targetTrnxType = 'CREDIT';
          } else {
            if (entry.trnx_type === 'DEBIT') {
              targetDebit = amount;
              targetCredit = 0;
            } else if (entry.trnx_type === 'CREDIT') {
              targetDebit = 0;
              targetCredit = amount;
            } else {
              if (debit > 0) {
                targetDebit = debit;
                targetCredit = 0;
                targetTrnxType = 'DEBIT';
              } else {
                targetDebit = 0;
                targetCredit = credit;
                targetTrnxType = 'CREDIT';
              }
            }
          }
        }

        if (
          Math.abs(debit - targetDebit) > 0.01 ||
          Math.abs(credit - targetCredit) > 0.01 ||
          targetTrnxType !== entry.trnx_type
        ) {
          await safeUpdate(entry.l_id, {
            debit_amount: targetDebit,
            credit_amount: targetCredit,
            trnx_type: targetTrnxType
          });
          entry.debit_amount = targetDebit;
          entry.credit_amount = targetCredit;
          entry.trnx_type = targetTrnxType;
          updatedCount++;
        }
      }

      console.log(`- Updated ${updatedCount} entry columns. Recalculating running balances...`);

      let runningBalance = entries.length > 0 ? parseFloat(entries[0].opening_balance || 0) : 0;
      let balanceUpdateCount = 0;

      for (const entry of entries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        const change = debit - credit;
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

      console.log(`- Recalculated balances. Updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);

      // Update customer balance
      await prisma.customer.update({
        where: { cus_id: account.cus_id },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });
    }

    console.log('\n=== ALL LEDGERS SUCCESSFULLY FIXED AND RECALCULATED ===');

  } catch (error) {
    console.error('Fatal script error:', error);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {}
  }
}

main();
