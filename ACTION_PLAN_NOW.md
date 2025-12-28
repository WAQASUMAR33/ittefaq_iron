# 🚀 ACTION PLAN - Fix Balance & Receipt Display

## ⚡ Quick Steps (Do these NOW)

### Step 1: Run SQL Migration (2 minutes)
```sql
-- Copy and run this in your database:
ALTER TABLE customers MODIFY COLUMN cus_balance DOUBLE DEFAULT 0;
ALTER TABLE ledger 
  MODIFY COLUMN opening_balance DOUBLE DEFAULT 0,
  MODIFY COLUMN debit_amount DOUBLE DEFAULT 0,
  MODIFY COLUMN credit_amount DOUBLE DEFAULT 0,
  MODIFY COLUMN closing_balance DOUBLE DEFAULT 0,
  MODIFY COLUMN payments DOUBLE DEFAULT 0;
```

Or run: `CHANGE_BALANCE_TO_DOUBLE.sql`

### Step 2: Regenerate Prisma Client (1 minute)
```powershell
cd "d:\itefaq builders"
npx prisma generate
```

### Step 3: Restart Server (30 seconds)
1. Stop dev server (Ctrl+C in terminal)
2. Start again: `npm run dev`

---

## 🧪 Test It

### Create Test Sale:
1. Go to Sales page
2. Click "Create Sale"
3. Fill in:
   - Customer: Any
   - Product: Any (Total: 2,500)
   - **Cash: 1,000** ← IMPORTANT: Enter this
   - **Bank: 500** ← IMPORTANT: Enter this  
   - **Bank Account:** Select HBL or any bank ← IMPORTANT: Select from dropdown
4. Click Save

### View Receipt:
1. Find the sale (latest one)
2. Click eye icon 👁️
3. Press F12 (open console)
4. **Look at the receipt - you should see:**
   ```
   نقد كيش: 1,000.00
   HBL Bank: 500.00
   ```

### Check Console:
```
🧾 Receipt - selectedBill: {
  split_payments_count: 2  ← Should be 2!
}
```

---

## ❌ If Still Not Working

### Run this query to check:
```sql
-- See file: CHECK_SPLIT_PAYMENTS.sql
SELECT * FROM split_payments 
WHERE sale_id = (SELECT MAX(sale_id) FROM sales);
```

**Expected:**
- Row 1: amount=1000, payment_type=CASH
- Row 2: amount=500, payment_type=BANK_TRANSFER, bank name

**If no rows:**
- Split payments are not being saved
- Check console for errors during save
- Share the error with me

---

## 📊 Customer Balance Check

After creating the test sale:

**Query:**
```sql
SELECT cus_id, cus_name, cus_balance 
FROM customers 
WHERE cus_id = [YOUR_TEST_CUSTOMER_ID];
```

**Expected:**
```
Old balance:  10,000
+ Total:       2,500
- Payment:     1,500
= New:        11,000 ✅
```

If balance is wrong (like 10,000 × 2,500), you didn't regenerate Prisma client!

---

## 🎯 Summary

**What Changed:**
1. ✅ Balance type: Decimal → Float (Double)
2. ✅ Balance calculation: Fixed parseFloat()
3. ✅ Transaction timeout: 15s → 30s
4. ✅ getSpecialAccounts: Moved outside transaction
5. ✅ Split payments: Saving cash & bank separately
6. ✅ Receipt: Shows both cash and bank with bank name

**Your Task:**
1. Run SQL migration
2. Regenerate Prisma (`npx prisma generate`)
3. Restart server
4. Create NEW test sale
5. Check receipt shows cash + bank

---

**Do these 3 steps now and then create a test sale!**




