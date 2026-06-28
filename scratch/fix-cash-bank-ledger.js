const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING CASH & BANK LEDGER ENTRIES ===');

  try {
    // 1. Get all customers in Cash / Cash Account / Bank / Bank Account categories
    const cashBankCategories = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });

    const categoryIds = cashBankCategories.map(c => c.cus_cat_id);
    console.log(`Found categories: ${cashBankCategories.map(c => c.cus_cat_title).join(', ')} (IDs: ${categoryIds.join(', ')})`);

    const accounts = await prisma.customer.findMany({
      where: {
        cus_category: { in: categoryIds }
      },
      include: {
        customer_category: true
      }
    });

    console.log(`Found ${accounts.length} Cash/Bank accounts in total.`);

    for (const account of accounts) {
      console.log(`\nProcessing account: ${account.cus_name} (ID: ${account.cus_id})`);

      const entries = await prisma.ledger.findMany({
        where: { cus_id: account.cus_id },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      console.log(`- Found ${entries.length} entries. Checking for incorrect column mappings...`);

      let updatedCount = 0;
      const updatedEntries = [];

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
            // Money coming in -> Should be Debit
            targetDebit = amount;
            targetCredit = 0;
            targetTrnxType = 'DEBIT';
          } else if (['Purchase', 'Payment', 'Expense', 'Sale Return'].includes(type)) {
            // Money going out -> Should be Credit
            targetDebit = 0;
            targetCredit = amount;
            targetTrnxType = 'CREDIT';
          } else {
            // Journal or Adjustment or Unknown
            // Look at trnx_type
            if (entry.trnx_type === 'DEBIT') {
              targetDebit = amount;
              targetCredit = 0;
            } else if (entry.trnx_type === 'CREDIT') {
              targetDebit = 0;
              targetCredit = amount;
            } else {
              // default to whatever column was non-zero
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
          await prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: {
              debit_amount: targetDebit,
              credit_amount: targetCredit,
              trnx_type: targetTrnxType
            }
          });
          entry.debit_amount = targetDebit;
          entry.credit_amount = targetCredit;
          entry.trnx_type = targetTrnxType;
          updatedCount++;
        }
      }

      console.log(`- Updated ${updatedCount} entries' columns. Now recalculating running balances...`);

      // 2. Chained recalculation of running balances for this account
      let runningBalance = entries.length > 0 ? parseFloat(entries[0].opening_balance || 0) : 0;
      let balanceUpdateCount = 0;

      for (const entry of entries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        // Standard Asset rule: Debit adds, Credit subtracts
        const change = debit - credit;
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

      console.log(`- Recalculated balances. Updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);

      // Update customer balance in DB
      await prisma.customer.update({
        where: { cus_id: account.cus_id },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });
    }

    console.log('\n=== ALL LEDGERS SUCCESSFULLY FIXED AND RECALCULATED ===');

  } catch (error) {
    console.error('Error running fix script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
