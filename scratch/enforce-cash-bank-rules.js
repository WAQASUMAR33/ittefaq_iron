const { PrismaClient } = require('@prisma/client');

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeUpdate(model, where, data, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(20);
      return await prisma[model].update({ where, data });
    } catch (error) {
      console.warn(`⚠️ Warning: Attempt ${attempt}/${retries} failed. Error: ${error.message}`);
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
  console.log('=== ENFORCING DEBIT/CREDIT COLUMNS FOR CASH & BANK ACCOUNTS ON PRODUCTION ===');

  try {
    // 1. Fetch cash/bank categories
    const cashBankCats = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });
    const cashBankCatIds = cashBankCats.map(c => c.cus_cat_id);

    // 2. Fetch all Cash/Bank accounts
    const accounts = await prisma.customer.findMany({
      where: { cus_category: { in: cashBankCatIds } }
    });

    console.log(`Found ${accounts.length} Cash/Bank accounts.`);
    const affectedCusIds = new Set();
    accounts.forEach(a => affectedCusIds.add(a.cus_id));

    let updatedCount = 0;

    for (const account of accounts) {
      console.log(`Processing: ${account.cus_name} (ID: ${account.cus_id})`);
      
      const entries = await prisma.ledger.findMany({
        where: { cus_id: account.cus_id }
      });

      for (const entry of entries) {
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);
        const amount = Math.max(debit, credit);
        if (amount <= 0) continue;

        const billNo = entry.bill_no || '';
        const details = (entry.details || '').toLowerCase();

        let targetLedgerType = entry.ledger_type;
        let isDebit = true;

        if (billNo.startsWith('PAY-')) {
          const match = billNo.match(/^PAY-(\d+)$/i);
          if (match) {
            const paymentId = parseInt(match[1]);
            const payment = await prisma.payment.findUnique({
              where: { payment_id: paymentId }
            });
            if (payment) {
              const isReceive = payment.payment_type === 'RECEIVE';
              targetLedgerType = isReceive ? 'Receiving' : 'Payment';
              isDebit = isReceive;
            }
          }
        } else if (billNo.startsWith('EXP-')) {
          targetLedgerType = 'Expense';
          isDebit = false;
        } else if (billNo.startsWith('PR-')) {
          targetLedgerType = 'Purchase Return';
          isDebit = true;
        } else if (billNo.startsWith('SR-') || details.includes('sale return') || details.includes('refund')) {
          targetLedgerType = 'Sale Return';
          isDebit = false;
        } else if (details.includes('payment received') || details.includes('receive') || details.includes('deposit')) {
          targetLedgerType = 'Receiving';
          isDebit = true;
        } else if (details.includes('payment to') || details.includes('payment made') || details.includes('paid')) {
          targetLedgerType = 'Payment';
          isDebit = false;
        } else {
          // Fallback based on columns if we can't determine
          isDebit = debit > 0;
          targetLedgerType = isDebit ? 'Receiving' : 'Payment';
        }

        const targetDebit = isDebit ? amount : 0;
        const targetCredit = isDebit ? 0 : amount;
        const targetTrnxType = isDebit ? 'DEBIT' : 'CREDIT';

        if (
          entry.ledger_type !== targetLedgerType ||
          Math.abs(debit - targetDebit) > 0.01 ||
          Math.abs(credit - targetCredit) > 0.01 ||
          entry.trnx_type !== targetTrnxType
        ) {
          await safeUpdate('ledger', { l_id: entry.l_id }, {
            debit_amount: targetDebit,
            credit_amount: targetCredit,
            trnx_type: targetTrnxType,
            ledger_type: targetLedgerType
          });
          updatedCount++;
        }
      }
    }

    console.log(`Updated and aligned ${updatedCount} Cash/Bank ledger entries.`);

    // 3. Recalculate balances for all Cash/Bank accounts and their counterparties
    console.log(`\nRecalculating balances for Cash/Bank accounts...`);
    for (const cusId of affectedCusIds) {
      const account = await prisma.customer.findUnique({
        where: { cus_id: cusId },
        include: { customer_category: true }
      });
      if (!account) continue;

      const entries = await prisma.ledger.findMany({
        where: { cus_id: cusId },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      if (entries.length === 0) continue;

      let runningBalance = parseFloat(entries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const entry of entries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        const change = debit - credit; // Asset rule
        const closing = opening + change;

        if (
          Math.abs(parseFloat(entry.opening_balance) - opening) > 0.01 ||
          Math.abs(parseFloat(entry.closing_balance) - closing) > 0.01
        ) {
          await safeUpdate('ledger', { l_id: entry.l_id }, {
            opening_balance: Number(opening.toFixed(2)),
            closing_balance: Number(closing.toFixed(2))
          });
          balanceUpdateCount++;
        }

        runningBalance = closing;
      }

      await safeUpdate('customer', { cus_id: cusId }, {
        cus_balance: Number(runningBalance.toFixed(2))
      });

      console.log(`✅ Recalculated Cash/Bank account ${account.cus_name} (ID: ${cusId}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    console.log('\n=== ENFORCEMENT COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Fatal production script error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
