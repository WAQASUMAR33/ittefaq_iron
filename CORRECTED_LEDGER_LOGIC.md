// CORRECTED LEDGER ENTRIES FOR SALES API
// This file shows the correct accounting principles for sales ledger entries

// CORRECT ACCOUNTING LOGIC:

// 1. CUSTOMER ACCOUNT - DEBIT
// When a sale is made, the customer owes us money
// Debit Customer Account (increase customer balance - amount owed by customer)

// 2. CASH/BANK ACCOUNT - CREDIT  
// When payment is received, cash/bank account is credited
// Credit Cash/Bank Account (decrease cash/bank balance - money received)

// 3. TRANSPORT ACCOUNT - DEBIT
// When transport charges are incurred, we owe the transporter
// Debit Transport Account (increase transport balance - amount owed to transporter)

// 4. SUNDRY DEBTORS - CREDIT
// Transport charges are added to sundry debtors (amount to be collected from customer)
// Credit Sundry Debtors (decrease sundry debtors balance - amount to be collected)

// CORRECTED LEDGER ENTRIES:

// 1. Customer Account - DEBIT (amount owed by customer)
ledgerEntries.push({
  cus_id,
  opening_balance: customer.cus_balance,
  debit_amount: netTotal,
  credit_amount: 0,
  closing_balance: customer.cus_balance + netTotal,
  bill_no: sale.sale_id.toString(),
  trnx_type: 'CASH',
  details: `Sale - ${bill_type || 'BILL'} - Customer Account (Debit)`,
  payments: 0,
  updated_by
});

// 2. Cash/Bank Account - CREDIT (when payment is received)
if (parseFloat(payment) > 0) {
  const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
  if (paymentAccount) {
    ledgerEntries.push({
      cus_id: paymentAccount.cus_id,
      opening_balance: paymentAccount.cus_balance,
      debit_amount: 0,
      credit_amount: parseFloat(payment),
      closing_balance: paymentAccount.cus_balance - parseFloat(payment),
      bill_no: sale.sale_id.toString(),
      trnx_type: payment_type,
      details: `Payment Received - ${bill_type || 'BILL'} - ${payment_type} Account (Credit)`,
      payments: parseFloat(payment),
      updated_by
    });
  }
}

// 3. Transport Account - DEBIT (amount owed to transporter)
if (loader_id && parseFloat(shipping_amount || 0) > 0) {
  const loader = await tx.loader.findUnique({
    where: { loader_id }
  });

  if (loader) {
    // Debit Transporter Account
    ledgerEntries.push({
      cus_id: loader_id,
      opening_balance: loader.loader_balance,
      debit_amount: parseFloat(shipping_amount || 0),
      credit_amount: 0,
      closing_balance: loader.loader_balance + parseFloat(shipping_amount || 0),
      bill_no: sale.sale_id.toString(),
      trnx_type: 'CASH',
      details: `Transporter Charges - ${bill_type || 'BILL'} - Transport Account (Debit)`,
      payments: 0,
      updated_by
    });

    // Credit Sundry Debtors Account
    if (specialAccounts.sundryDebtors) {
      ledgerEntries.push({
        cus_id: specialAccounts.sundryDebtors.cus_id,
        opening_balance: specialAccounts.sundryDebtors.cus_balance,
        debit_amount: 0,
        credit_amount: parseFloat(shipping_amount || 0),
        closing_balance: specialAccounts.sundryDebtors.cus_balance - parseFloat(shipping_amount || 0),
        bill_no: sale.sale_id.toString(),
        trnx_type: 'CASH',
        details: `Transporter Charges - ${bill_type || 'BILL'} - Sundry Debtors (Credit)`,
        payments: 0,
        updated_by
      });
    }
  }
}

// BALANCE UPDATES:

// Update customer balance (increase by net total)
await tx.customer.update({
  where: { cus_id },
  data: {
    cus_balance: customer.cus_balance + netTotal
  }
});

// Update cash/bank balance (decrease by payment received)
if (parseFloat(payment) > 0) {
  const paymentAccount = payment_type === 'CASH' ? specialAccounts.cash : specialAccounts.bank;
  if (paymentAccount) {
    await tx.customer.update({
      where: { cus_id: paymentAccount.cus_id },
      data: {
        cus_balance: paymentAccount.cus_balance - parseFloat(payment)
      }
    });
  }
}

// Update transporter balance (increase by transport charges)
if (loader_id && parseFloat(shipping_amount || 0) > 0) {
  await tx.loader.update({
    where: { loader_id },
    data: {
      loader_balance: {
        increment: parseFloat(shipping_amount || 0)
      }
    }
  });
}

// Update sundry debtors balance (decrease by transport charges)
if (loader_id && specialAccounts.sundryDebtors && parseFloat(shipping_amount || 0) > 0) {
  await tx.customer.update({
    where: { cus_id: specialAccounts.sundryDebtors.cus_id },
    data: {
      cus_balance: {
        decrement: parseFloat(shipping_amount || 0)
      }
    }
  });
}


