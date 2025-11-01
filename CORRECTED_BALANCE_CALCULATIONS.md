// CORRECTED LEDGER BALANCE CALCULATIONS
// This shows the proper way to calculate opening and closing balances

// CORRECT APPROACH:
// 1. Only ONE customer entry per sale
// 2. Customer debit = net amount owed (total - payment received)
// 3. Cash/Bank credit = payment received
// 4. Transport debit = transport charges
// 5. Sundry Debtors credit = transport charges

// CORRECTED LEDGER ENTRIES:

// 1. Customer Account - DEBIT (net amount owed by customer)
const customerNetAmount = netTotal - parseFloat(payment);
ledgerEntries.push({
  cus_id,
  opening_balance: customer.cus_balance,
  debit_amount: customerNetAmount,
  credit_amount: 0,
  closing_balance: customer.cus_balance + customerNetAmount,
  bill_no: sale.sale_id.toString(),
  trnx_type: 'CASH',
  details: `Sale - ${bill_type || 'BILL'} - Customer Account (Debit) - Net Amount: ${customerNetAmount}`,
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

// CORRECTED BALANCE UPDATES:

// Update customer balance (increase by net amount owed)
await tx.customer.update({
  where: { cus_id },
  data: {
    cus_balance: customer.cus_balance + customerNetAmount
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

// EXAMPLE CALCULATION:
// Sale Amount: 1000
// Payment Received: 300
// Transport Charges: 100
// 
// Customer Account:
// - Opening Balance: 500
// - Debit Amount: 700 (1000 - 300)
// - Closing Balance: 1200 (500 + 700)
//
// Cash Account:
// - Opening Balance: 2000
// - Credit Amount: 300
// - Closing Balance: 1700 (2000 - 300)
//
// Transport Account:
// - Opening Balance: 0
// - Debit Amount: 100
// - Closing Balance: 100 (0 + 100)
//
// Sundry Debtors:
// - Opening Balance: 0
// - Credit Amount: 100
// - Closing Balance: -100 (0 - 100)


