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

// Fix Supplier Out Debit in POST (change createPayableLedgerEntry to createLedgerEntry)
replaceSnippet(`        const supplierOutDebit = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: totalOutCharges,
          credit_amount: 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'DEBIT',`,
`        const supplierOutDebit = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: totalOutCharges,
          credit_amount: 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'DEBIT',`);

// Fix Supplier Out Debit in PUT (change createPayableLedgerEntry to createLedgerEntry)
replaceSnippet(`        const supplierOutDebitPUT = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: totalOutChargesPUT,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'DEBIT',`,
`        const supplierOutDebitPUT = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: totalOutChargesPUT,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'DEBIT',`);

fs.writeFileSync(filePath, code);
console.log("Fixed Supplier Out Debit!");
