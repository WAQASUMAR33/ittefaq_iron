# Sale Receipt Debug - Step by Step

## Problem
Sale receipt is not properly managed - payments not showing correctly.

## Step-by-Step Debugging

### 1️⃣ Create a Test Sale

**IMPORTANT:** We need to create a NEW sale to test (old sales won't have split_payments).

1. Go to **Sales Page**
2. Click **"Create Sale"** or "New Sale"
3. Fill in:
   - **Customer**: Select any customer
   - **Product**: Add at least 1 product
   - **Store**: Select a store
   - **Payment Section**:
     - Cash: **1000**
     - Bank: **500**
     - Bank Account: **Select a bank** (e.g., "HBL", "MCB", "Easy Paisa")
4. Click **Save**
5. Note the Sale ID (e.g., #47)

### 2️⃣ Check Browser Console During Save

Open Browser Console (F12) and look for:

```
🔍 Frontend - Sale data being sent: {...}
```

**Check if `split_payments` array has 2 items:**
```json
split_payments: [
  {
    amount: 1000,
    payment_type: "CASH",
    debit_account_id: null,
    credit_account_id: null,
    reference: "Cash payment"
  },
  {
    amount: 500,
    payment_type: "BANK_TRANSFER",
    debit_account_id: 123,  // Should have a bank ID
    credit_account_id: null,
    reference: "Bank payment"
  }
]
```

**If split_payments is empty `[]`:**
- ❌ Problem: Cash or Bank amounts are not being captured
- ✅ Solution: Verify you entered both Cash AND Bank amounts

### 3️⃣ View the Receipt

1. Find the sale in the list (Sale ID #47)
2. Click the **👁️ (eye icon)** to view receipt
3. Open Browser Console (F12)

**Look for these logs:**

```
📋 Viewing bill: {...}
💰 Split payments: [...]
🧾 Receipt - selectedBill: {
  split_payments: [...],
  split_payments_count: 2,  // Should be 2
  payment: 1500,
  payment_type: "CASH",
  debit_account: null
}
```

### 4️⃣ Check What's Displayed

**Expected Receipt Display:**

```
Right Side Payment Table:
┌─────────────────┬──────────┐
│ رقم بل          │  Total   │
├─────────────────┼──────────┤
│ كل رقم          │  Total   │
├─────────────────┼──────────┤
│ نقد كيش         │  1,000   │  ✅ Cash
├─────────────────┼──────────┤
│ HBL             │    500   │  ✅ Bank Name
├─────────────────┼──────────┤
│ كل رقم وصول     │  1,500   │  ✅ Total Received
├─────────────────┼──────────┤
│ بقايا رقم       │  Balance │
└─────────────────┴──────────┘
```

### 5️⃣ Diagnosis Based on Console Output

#### **Scenario A: split_payments is null or undefined**
```
split_payments: null
split_payments_count: undefined
```

**Cause:** The sale was created before the split_payments feature OR the sale failed to save split_payments.

**Solution:**
1. Delete the test sale
2. Make sure the latest code is running
3. Create a NEW sale
4. Verify `split_payments` is in the POST request

#### **Scenario B: split_payments is empty array []**
```
split_payments: []
split_payments_count: 0
```

**Cause:** Cash and Bank amounts were both 0 or not entered.

**Solution:**
1. When creating sale, make sure to enter:
   - Cash: 1000 (not 0)
   - Bank: 500 (not 0)
   - Select a bank account

#### **Scenario C: split_payments has data but doesn't show**
```
split_payments: [{...}, {...}]
split_payments_count: 2
```

**But receipt shows only legacy format or nothing.**

**Cause:** React rendering issue or the condition `selectedBill.split_payments && selectedBill.split_payments.length > 0` is not matching.

**Solution:**
1. Check if there's a JavaScript error in console
2. Refresh the page
3. Clear browser cache

#### **Scenario D: Bank account shows as "بینک" instead of name**
```
split_payments: [
  {...},
  {payment_type: "BANK_TRANSFER", debit_account: null}  // ❌ null
]
```

**Cause:** Bank account relationship not loaded from API.

**Solution:**
1. Verify API includes `split_payments: { include: { debit_account: true } }`
2. Check if bank account ID was saved correctly

### 6️⃣ Test Database Directly

Run this SQL query to check if split_payments are saved:

```sql
-- Get the latest sale with split payments
SELECT 
    s.sale_id,
    s.cus_id,
    s.total_amount,
    s.payment,
    s.payment_type,
    sp.split_payment_id,
    sp.amount as split_amount,
    sp.payment_type as split_type,
    sp.debit_account_id,
    c.cus_name as bank_account_name
FROM sales s
LEFT JOIN split_payments sp ON s.sale_id = sp.sale_id
LEFT JOIN customers c ON sp.debit_account_id = c.cus_id
WHERE s.sale_id = (SELECT MAX(sale_id) FROM sales)
ORDER BY sp.split_payment_id;
```

**Expected Result:**
```
sale_id | payment | split_amount | split_type     | bank_account_name
--------|---------|--------------|----------------|------------------
47      | 1500    | 1000         | CASH           | NULL
47      | 1500    | 500          | BANK_TRANSFER  | HBL Bank
```

**If no rows with split_payments:**
- ❌ Split payments are not being saved
- Check the POST request body
- Check for errors during save

### 7️⃣ Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Old Sales** | Viewing old sales shows only legacy format | ✅ Create NEW sales to test |
| **Empty Split Payments** | split_payments: [] | ✅ Enter both Cash AND Bank amounts |
| **No Bank Name** | Shows "بینک" | ✅ Ensure bank account selected in dropdown |
| **Not Saving** | split_payments not in database | ✅ Check for errors in console during save |
| **Not Loading** | API doesn't return split_payments | ✅ Verify API includes split_payments |

### 8️⃣ Quick Test Checklist

- [ ] Latest code is running (refresh browser)
- [ ] Created a BRAND NEW sale (not viewing old one)
- [ ] Entered Cash: 1000
- [ ] Entered Bank: 500
- [ ] Selected a bank account from dropdown
- [ ] Sale saved successfully (no errors)
- [ ] Viewed the receipt (clicked eye icon)
- [ ] Opened browser console (F12)
- [ ] Checked console logs for split_payments
- [ ] Receipt shows both cash and bank rows

## Next Steps

**Please do this:**
1. Create a NEW sale with Cash: 1000, Bank: 500
2. View the receipt
3. Copy the **entire console log** output
4. Share the console log with me

The console log will tell us exactly what's happening!




