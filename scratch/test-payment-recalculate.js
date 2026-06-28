const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Replicated recalculate function to match sales/route.js exactly
async function recalculateLedgerBalances(tx, cus_id) {
  const customer = await tx.customer.findUnique({
    where: { cus_id },
    include: { customer_category: true }
  });
  if (!customer) return;

  const categoryTitle = (customer.customer_category?.cus_cat_title || '').toLowerCase();

  const entries = await tx.ledger.findMany({
    where: { cus_id },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });

  entries.sort((a, b) => {
    const timeDiff = a.created_at.getTime() - b.created_at.getTime();
    if (timeDiff !== 0) return timeDiff;
    const billA = parseInt(a.bill_no) || 0;
    const billB = parseInt(b.bill_no) || 0;
    if (billA !== billB) return billA - billB;
    return a.l_id - b.l_id;
  });

  let runningBalance = 0;
  if (entries.length > 0) {
    runningBalance = parseFloat(entries[0].opening_balance || 0);
    
    for (const entry of entries) {
      const opening = runningBalance;
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      
      let change = 0;
      if (categoryTitle.includes('cash') || categoryTitle.includes('bank')) {
        if (entry.trnx_type === 'DEBIT') {
          change = debit - credit;
        } else {
          change = credit - debit;
        }
      } else {
        change = debit - credit;
      }
      const closing = opening + change;

      // Update in db
      await tx.ledger.update({
        where: { l_id: entry.l_id },
        data: {
          opening_balance: Number(opening.toFixed(2)),
          closing_balance: Number(closing.toFixed(2))
        }
      });
      runningBalance = closing;
    }
  }

  await tx.customer.update({
    where: { cus_id },
    data: { cus_balance: Number(runningBalance.toFixed(2)) }
  });
  return runningBalance;
}

// Helpers from ledger-helper
function calculateClosingBalance(openingBalance, debitAmount = 0, creditAmount = 0, accountNature = 'RECEIVABLE') {
  const opening = parseFloat(openingBalance || 0);
  const debit = parseFloat(debitAmount || 0);
  const credit = parseFloat(creditAmount || 0);

  if (accountNature === 'PAYABLE') {
    return opening - debit + credit;
  }
  return opening + debit - credit;
}

function createLedgerEntry(config) {
  const {
    cus_id,
    opening_balance,
    debit_amount = 0,
    credit_amount = 0,
    bill_no,
    trnx_type,
    details,
    payments = 0,
    cash_payment = 0,
    bank_payment = 0,
    updated_by = null,
    account_nature = 'RECEIVABLE'
  } = config;

  const closing_balance = calculateClosingBalance(opening_balance, debit_amount, credit_amount, account_nature);

  return {
    cus_id,
    opening_balance: parseFloat(opening_balance),
    debit_amount: parseFloat(debit_amount || 0),
    credit_amount: parseFloat(credit_amount || 0),
    closing_balance,
    bill_no: bill_no.toString(),
    trnx_type,
    details,
    payments: parseFloat(payments || 0),
    cash_payment: parseFloat(cash_payment || 0),
    bank_payment: parseFloat(bank_payment || 0),
    updated_by: updated_by ? parseInt(updated_by) : null
  };
}

async function getNextId(table, field, tx) {
  const result = await tx[table].aggregate({
    _max: {
      [field]: true
    }
  });
  return (result._max[field] || 0) + 1;
}

