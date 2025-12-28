# 🔍 Debug Split Payments Not Showing - Step by Step

## 🚨 The Problem
Split payments are not showing in the bill receipt.

## ✅ Follow These Steps IN ORDER

---

### **STEP 1: Open Developer Console**

1. Open your browser (Chrome/Edge)
2. Press **F12** to open Developer Tools
3. Click on **Console** tab
4. Keep this open throughout testing

---

### **STEP 2: Create a NEW Test Sale**

**IMPORTANT:** Old sales don't have split payments. You MUST create a NEW sale.

1. Go to Sales page
2. Create a new sale with:
   - **Customer**: Any customer
   - **Product**: Any product
   - **CASH**: 1000
   - **BANK**: 500
   - **BANK ACCOUNT**: Select any bank (HBL, MCB, etc.)
3. Click **Save**

**What to watch:**
- Check the console for: `🔍 Frontend - Sale data being sent:`
- Look for `split_payments` array in the console
- Should show: `[{amount: 1000, payment_type: "CASH"}, {amount: 500, payment_type: "BANK_TRANSFER"}]`

**Screenshot what you see in console and send it to me.**

---

### **STEP 3: Check the Alert Popup**

After creating the sale, click **View Receipt** on the sale you just created.

You should see ONE of TWO alerts:

**Alert A: Split Payments Found ✅**
```
🧾 Receipt Payments Found:

Sale #47
Total Payments: 2

1. Cash: 1000
2. HBL Bank: 500

Total Received: 1500
```

**Alert B: No Split Payments Found ❌**
```
⚠️ No Split Payments Found!

Sale #47
Payment: 1500
Payment Type: CASH

split_payments is NULL
```

**Take a screenshot of which alert you get.**

---

### **STEP 4: Check Console Logs**

When the alert appears, check the console for these messages:

```
📋 Viewing bill: {sale_id: 47, ...}
💰 Split payments: [...]
```

**Screenshot the console output.**

---

### **STEP 5: Check Network Tab**

1. In Developer Tools, click **Network** tab
2. Click **View Receipt** again
3. Look for a request to `/api/sales?id=47` or similar
4. Click on that request
5. Click **Preview** or **Response** tab
6. Look for `split_payments` in the response

**Does the response include split_payments array?**

**Screenshot the response data.**

---

## 📊 Possible Scenarios

### **Scenario 1: Alert shows "Split Payments Found" but receipt is blank**
**This means:** Data is there, but UI is not rendering it.
**Fix:** Frontend rendering issue.

### **Scenario 2: Alert shows "No Split Payments Found"**
**This means:** split_payments is NULL/undefined/empty.
**Possible causes:**
- Old sale (created before feature)
- Backend not saving split_payments
- API not including split_payments in response

### **Scenario 3: No alert appears at all**
**This means:** Code not executing.
**Fix:** Check if handleViewBill function is being called.

---

## 🧪 Quick SQL Check

Run this SQL query in your database to check if split_payments are being saved:

```sql
-- Get the latest sale
SELECT * FROM sales ORDER BY sale_id DESC LIMIT 1;

-- Get split payments for the latest sale
SELECT sp.*, 
       c.cus_name as bank_account_name
FROM split_payments sp
LEFT JOIN customers c ON sp.debit_account_id = c.cus_id
WHERE sp.sale_id = (SELECT MAX(sale_id) FROM sales)
ORDER BY sp.split_payment_id;
```

**Expected result:**
```
split_payment_id | sale_id | amount | payment_type   | debit_account_id | bank_account_name
-----------------|---------|--------|----------------|------------------|-------------------
1                | 47      | 1000   | CASH           | NULL             | NULL
2                | 47      | 500    | BANK_TRANSFER  | 123              | HBL Bank
```

**Screenshot the SQL results.**

---

## 📸 What I Need From You

Please provide these 5 screenshots:

1. ✅ **Console log** when creating sale (showing split_payments being sent)
2. ✅ **Alert popup** when viewing receipt (showing which alert appears)
3. ✅ **Console log** when viewing receipt (showing split_payments data)
4. ✅ **Network tab response** (showing API response with/without split_payments)
5. ✅ **SQL query results** (showing split_payments in database)

---

## 🎯 Quick Test Script

Run this in your browser console to test:

```javascript
// Check if sales list has split_payments
console.log('📋 Checking sales list...');
const salesTable = document.querySelector('table');
if (salesTable) {
  console.log('✅ Sales table found');
} else {
  console.log('❌ Sales table not found');
}

// Try to find split_payments in page data
console.log('🔍 Searching for split_payments in window...');
console.log(window);
```

---

## 💡 Expected Flow

```
1. User enters:
   ├─ Cash: 1000
   ├─ Bank: 500
   └─ Bank Account: HBL

2. Click Save
   ├─ Frontend creates split_payments array
   ├─ Sends to API: POST /api/sales
   └─ Console: "🔍 Frontend - Sale data being sent"

3. Backend receives
   ├─ Logs: "💰 Split payments received"
   ├─ Creates split_payment records
   └─ Logs: "✅ Split payments created: 2"

4. Click View Receipt
   ├─ Fetches sale with split_payments
   ├─ Logs: "📋 Viewing bill" & "💰 Split payments"
   ├─ Alert: "🧾 Receipt Payments Found"
   └─ Displays cash and bank rows

5. Receipt shows:
   ├─ نقد كيش: 1,000
   └─ HBL Bank: 500
```

---

## 🚀 Let's Find Out Where It's Failing!

Follow the steps above and send me the screenshots. This will tell us exactly where the problem is:

- ❓ Is split_payments being sent from frontend?
- ❓ Is backend receiving split_payments?
- ❓ Is backend saving to database?
- ❓ Is API returning split_payments?
- ❓ Is frontend receiving split_payments?
- ❓ Is UI rendering split_payments?

**One of these steps is failing. The screenshots will show us which one!** 🔍




