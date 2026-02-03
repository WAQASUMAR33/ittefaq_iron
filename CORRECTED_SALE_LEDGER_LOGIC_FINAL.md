# Corrected Sale Ledger Entry Logic - Final Implementation ✅

## Overview
This document explains the corrected ledger entry logic for both **NEW SALES** and **LOADED ORDERS** in the sales module.

---

## 📋 Key Principles

### For NEW SALE:
- **Bill Total** = Debit Customer Account (full amount owed)
- **Payment Received** = Credit Customer Account (reduces amount owed)
- **Cash/Bank** = Credit Account (money received reduces cash/bank balance)

### For LOADED ORDER:
- **Balance Amount** = Debit Customer Account (only the remaining balance, NOT advance or current payments)
- **Cash Payment** = Credit Customer Account (money received reduces amount owed)
- **Bank Payment** = Credit Customer Account (money received reduces amount owed)
- **Cash Account** = Credit Account (money received reduces cash balance)
- **Bank Account** = Credit Account (money received reduces bank balance)

---

## 🧮 Calculation Formula

### NEW SALE (from scratch):
```
Debit Customer = Total Amount (full bill)
```

**Example: Sale of 1000 with 600 Cash Payment**
- Customer Debit: 1000 (full bill)
- Customer Credit: 600 (cash payment received)
- Cash Credit: 600 (cash account reduced)
- **Final Customer Balance**: Opening + 1000 - 600 = Opening + 400 (still owes 400)

### LOADED ORDER (completing an existing order):
```
Balance Amount = Total Amount - Advance Payment Already Received - Current Cash Payment - Current Bank Payment
```

**Example: Loaded Order of 1000 with 200 Advance + 400 Cash Now + 300 Bank Now**
- Customer Debit: 1000 - 200 - 400 - 300 = **100** (remaining balance to be collected)
- Customer Credit: 400 + 300 = 700 (cash + bank payment received now)
- Cash Credit: 400 (cash account reduced)
- Bank Credit: 300 (bank account reduced)
- **Final Customer Balance**: Opening + 100 - 700 = Opening - 600 (total payment reduces owing)

---

## 📝 Ledger Entry Details

### 1️⃣ CUSTOMER ACCOUNT - DEBIT (FIRST ENTRY)

**For NEW Sale:**
```javascript
{
  cus_id: customer_id,
  debit_amount: netTotal,
  credit_amount: 0,
  details: "Sale Bill - BILL - Customer Account (Debit)",
  trnx_type: 'CASH'
}
```

**For LOADED Order:**
```javascript
{
  cus_id: customer_id,
  debit_amount: netTotal - advance_payment - cash_payment - bank_payment,
  credit_amount: 0,
  details: "Sale Bill - BILL - Customer Account (Debit) (Loaded Order - Balance After Payments)",
  trnx_type: 'CASH'
}
```

---

### 2️⃣ CUSTOMER ACCOUNT - CREDIT (PAYMENT RECEIVED)

**When Cash OR Bank Payment > 0:**
```javascript
{
  cus_id: customer_id,
  debit_amount: 0,
  credit_amount: cash_payment + bank_payment,
  details: "Payment Received - BILL - Customer Account (Credit)",
  trnx_type: payment_type  // 'CASH' or 'BANK_TRANSFER'
}
```

---

### 3️⃣ CASH ACCOUNT - CREDIT (WHEN CASH PAYMENT RECEIVED)

**Important: This is a CREDIT, not DEBIT**
```javascript
{
  cus_id: cash_account_id,
  debit_amount: 0,
  credit_amount: cash_payment,  // CREDIT (reduces cash asset)
  details: "Payment Received - BILL - CASH Account (Credit)",
  trnx_type: 'CASH'
}
```

---

### 4️⃣ BANK ACCOUNT - CREDIT (WHEN BANK PAYMENT RECEIVED)

**Important: This is a CREDIT, not DEBIT**
```javascript
{
  cus_id: bank_account_id,
  debit_amount: 0,
  credit_amount: bank_payment,  // CREDIT (reduces bank asset)
  details: "Payment Received - BILL - BANK Account (Credit)",
  trnx_type: 'BANK_TRANSFER'
}
```

---

## 🔄 Complete Example: Loaded Order

