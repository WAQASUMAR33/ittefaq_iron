// CORRECTED LEDGER IMPLEMENTATION - REVISED LOGIC

// 1. FIRST: Create ledger entry for bill to customer (DEBIT)
// - Customer account debit with bill amount
// - This represents customer owes us money

// 2. SECOND: If cash payment received - Credit Customer & Debit Cash Account
// - Credit customer account (customer paid cash)
// - Debit cash account (cash received)

// 3. THIRD: If bank payment made - Debit Bank Account & Credit Customer Account
// - Credit customer account (customer paid via bank)
// - Debit bank account (bank received payment)

// 4. FOURTH: If any balance left - Debit Customer Balance & Credit Sundry Creditors
// - Debit customer account (remaining balance)
// - Credit sundry creditors account (amount to be collected)

// EXAMPLE CALCULATION:
// Sale: 1000, Payment: 600 (Cash), Balance: 400
//
// Entry 1: Customer Debit 1000 (bill)
// Entry 2: Customer Credit 600 (cash payment received)
// Entry 3: Cash Debit 600 (cash received)
// Entry 4: Customer Debit 400 (remaining balance)
// Entry 5: Sundry Creditors Credit 400 (to be collected)
//
// Final Customer Balance: Opening + 1000 - 600 + 400
// Final Cash Balance: Opening + 600
// Final Sundry Creditors: Opening - 400

// CORRECTED LEDGER ENTRIES:

// 1. FIRST: Bill to Customer (DEBIT)
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

// 2. SECOND: Cash Payment Received
if (parseFloat(payment) > 0 && payment_type === 'CASH') {
  // Credit Customer Account
  ledgerEntries.push({
    cus_id,
    opening_balance: customer.cus_balance + netTotal,
    debit_amount: 0,
    credit_amount: parseFloat(payment),
    closing_balance: customer.cus_balance + netTotal - parseFloat(payment),
    bill_no: sale.sale_id.toString(),
    trnx_type: 'CASH',
    details: `Cash Payment Received - ${bill_type || 'BILL'} - Customer Account (Credit)`,
    payments: parseFloat(payment),
    updated_by
  });

  // Debit Cash Account
  if (specialAccounts.cash) {
    ledgerEntries.push({
      cus_id: specialAccounts.cash.cus_id,
      opening_balance: specialAccounts.cash.cus_balance,
      debit_amount: parseFloat(payment),
      credit_amount: 0,
      closing_balance: specialAccounts.cash.cus_balance + parseFloat(payment),
      bill_no: sale.sale_id.toString(),
      trnx_type: 'CASH',
      details: `Cash Payment Received - ${bill_type || 'BILL'} - Cash Account (Debit)`,
      payments: parseFloat(payment),
      updated_by
    });
  }
}

// 3. THIRD: Bank Payment Made
if (parseFloat(payment) > 0 && payment_type === 'BANK' && debit_account_id) {
  // Credit Customer Account
  ledgerEntries.push({
    cus_id,
    opening_balance: customer.cus_balance + netTotal,
    debit_amount: 0,
    credit_amount: parseFloat(payment),
    closing_balance: customer.cus_balance + netTotal - parseFloat(payment),
    bill_no: sale.sale_id.toString(),
    trnx_type: 'BANK',
    details: `Bank Payment Made - ${bill_type || 'BILL'} - Customer Account (Credit)`,
    payments: parseFloat(payment),
    updated_by
  });

  // Debit Bank Account
  const bankAccount = await tx.customer.findUnique({
    where: { cus_id: debit_account_id }
  });
  if (bankAccount) {
    ledgerEntries.push({
      cus_id: debit_account_id,
      opening_balance: bankAccount.cus_balance,
      debit_amount: parseFloat(payment),
      credit_amount: 0,
      closing_balance: bankAccount.cus_balance + parseFloat(payment),
      bill_no: sale.sale_id.toString(),
      trnx_type: 'BANK',
      details: `Bank Payment Made - ${bill_type || 'BILL'} - Bank Account (Debit)`,
      payments: parseFloat(payment),
      updated_by
    });
  }
}

// 4. FOURTH: Outstanding Balance
const remainingBalance = netTotal - parseFloat(payment);
if (remainingBalance > 0) {
  // Debit Customer Account (remaining balance)
  ledgerEntries.push({
    cus_id,
    opening_balance: customer.cus_balance + netTotal - parseFloat(payment),
    debit_amount: remainingBalance,
    credit_amount: 0,
    closing_balance: customer.cus_balance + netTotal - parseFloat(payment) + remainingBalance,
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

// Update customer balance (increase by net amount owed)
await tx.customer.update({
  where: { cus_id },
  data: {
    cus_balance: customer.cus_balance + netTotal - parseFloat(payment)
  }
});

// Update cash account balance (increase by payment received)
if (parseFloat(payment) > 0 && payment_type === 'CASH' && specialAccounts.cash) {
  await tx.customer.update({
    where: { cus_id: specialAccounts.cash.cus_id },
    data: {
      cus_balance: specialAccounts.cash.cus_balance + parseFloat(payment)
    }
  });
}

// Update bank account balance (increase by payment received)
if (parseFloat(payment) > 0 && payment_type === 'BANK' && debit_account_id) {
  await tx.customer.update({
    where: { cus_id: debit_account_id },
    data: {
      cus_balance: {
        increment: parseFloat(payment)
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