async function runTest() {
  console.log('🧪 Starting ledger consistency verification test...');
  try {
    await prisma.$transaction(async (tx) => {
      // Find a test customer
      const customer = await tx.customer.findFirst({
        where: {
          customer_category: {
            cus_cat_title: 'Customer'
          }
        }
      });
      if (!customer) throw new Error('No test customer found');

      // Find cash account
      const cashAccount = await tx.customer.findFirst({
        where: {
          customer_category: {
            cus_cat_title: { contains: 'Cash' }
          }
        }
      });
      if (!cashAccount) throw new Error('No cash account found');

      const cus_id = customer.cus_id;
      const cash_id = cashAccount.cus_id;

      const customer_opening = parseFloat(customer.cus_balance || 0);
      const cash_opening = parseFloat(cashAccount.cus_balance || 0);

      console.log(`👤 Customer: ${customer.cus_name} (ID: ${cus_id}, Opening Balance: ${customer_opening})`);
      console.log(`💵 Cash Account: ${cashAccount.cus_name} (ID: ${cash_id}, Opening Balance: ${cash_opening})`);

      const total_amount = 1000;
      const cash_amount = 1000;
      const netAmount = 1000;

      // 1. Simulate PAYMENT creation (type: PAY - customer pays us)
      const payment = await tx.payment.create({
        data: {
          payment_date: new Date(),
          payment_type: 'PAY',
          account_id: cus_id,
          total_amount,
          discount_amount: 0,
          net_amount: netAmount,
          cash_account_id: cash_id,
          cash_amount,
          bank_amount: 0,
          description: 'Recalculation test payment',
          created_by: 1
        }
      });

      const ledgerEntries = [];

      // Customer Entry:
      // payment_type = PAY -> CREDIT entry (decreases customer balance)
      const mainAccountEntry = createLedgerEntry({
        cus_id,
        opening_balance: customer_opening,
        debit_amount: 0,
        credit_amount: total_amount,
        bill_no: `PAY-${payment.payment_id}`,
        trnx_type: 'CREDIT',
        details: 'payment from customer account test',
        payments: netAmount,
        updated_by: 1
      });
      mainAccountEntry.closing_balance = customer_opening - total_amount;
      ledgerEntries.push(mainAccountEntry);

      // Cash Account Entry:
      // payment_type = PAY -> DEBIT column, type DEBIT (adds to cash)
      const cashAccountEntry = createLedgerEntry({
        cus_id: cash_id,
        opening_balance: cash_opening,
        debit_amount: cash_amount,
        credit_amount: 0,
        bill_no: `PAY-${payment.payment_id}`,
        trnx_type: 'DEBIT',
        details: `payment from customer account test`,
        payments: cash_amount,
        updated_by: 1
      });
      cashAccountEntry.closing_balance = cash_opening + cash_amount;
      ledgerEntries.push(cashAccountEntry);

      const startLId = await getNextId('ledger', 'l_id', tx);
      const ledgerEntriesWithIds = ledgerEntries.map((entry, index) => ({
        l_id: startLId + index,
        ...entry
      }));

      await tx.ledger.createMany({
        data: ledgerEntriesWithIds
      });

      // Update customer balances in db
      await tx.customer.update({
        where: { cus_id },
        data: { cus_balance: mainAccountEntry.closing_balance }
      });
      await tx.customer.update({
        where: { cus_id: cash_id },
        data: { cus_balance: cashAccountEntry.closing_balance }
      });

      console.log('✅ Payment ledger entries successfully written.');
      console.log(`   Customer Expected Closing Balance: ${mainAccountEntry.closing_balance}`);
      console.log(`   Cash Expected Closing Balance: ${cashAccountEntry.closing_balance}`);

      // 2. Trigger Recalculate balances
      console.log('🔄 Triggering balance recalculation...');
      const customer_recalc = await recalculateLedgerBalances(tx, cus_id);
      const cash_recalc = await recalculateLedgerBalances(tx, cash_id);

      console.log(`   Customer Recalculated Balance: ${customer_recalc}`);
      console.log(`   Cash Recalculated Balance: ${cash_recalc}`);

      // Assert consistency
      if (Math.abs(customer_recalc - mainAccountEntry.closing_balance) > 0.01) {
        throw new Error(`Customer balance discrepancy! Expected ${mainAccountEntry.closing_balance}, got ${customer_recalc}`);
      }
      if (Math.abs(cash_recalc - cashAccountEntry.closing_balance) > 0.01) {
        throw new Error(`Cash balance discrepancy! Expected ${cashAccountEntry.closing_balance}, got ${cash_recalc}`);
      }

      console.log('🎉 Recalculation is completely consistent! Customer balance and Cash balance are perfectly correct.');

      // Throw error to rollback transaction
      throw new Error('ROLLBACK_TEST_SUCCESSFUL');
    }, { timeout: 15000 });
  } catch (error) {
    if (error.message === 'ROLLBACK_TEST_SUCCESSFUL') {
      console.log('✅ Transaction safely rolled back. Test PASSED.');
    } else {
      console.error('❌ Test failed:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
