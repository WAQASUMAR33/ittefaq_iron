# Sale Receipt Debug Guide

## Problem
The sale receipt is not displaying cash and bank payments properly.

## Steps to Debug

### 1. Check Browser Console
When you view a sale receipt, open the browser console (F12) and look for these logs:

```
📋 Viewing bill: {...}
💰 Split payments: [...]
🧾 Receipt - selectedBill: {...}
```

### 2. What to Look For

#### If you see "✅ Showing split payments":
- The new system is working
- Check if split_payments array has data
- Each payment should show: {type: "CASH" or "BANK_TRANSFER", amount: X, debit_account: "Bank Name"}

#### If you see "⚠️ No split payments, showing legacy format":
- The sale was created before the split payments feature
- OR split_payments is empty/null

### 3. Test Creating a New Sale

**Step-by-step:**
1. Go to Sales page
2. Create a new sale with:
   - Customer: (select any)
   - Product: (add at least one)
   - Cash: 1000
   - Bank: 700
   - Bank Account: (select a bank from dropdown)
3. Save the sale
4. View the receipt (click eye icon)
5. Check browser console for logs
6. Check if receipt shows:
   ```
   كل رقم: 2,700.00
   نقد كيش: 1,000.00
   [Bank Name]: 700.00
   كل رقم وصول: 1,700.00
   ```

### 4. Common Issues

#### Issue 1: Split payments is null/empty
**Solution:** The sale might have been created with the old code. Create a NEW sale after the latest code changes.

#### Issue 2: Bank account name shows as "بینک" instead of actual name
**Solution:** Check if:
- Bank account was selected in dropdown
- Bank account has `cus_name` field populated
- `debit_account` is included in the API response

#### Issue 3: Payments not showing at all
**Solution:** Check if:
- `selectedBill.split_payments` exists
- `selectedBill.payment` has a value
- Console shows the data

### 5. SQL Query to Check Split Payments

Run this in your database to check if split payments are being saved:

```sql
SELECT 
  s.sale_id,
  s.total_amount,
  s.payment,
  s.payment_type,
  sp.split_payment_id,
  sp.amount as split_amount,
  sp.payment_type as split_type,
  c.cus_name as bank_name
FROM sales s
LEFT JOIN split_payments sp ON s.sale_id = sp.sale_id
LEFT JOIN customers c ON sp.debit_account_id = c.cus_id
ORDER BY s.sale_id DESC
LIMIT 10;
```

### 6. Expected Database Structure

After creating a sale with cash=1000 and bank=700:

**sales table:**
- sale_id: 123
- payment: 1700 (total of cash + bank)
- payment_type: "CASH" (first payment type)

**split_payments table:**
- Row 1: {sale_id: 123, amount: 1000, payment_type: "CASH", debit_account_id: null}
- Row 2: {sale_id: 123, amount: 700, payment_type: "BANK_TRANSFER", debit_account_id: [bank_id]}

## Quick Fix Checklist

- [ ] Latest code is deployed/running
- [ ] Created a NEW sale (not viewing an old one)
- [ ] Both Cash AND Bank amounts were entered
- [ ] Bank account was selected from dropdown
- [ ] Saved the sale successfully (no errors)
- [ ] Viewing the receipt in the dialog (not printed yet)
- [ ] Browser console shows the debug logs
- [ ] split_payments array has 2 items in console

## If Still Not Working

Share the console log output:
1. Copy all console logs when viewing the receipt
2. Check the Network tab for `/api/sales?id=X` response
3. Verify the split_payments array in the API response





