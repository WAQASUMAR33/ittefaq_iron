const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/purchases/route.js');
let code = fs.readFileSync(filePath, 'utf8');

// Helper to replace precisely based on a unique snippet
function replaceSnippet(search, replacement) {
  if (!code.includes(search)) {
    console.log("❌ Could not find:\n", search);
    process.exit(1);
  }
  code = code.replace(search, replacement);
  console.log("✅ Replaced a snippet");
}

// 1. POST: Supplier Entry
replaceSnippet(`        const supplierEntry = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: isReturn ? 0 : supplierAmount,
          credit_amount: isReturn ? supplierAmount : 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: isReturn ? 'CREDIT' : 'DEBIT',`, 
`        const supplierEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: isReturn ? supplierAmount : 0,
          credit_amount: isReturn ? 0 : supplierAmount,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: isReturn ? 'DEBIT' : 'CREDIT',`);

// 2. POST: Payment entry against Supplier
replaceSnippet(`        const paymentEntry = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: isReturn ? totalPaymentAmount2 : 0,
          credit_amount: isReturn ? 0 : totalPaymentAmount2,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: isReturn ? 'DEBIT' : 'CREDIT',`,
`        const paymentEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: isReturn ? 0 : totalPaymentAmount2,
          credit_amount: isReturn ? totalPaymentAmount2 : 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: isReturn ? 'CREDIT' : 'DEBIT',`);

// 3. POST: Bank Entry
replaceSnippet(`          const bankEntry = createLedgerEntry({
            cus_id: bankAccountToUse.cus_id,
            opening_balance: bankOpeningBalance,
            debit_amount: isReturn ? parseFloat(bank_payment) : 0,
            credit_amount: isReturn ? 0 : parseFloat(bank_payment),
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'DEBIT',`,
`          const bankEntry = createLedgerEntry({
            cus_id: bankAccountToUse.cus_id,
            opening_balance: bankOpeningBalance,
            debit_amount: isReturn ? 0 : parseFloat(bank_payment),
            credit_amount: isReturn ? parseFloat(bank_payment) : 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`);

// 4. POST: Cash Entry
replaceSnippet(`        const cashEntry = createLedgerEntry({
          cus_id: effectiveCashAccountId,
          opening_balance: cashOpeningBalance,
          debit_amount: isReturn ? cashPaymentAmount : 0,
          credit_amount: isReturn ? 0 : cashPaymentAmount,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'DEBIT',`,
`        const cashEntry = createLedgerEntry({
          cus_id: effectiveCashAccountId,
          opening_balance: cashOpeningBalance,
          debit_amount: isReturn ? 0 : cashPaymentAmount,
          credit_amount: isReturn ? cashPaymentAmount : 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'CREDIT',`);

// 5. POST: Supplier Out Debit
replaceSnippet(`        const supplierOutDebit = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: 0,
          credit_amount: totalOutCharges,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'CREDIT',`,
`        const supplierOutDebit = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: totalOutCharges,
          credit_amount: 0,
          bill_no: newPurchase.pur_id.toString(),
          trnx_type: 'DEBIT',`);

// 6. POST: Labour Entry
replaceSnippet(`          const labourEntry = createPayableLedgerEntry({
            cus_id: labourAccount.cus_id,
            opening_balance: labourOpeningBalance,
            debit_amount: outLabourAmt,
            credit_amount: 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'DEBIT',`,
`          const labourEntry = createPayableLedgerEntry({
            cus_id: labourAccount.cus_id,
            opening_balance: labourOpeningBalance,
            debit_amount: 0,
            credit_amount: outLabourAmt,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`);

// 7. POST: Incity Cash Entry
replaceSnippet(`          const incityCashEntry = createLedgerEntry({
            cus_id: incityCashAccount.cus_id,
            opening_balance: incityOpeningBalance,
            debit_amount: 0,
            credit_amount: incityTotal,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'DEBIT',`,
`          const incityCashEntry = createLedgerEntry({
            cus_id: incityCashAccount.cus_id,
            opening_balance: incityOpeningBalance,
            debit_amount: incityTotal,
            credit_amount: 0,
            bill_no: newPurchase.pur_id.toString(),
            trnx_type: 'CREDIT',`);

// ==================== PUT ROUTE ====================

// 8. PUT: Supplier Entry
replaceSnippet(`        const supplierEntry = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: supplierAmount,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'DEBIT',`,
`        const supplierEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: 0,
          credit_amount: supplierAmount,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`);

// 9. PUT: Payment Entry
replaceSnippet(`        const paymentEntry = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: 0,
          credit_amount: paymentAmount,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`,
`        const paymentEntry = createLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: paymentAmount,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'DEBIT',`);

