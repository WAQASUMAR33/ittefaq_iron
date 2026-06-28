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

// Fix Labour Entry in POST (change createPayableLedgerEntry to createLedgerEntry)
replaceSnippet(`          const labourEntry = createPayableLedgerEntry({
            cus_id: labourAccount.cus_id,
            opening_balance: labourOpeningBalance,
            debit_amount: 0,
            credit_amount: outLabourAmt,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`,
`          const labourEntry = createLedgerEntry({
            cus_id: labourAccount.cus_id,
            opening_balance: labourOpeningBalance,
            debit_amount: 0,
            credit_amount: outLabourAmt,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`);

// Fix Labour Entry in PUT (change createPayableLedgerEntry to createLedgerEntry)
replaceSnippet(`          const labourEntryPUT = createPayableLedgerEntry({
            cus_id: labourAccountPUT.cus_id,
            opening_balance: labourOpeningBalancePUT,
            debit_amount: 0,
            credit_amount: outLabourAmtPUT,
            bill_no: id.toString(),
            trnx_type: 'CREDIT',`,
`          const labourEntryPUT = createLedgerEntry({
            cus_id: labourAccountPUT.cus_id,
            opening_balance: labourOpeningBalancePUT,
            debit_amount: 0,
            credit_amount: outLabourAmtPUT,
            bill_no: id.toString(),
            trnx_type: 'CREDIT',`);

fs.writeFileSync(filePath, code);
console.log("Fixed Labour Entries!");
