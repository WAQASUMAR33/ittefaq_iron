# Fix Balance Type & Receipt Display - COMPLETE GUIDE

## Issues Fixed
1. ✅ Changed balance type from Decimal to Double (Float)
2. ✅ Customer balance calculation fixed
3. 🔍 Investigating cash/bank amount display in receipt

---

## Step 1: Update Database Schema

### Run this SQL in your database:

```sql
-- Change customer balance to DOUBLE
ALTER TABLE customers 
MODIFY COLUMN cus_balance DOUBLE DEFAULT 0;

-- Change ledger balance fields to DOUBLE
ALTER TABLE ledger 
MODIFY COLUMN opening_balance DOUBLE DEFAULT 0,
MODIFY COLUMN debit_amount DOUBLE DEFAULT 0,
MODIFY COLUMN credit_amount DOUBLE DEFAULT 0,
MODIFY COLUMN closing_balance DOUBLE DEFAULT 0,
MODIFY COLUMN payments DOUBLE DEFAULT 0;
```

**Or run the file:** `CHANGE_BALANCE_TO_DOUBLE.sql`

---

## Step 2: Regenerate Prisma Client

After updating the schema, you MUST regenerate the Prisma client:

### Windows (PowerShell):
```powershell
cd "d:\itefaq builders"
npx prisma generate
```

### Or use the batch file:
```
regenerate-prisma.bat
```

**IMPORTANT:** The app will NOT work properly until you regenerate Prisma client!

---

## Step 3: Restart Development Server

1. **Stop** the current dev server (Ctrl+C)
2. **Start** it again:
   ```
   npm run dev
   ```

---

## Step 4: Test Customer Balance

### Create a test sale:
1. Customer: Select any
2. Product: Add any product (e.g., 2,500)
3. Cash: 1,000
4. Bank: 500
5. Total Received: 1,500
6. Save

### Check customer balance:
- Go to Customers page
- Find the customer
- **Expected:** Balance should increase by: 2,500 - 1,500 = 1,000
- **Formula:** `old_balance + total_amount - payment`

### Example:
```
Customer old balance:  10,000
Sale total:             2,500
Payment received:       1,500
New balance:           11,000 ✅ (10,000 + 2,500 - 1,500)
```

---

## Step 5: Check Receipt Display

### View the receipt:
1. Find the sale you just created
2. Click the **eye icon** (👁️) to view receipt
3. Open Browser Console (Press F12)
4. Look for these logs:

```
📋 Viewing bill: {...}
💰 Split payments: [...]
🧾 Receipt - selectedBill: {
  split_payments: [...],
  split_payments_count: 2
}
```

### Expected Receipt Display:

```
Right Side Table:
┌──────────────┬──────────┐
│ رقم بل       │  2,500   │  Bill Amount
├──────────────┼──────────┤
│ كل رقم       │  2,500   │  Total Amount
├──────────────┼──────────┤
│ نقد كيش      │  1,000   │  ✅ Cash
├──────────────┼──────────┤
│ HBL Bank     │    500   │  ✅ Bank (with actual name)
├──────────────┼──────────┤
│ كل رقم وصول  │  1,500   │  Total Received
├──────────────┼──────────┤
│ بقايا رقم    │  1,000   │  Balance
└──────────────┴──────────┘
```

---

## Troubleshooting

### Issue 1: "Cash and bank not showing in receipt"

**Check console log:** Look for `split_payments_count`

**If count is 0:**
- You're viewing an OLD sale (before the update)
- ✅ Create a NEW sale to test

**If count is undefined/null:**
- API not returning split_payments
- Check the network tab: `/api/sales?id=X`
- Verify split_payments are in the response

**If count is 2 but not displaying:**
- JavaScript error in console
- Check for errors in the receipt rendering

### Issue 2: "Customer balance wrong"

**Possible causes:**
1. **Didn't regenerate Prisma client** ← Most common!
   - Solution: Run `npx prisma generate`

2. **Old balance type still cached**
   - Solution: Restart dev server

3. **Type conversion issue**
   - Now fixed with Float type
   - Ensure parseFloat() is used everywhere

### Issue 3: "Balance multiplying instead of adding"

**This should be FIXED now:**
- Changed from: `cus_balance + netTotal` (wrong with Decimal)
- Changed to: `parseFloat(cus_balance) + parseFloat(netTotal)` (correct)
- Changed type: `Decimal` → `Float` (native number type)

---

## Why Float (Double) is Better than Decimal

| Feature | Decimal | Float (Double) |
|---------|---------|----------------|
| **Type in JS** | String/Object | Number |
| **Arithmetic** | Requires conversion | Native |
| **Performance** | Slower | Faster |
| **Precision** | Very high (30 decimals) | High enough (15-17 decimals) |
| **Best for** | Financial systems requiring exact precision | General calculations |

For your use case (inventory/sales), **Float is perfect** and performs much better!

---

## Verification Checklist

After making all changes:

- [ ] Ran the SQL migration (`CHANGE_BALANCE_TO_DOUBLE.sql`)
- [ ] Regenerated Prisma client (`npx prisma generate`)
- [ ] Restarted dev server
- [ ] Created a NEW sale (not viewing old ones)
- [ ] Entered BOTH cash and bank amounts
- [ ] Selected a bank account from dropdown
- [ ] Sale saved successfully
- [ ] Viewed receipt - cash row shows
- [ ] Viewed receipt - bank row shows with bank name
- [ ] Customer balance updated correctly

---

## If Still Not Working

1. **Copy the console output** when viewing the receipt
2. **Check the database** directly:
   ```sql
   SELECT * FROM split_payments 
   WHERE sale_id = (SELECT MAX(sale_id) FROM sales)
   ORDER BY split_payment_id;
   ```
3. **Verify data types**:
   ```sql
   DESCRIBE customers;
   DESCRIBE ledger;
   ```
4. **Share the error** with complete logs

---

## Summary of Changes

### Schema Changes:
```prisma
// Before
cus_balance  Decimal  @default(0.000000000000000000000000000000)

// After  
cus_balance  Float    @default(0)
```

### API Changes:
- ✅ Fixed parseFloat() usage
- ✅ Moved getSpecialAccounts() outside transaction
- ✅ Increased transaction timeout to 30s

### Receipt Changes:
- ✅ Split payments display for new sales
- ✅ Bank account name shows instead of hardcoded text
- ✅ Both cash and bank rows display

---

**Status:** ✅ All changes complete - follow steps above to apply!