// 10. PUT: Cash Entry
replaceSnippet(`        const cashEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: cashOpeningBalance,
          debit_amount: 0,
          credit_amount: cashPaymentAmt,
          bill_no: id.toString(),
          trnx_type: 'DEBIT',`,
`        const cashEntry = createLedgerEntry({
          cus_id: credit_account_id,
          opening_balance: cashOpeningBalance,
          debit_amount: cashPaymentAmt,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`);

// 11. PUT: Bank Entry
replaceSnippet(`        const bankEntry = createLedgerEntry({
          cus_id: bankAccIdForEntry,
          opening_balance: bankOpeningBalance,
          debit_amount: 0,
          credit_amount: bankPaymentAmt,
          bill_no: id.toString(),
          trnx_type: 'DEBIT',`,
`        const bankEntry = createLedgerEntry({
          cus_id: bankAccIdForEntry,
          opening_balance: bankOpeningBalance,
          debit_amount: bankPaymentAmt,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`);

// 12. PUT: Supplier Out Debit
replaceSnippet(`        const supplierOutDebitPUT = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: 0,
          credit_amount: totalOutChargesPUT,
          bill_no: id.toString(),
          trnx_type: 'CREDIT',`,
`        const supplierOutDebitPUT = createPayableLedgerEntry({
          cus_id: cus_id,
          opening_balance: runningSupplierBalance,
          debit_amount: totalOutChargesPUT,
          credit_amount: 0,
          bill_no: id.toString(),
          trnx_type: 'DEBIT',`);

// 13. PUT: Labour Entry
replaceSnippet(`          const labourEntryPUT = createPayableLedgerEntry({
            cus_id: labourAccountPUT.cus_id,
            opening_balance: labourOpeningBalancePUT,
            debit_amount: outLabourAmtPUT,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'DEBIT',`,
`          const labourEntryPUT = createPayableLedgerEntry({
            cus_id: labourAccountPUT.cus_id,
            opening_balance: labourOpeningBalancePUT,
            debit_amount: 0,
            credit_amount: outLabourAmtPUT,
            bill_no: id.toString(),
            trnx_type: 'CREDIT',`);

// 14. PUT: Incity Labour Entry
replaceSnippet(`          const labourEntry = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: incityLabourOpeningBalance,
            debit_amount: incityLabourAmt,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'DEBIT',`,
`          const labourEntry = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: incityLabourOpeningBalance,
            debit_amount: 0,
            credit_amount: incityLabourAmt,
            bill_no: id.toString(),
            trnx_type: 'CREDIT',`);

// 15. PUT: Incity Labour Payment
replaceSnippet(`          const labourPaymentEntryPUT = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: labourEntry.closing_balance,
            debit_amount: 0,
            credit_amount: incityLabourAmt,
            bill_no: id.toString(),
            trnx_type: 'DEBIT',`,
`          const labourPaymentEntryPUT = createLedgerEntry({
            cus_id: incityLabourAccount.cus_id,
            opening_balance: labourEntry.closing_balance,
            debit_amount: incityLabourAmt,
            credit_amount: 0,
            bill_no: id.toString(),
            trnx_type: 'CREDIT',`);

// 16. PUT: Incity Labour Cash Payment
replaceSnippet(`              const cashLabourEntryPUT = createLedgerEntry({
                cus_id: credit_account_id,
                opening_balance: cashLabourOpeningBalance,
                debit_amount: 0,
                credit_amount: incityLabourCashPUT,
                bill_no: id.toString(),
                trnx_type: 'DEBIT',`,
`              const cashLabourEntryPUT = createLedgerEntry({
                cus_id: credit_account_id,
                opening_balance: cashLabourOpeningBalance,
                debit_amount: incityLabourCashPUT,
                credit_amount: 0,
                bill_no: id.toString(),
                trnx_type: 'CREDIT',`);

// 17. PUT: Incity Labour Bank Payment
replaceSnippet(`              const bankLabourEntryPUT = createLedgerEntry({
                cus_id: bankAccountIdInt,
                opening_balance: bankLabourOpeningBalance,
                debit_amount: 0,
                credit_amount: incityLabourBankPUT,
                bill_no: id.toString(),
                trnx_type: 'DEBIT',`,
`              const bankLabourEntryPUT = createLedgerEntry({
                cus_id: bankAccountIdInt,
                opening_balance: bankLabourOpeningBalance,
                debit_amount: incityLabourBankPUT,
                credit_amount: 0,
                bill_no: id.toString(),
                trnx_type: 'CREDIT',`);

fs.writeFileSync(filePath, code);
console.log("All replacements done!");
