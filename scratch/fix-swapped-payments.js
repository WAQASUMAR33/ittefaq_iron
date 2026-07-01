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
      console.warn(`⚠️ Warning: Attempt ${attempt}/${retries} failed for ${model} update. Error: ${error.message}`);
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
  console.log('=== STARTING SWAPPED PAYMENTS CORRECTION ON PRODUCTION ===');

  try {
    // 1. Find the 10 Cash/Bank ledger entries
    const cashBankEntries = await prisma.ledger.findMany({
      where: {
        details: { contains: 'payment to customer account' }
      }
    });

    console.log(`Found ${cashBankEntries.length} swapped ledger entries to correct.`);
    const affectedCusIds = new Set();

    for (const cashEntry of cashBankEntries) {
      const billNo = cashEntry.bill_no;
      const match = billNo.match(/^PAY-(\d+)$/i);
      if (!match) continue;

      const paymentId = parseInt(match[1]);
      console.log(`\nCorrecting Transaction ${billNo} (Payment ID: ${paymentId})`);

      // A. Update the parent payment type in payments table to 'PAY'
      await safeUpdate('payment', { payment_id: paymentId }, { payment_type: 'PAY' });
      console.log(`  - Updated Payment ID ${paymentId} type to 'PAY'`);

      // B. Fetch all ledger entries under this bill_no
      const allEntries = await prisma.ledger.findMany({
        where: { bill_no: billNo }
      });

      for (const entry of allEntries) {
        affectedCusIds.add(entry.cus_id);
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);
        const amount = Math.max(debit, credit);

        let targetDebit = 0;
        let targetCredit = 0;
        let targetTrnxType = '';

        // Invert the columns: if it was Debit, it becomes Credit (cash goes out); if it was Credit, it becomes Debit (customer receives payout)
        if (debit > 0) {
          targetDebit = 0;
          targetCredit = amount;
          targetTrnxType = 'CREDIT';
        } else {
          targetDebit = amount;
          targetCredit = 0;
          targetTrnxType = 'DEBIT';
        }

        // Change ledger_type to 'Payment' since it is now corrected to a payout
        await safeUpdate('ledger', { l_id: entry.l_id }, {
          debit_amount: targetDebit,
          credit_amount: targetCredit,
          trnx_type: targetTrnxType,
          ledger_type: 'Payment'
        });
        console.log(`  - Updated Ledger Entry ${entry.l_id} (cus_id ${entry.cus_id}): Debit=${targetDebit}, Credit=${targetCredit}, Trnx=${targetTrnxType}`);
      }
    }

    // 2. Recalculate balances for all affected customer/cash accounts
    console.log(`\nRecalculating balances for ${affectedCusIds.size} affected accounts...`);

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

      console.log(`✅ Recalculated account ${account.cus_name} (ID: ${cusId}): updated ${balanceUpdateCount} entries. Final: ${runningBalance.toFixed(2)}`);
    }

    console.log('\n=== SWAPPED PAYMENTS MIGRATION COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Fatal production script error:', error);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
