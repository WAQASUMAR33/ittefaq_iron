// CORRECTED LEDGER IMPLEMENTATION ACCORDING TO REQUIREMENTS

// 1. FIRST: Create ledger entry for bill to customer (DEBIT)
ledgerEntries.push({
  cus_id,
  opening_balance: customer.cus_balance,
  debit_amount: netTotal,
  credit_amount: 0,
  closing_balance: customer.cus_balance + netTotal,
  bill_no: sale.sale_id.toString(),
  trnx_type: 'CASH',
  details: `Sale Bill - ${bill_type || 'BILL'} - Customer Account (Debit)`,
  payments: 0,
  updated_by
});

// 2. SECOND: If cash payment - Debit Customer & Credit Cash Account
if (parseFloat(payment) > 0 && payment_type === 'CASH') {
  // Debit Customer Account (customer paid cash)
  ledgerEntries.push({
    cus_id,
    opening_balance: customer.cus_balance + netTotal,
    debit_amount: parseFloat(payment),
    credit_amount: 0,
    closing_balance: customer.cus_balance + netTotal + parseFloat(payment),
    bill_no: sale.sale_id.toString(),
    trnx_type: 'CASH',
    details: `Cash Payment - ${bill_type || 'BILL'} - Customer Account (Debit)`,
    payments: parseFloat(payment),
    updated_by
  });

  // Credit Cash Account
  if (specialAccounts.cash) {
    ledgerEntries.push({
      cus_id: specialAccounts.cash.cus_id,
      opening_balance: specialAccounts.cash.cus_balance,
      debit_amount: 0,
      credit_amount: parseFloat(payment),
      closing_balance: specialAccounts.cash.cus_balance - parseFloat(payment),
      bill_no: sale.sale_id.toString(),
      trnx_type: 'CASH',
      details: `Cash Payment Received - ${bill_type || 'BILL'} - Cash Account (Credit)`,
      payments: parseFloat(payment),
      updated_by
    });
  }
}

// 3. THIRD: If bank payment - Credit Bank Account & Debit Customer Account
if (parseFloat(payment) > 0 && payment_type === 'BANK' && debit_account_id) {
  // Debit Customer Account (customer paid via bank)
  ledgerEntries.push({
    cus_id,
    opening_balance: customer.cus_balance + netTotal,
    debit_amount: parseFloat(payment),
    credit_amount: 0,
    closing_balance: customer.cus_balance + netTotal + parseFloat(payment),
    bill_no: sale.sale_id.toString(),
    trnx_type: 'BANK',
    details: `Bank Payment - ${bill_type || 'BILL'} - Customer Account (Debit)`,
    payments: parseFloat(payment),
    updated_by
  });

  // Credit Bank Account
  const bankAccount = await tx.customer.findUnique({
    where: { cus_id: debit_account_id }
  });
  if (bankAccount) {
    ledgerEntries.push({
      cus_id: debit_account_id,
      opening_balance: bankAccount.cus_balance,
      debit_amount: 0,
      credit_amount: parseFloat(payment),
      closing_balance: bankAccount.cus_balance - parseFloat(payment),
      bill_no: sale.sale_id.toString(),
      trnx_type: 'BANK',
      details: `Bank Payment Received - ${bill_type || 'BILL'} - Bank Account (Credit)`,
      payments: parseFloat(payment),
      updated_by
    });
  }
}

// 4. FOURTH: If any balance left - Debit Customer Balance & Credit Sundry Creditors
const remainingBalance = netTotal - parseFloat(payment);
if (remainingBalance > 0) {
  // Debit Customer Account (remaining balance)
  ledgerEntries.push({
    cus_id,
    opening_balance: customer.cus_balance + netTotal + parseFloat(payment),
    debit_amount: remainingBalance,
    credit_amount: 0,
    closing_balance: customer.cus_balance + netTotal + parseFloat(payment) + remainingBalance,
    bill_no: sale.sale_id.toString(),
    trnx_type: 'CASH',
    details: `Outstanding Balance - ${bill_type || 'BILL'} - Customer Account (Debit)`,
    payments: 0,
    updated_by
  });

  // Credit Sundry Creditors Account
  if (specialAccounts.sundryCreditors) {
    ledgerEntries.push({
      cus_id: specialAccounts.sundryCreditors.cus_id,
      opening_balance: specialAccounts.sundryCreditors.cus_balance,
      debit_amount: 0,
      credit_amount: remainingBalance,
      closing_balance: specialAccounts.sundryCreditors.cus_balance - remainingBalance,
      bill_no: sale.sale_id.toString(),
      trnx_type: 'CASH',
      details: `Outstanding Balance - ${bill_type || 'BILL'} - Sundry Creditors (Credit)`,
      payments: 0,
      updated_by
    });
  }
}

// BALANCE UPDATES:

// Update customer balance (increase by total amount)
await tx.customer.update({
  where: { cus_id },
  data: {
    cus_balance: customer.cus_balance + netTotal
  }
});

// Update cash account balance (decrease by payment received)
if (parseFloat(payment) > 0 && payment_type === 'CASH' && specialAccounts.cash) {
  await tx.customer.update({
    where: { cus_id: specialAccounts.cash.cus_id },
    data: {
      cus_balance: specialAccounts.cash.cus_balance - parseFloat(payment)
    }
  });
}

// Update bank account balance (decrease by payment received)
if (parseFloat(payment) > 0 && payment_type === 'BANK' && debit_account_id) {
  await tx.customer.update({
    where: { cus_id: debit_account_id },
    data: {
      cus_balance: {
        decrement: parseFloat(payment)
      }
    }
  });
}

// Update sundry creditors balance (decrease by remaining balance)
if (remainingBalance > 0 && specialAccounts.sundryCreditors) {
  await tx.customer.update({
    where: { cus_id: specialAccounts.sundryCreditors.cus_id },
    data: {
      cus_balance: {
        decrement: remainingBalance
      }
    }
  });
}

// EXAMPLE CALCULATION:
// Sale Amount: 1000
// Payment Received: 600 (Cash)
// Remaining Balance: 400
// 
// Customer Account:
// - Opening Balance: 500
// - Debit Amount: 1000 (bill)
// - Debit Amount: 600 (cash payment)
// - Debit Amount: 400 (remaining balance)
// - Closing Balance: 2500 (500 + 1000 + 600 + 400)
//
// Cash Account:
// - Opening Balance: 2000
// - Credit Amount: 600
// - Closing Balance: 1400 (2000 - 600)
//
// Sundry Creditors:
// - Opening Balance: 0
// - Credit Amount: 400
// - Closing Balance: -400 (0 - 400)


