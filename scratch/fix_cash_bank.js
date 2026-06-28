const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/purchases/route.js');
let code = fs.readFileSync(filePath, 'utf8');

function replaceSnippet(search, replacement) {
  if (!code.includes(search)) {
    console.log("❌ Could not find:\n", search);
    process.exit(1);
  }
  code = code.replace(search, replacement);
  console.log("✅ Replaced a snippet");
}

// Fix Bank Entry in POST (change createLedgerEntry to createPayableLedgerEntry)
replaceSnippet(`          const bankEntry = createLedgerEntry({
            cus_id: bankAccountToUse.cus_id,
            opening_balance: bankOpeningBalance,
            debit_amount: isReturn ? 0 : parseFloat(bank_payment),
            credit_amount: isReturn ? parseFloat(bank_payment) : 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`,
`          const bankEntry = createPayableLedgerEntry({
            cus_id: bankAccountToUse.cus_id,
            opening_balance: bankOpeningBalance,
            debit_amount: isReturn ? 0 : parseFloat(bank_payment),
            credit_amount: isReturn ? parseFloat(bank_payment) : 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`);

// Fix Cash Entry in POST
replaceSnippet(`        const cashEntry = createLedgerEntry({
          cus_id: effectiveCashAccountId,
          opening_balance: cashOpeningBalance,
          debit_amount: isReturn ? 0 : cashPaymentAmount,
          credit_amount: isReturn ? cashPaymentAmount : 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'CREDIT',`,
`        const cashEntry = createPayableLedgerEntry({
          cus_id: effectiveCashAccountId,
          opening_balance: cashOpeningBalance,
          debit_amount: isReturn ? 0 : cashPaymentAmount,
          credit_amount: isReturn ? cashPaymentAmount : 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'CREDIT',`);

// Fix Bank Entry in PUT
replaceSnippet(`        const bankEntry = createLedgerEntry({
          cus_id: bankAccIdForEntry,
          opening_balance: bankOpeningBalance,
          debit_amount: bankPaymentAmt,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`,
`        const bankEntry = createPayableLedgerEntry({
          cus_id: bankAccIdForEntry,
          opening_balance: bankOpeningBalance,
          debit_amount: bankPaymentAmt,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`);

// Fix Cash Entry in PUT
replaceSnippet(`        const cashEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: cashOpeningBalance,
          debit_amount: cashPaymentAmt,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`,
`        const cashEntry = createPayableLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: cashOpeningBalance,
          debit_amount: cashPaymentAmt,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`);

fs.writeFileSync(filePath, code);
console.log("Fixed Cash/Bank Entries!");