**Order Details:**
- Total Amount: **1000**
- Advance Payment (already paid): **200**
- New Cash Payment: **400**
- New Bank Payment: **300**
- Remaining Balance: **100** (to be collected)

### Ledger Entries Created:

**Entry 1: Customer Debit (Balance Only)**
```
Customer A | Debit: 100 | Credit: 0
Details: Sale Bill - BILL - Customer Account (Debit) (Loaded Order - Balance After Payments)
Running Balance: Opening + 100
```

**Entry 2: Customer Credit (Payment Received)**
```
Customer A | Debit: 0 | Credit: 700
Details: Payment Received - BILL - Customer Account (Credit)
Running Balance: Opening + 100 - 700
```

**Entry 3: Cash Account Credit**
```
Cash Account | Debit: 0 | Credit: 400
Details: Payment Received - BILL - CASH Account (Credit)
Balance Change: Opening - 400
```

**Entry 4: Bank Account Credit**
```
Bank Account | Debit: 0 | Credit: 300
Details: Payment Received - BILL - BANK Account (Credit)
Balance Change: Opening - 300
```

### Final Balances:
- **Customer A**: Opening + 100 - 700 = Opening - 600 ✅ (Total reduced by 700 payment)
- **Cash Account**: Opening - 400 ✅ (Reduced by cash received)
- **Bank Account**: Opening - 300 ✅ (Reduced by bank received)

---

## 🔧 Implementation Code Changes

### In POST (Create New Sale) - Line ~800-900:

```javascript
// 1. Customer Bill Entry - Debit Customer Account
if (is_loaded_order) {
  // Loaded order: balance = total - advance - cash - bank
  const advancePaymentAmount = parseFloat(advance_payment || 0);
  const currentPayments = parseFloat(cash_payment || 0) + parseFloat(bank_payment || 0);
  debitAmount = netTotal - advancePaymentAmount - currentPayments;
} else {
  // New sale: use full netTotal
  debitAmount = netTotal;
}

// 3. Cash Account - CREDIT (NOT DEBIT)
if (parseFloat(cash_payment || 0) > 0) {
  ledgerEntries.push({
    debit_amount: 0,
    credit_amount: parseFloat(cash_payment),  // CREDIT
    details: `Payment Received - CASH Account (Credit)`
  });
}

// 4. Bank Account - CREDIT (NOT DEBIT)
if (parseFloat(bank_payment || 0) > 0) {
  ledgerEntries.push({
    debit_amount: 0,
    credit_amount: parseFloat(bank_payment),  // CREDIT
    details: `Payment Received - BANK Account (Credit)`
  });
}
```

---

## ✅ Verification Checklist

- [x] Loaded orders properly account for advance_payment in debit calculation
- [x] Balance formula: Total - Advance - Cash - Bank
- [x] Cash account entries are CREDITED (money received)
- [x] Bank account entries are CREDITED (money received)
- [x] Customer credit entries reflect both cash and bank payments
- [x] Closing balances are correctly calculated
- [x] Running balance updated after each entry
- [x] Different descriptions for loaded vs new sales

---

## 📌 Important Notes

1. **Advance Payment**: Only subtracted from debit amount for **loaded orders**, not used elsewhere
2. **Cash/Bank Reduction**: When payment is received, cash/bank balances **DECREASE** (credit entry)
3. **Customer Account**: Reflects all transactions (debit for bill, credit for payments)
4. **Loaded Order Flag**: `is_loaded_order = true` triggers special calculation logic
5. **Running Balance**: Essential for multi-entry transactions to maintain accuracy

---

## 🐛 Fixed Issues

### Issue 1: Loaded Order Balance Calculation
**Before**: `debitAmount = netTotal - cash_payment - bank_payment`
**After**: `debitAmount = netTotal - advance_payment - cash_payment - bank_payment`
**Why**: Advance payment was being ignored, causing incorrect balance calculation

### Issue 2: Cash/Bank Account Entries
**Before**: `debit_amount: cash_payment/bank_payment` (Wrong)
**After**: `credit_amount: cash_payment/bank_payment` (Correct)
**Why**: When payment is received, cash/bank assets decrease (credit reduces assets)

---

## 📚 Related Files

- [src/app/api/sales/route.js](src/app/api/sales/route.js) - Main implementation
- Lines 800-920: POST method ledger entries
- Lines 1380-1450: PUT method ledger entries
