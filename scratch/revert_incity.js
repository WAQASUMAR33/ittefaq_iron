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

// Revert Incity Cash Entry in POST
replaceSnippet(`          const incityCashEntry = createLedgerEntry({
            cus_id: incityCashAccount.cus_id,
            opening_balance: incityOpeningBalance,
            debit_amount: incityTotal,
            credit_amount: 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`,
`          const incityCashEntry = createLedgerEntry({
            cus_id: incityCashAccount.cus_id,
            opening_balance: incityOpeningBalance,
            debit_amount: 0,
            credit_amount: incityTotal,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'DEBIT',`);

fs.writeFileSync(filePath, code);
console.log("Reverted Incity Cash Entry in POST!");
