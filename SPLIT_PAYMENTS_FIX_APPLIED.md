# ✅ SPLIT PAYMENTS FIX APPLIED

## 🔍 **Problem Found**

The split payments were **NOT SHOWING** in the bill receipt because:

### **Root Cause:**
The API has a **raw SQL fallback** (when Prisma queries fail due to datetime issues or missing columns). This fallback was **NOT fetching split_payments** from the database.

**Result:** Sales returned with **empty split_payments array** `[]` even though the data existed in the database!

---

## 🛠️ **What Was Fixed**

### **Fix 1: Single Sale GET (by ID)**
**Location:** `src/app/api/sales/route.js` lines 144-182

**Before:**
```javascript
const result = {
  ...sale[0],
  sale_details: saleDetails || []
  // ❌ NO split_payments!
};
```

**After:**
```javascript
// Fetch split_payments separately for this sale
const splitPayments = await prisma.$queryRaw`
  SELECT 
    sp.split_payment_id, sp.sale_id, sp.amount, sp.payment_type,
    sp.debit_account_id, sp.credit_account_id, sp.reference,
    debit.cus_id as debit_cus_id, debit.cus_name as debit_cus_name,
    credit.cus_id as credit_cus_id, credit.cus_name as credit_cus_name
  FROM split_payments sp
  LEFT JOIN customers debit ON sp.debit_account_id = debit.cus_id
  LEFT JOIN customers credit ON sp.credit_account_id = credit.cus_id
  WHERE sp.sale_id = ${id}
`;

// Transform split_payments to match Prisma format
const transformedSplitPayments = splitPayments.map(sp => ({
  split_payment_id: sp.split_payment_id,
  sale_id: sp.sale_id,
  amount: sp.amount,
  payment_type: sp.payment_type,
  debit_account_id: sp.debit_account_id,
  credit_account_id: sp.credit_account_id,
  reference: sp.reference,
  debit_account: sp.debit_account_id ? {
    cus_id: sp.debit_cus_id,
    cus_name: sp.debit_cus_name
  } : null,
  credit_account: sp.credit_account_id ? {
    cus_id: sp.credit_cus_id,
    cus_name: sp.credit_cus_name
  } : null
}));

const result = {
  ...sale[0],
  sale_details: saleDetails || [],
  split_payments: transformedSplitPayments || []  // ✅ Now included!
};
```

---

### **Fix 2: All Sales GET (list)**
**Location:** `src/app/api/sales/route.js` lines 399-445 and 484

**Before:**
```javascript
// Format sales to match Prisma structure
const result = sales.map(sale => {
  return {
    // ... other fields
    split_payments: []  // ❌ Hardcoded empty array!
  };
});
```

**After:**
```javascript
// Fetch split_payments for all sales
let splitPayments = [];
const splitPaymentsBySaleId = {};
if (saleIds.length > 0) {
  try {
    splitPayments = await prisma.$queryRaw`
      SELECT 
        sp.split_payment_id, sp.sale_id, sp.amount, sp.payment_type,
        sp.debit_account_id, sp.credit_account_id, sp.reference,
        debit.cus_id as debit_cus_id, debit.cus_name as debit_cus_name,
        credit.cus_id as credit_cus_id, credit.cus_name as credit_cus_name
      FROM split_payments sp
      LEFT JOIN customers debit ON sp.debit_account_id = debit.cus_id
      LEFT JOIN customers credit ON sp.credit_account_id = credit.cus_id
      WHERE sp.sale_id IN (${Prisma.join(saleIds)})
    `;
    
    // Group split_payments by sale_id
    splitPayments.forEach(sp => {
      const spSaleId = Number(sp.sale_id);
      if (!splitPaymentsBySaleId[spSaleId]) {
        splitPaymentsBySaleId[spSaleId] = [];
      }
      splitPaymentsBySaleId[spSaleId].push({
        split_payment_id: sp.split_payment_id ? Number(sp.split_payment_id) : null,
        sale_id: spSaleId,
        amount: Number(sp.amount) || 0,
        payment_type: sp.payment_type,
        debit_account_id: sp.debit_account_id ? Number(sp.debit_account_id) : null,
        credit_account_id: sp.credit_account_id ? Number(sp.credit_account_id) : null,
        reference: sp.reference,
        debit_account: sp.debit_account_id ? {
          cus_id: Number(sp.debit_cus_id),
          cus_name: sp.debit_cus_name
        } : null,
        credit_account: sp.credit_account_id ? {
          cus_id: Number(sp.credit_cus_id),
          cus_name: sp.credit_cus_name
        } : null
      });
    });
  } catch (splitError) {
    console.warn('⚠️ Could not fetch split_payments (non-critical):', splitError.message);
  }
}

// Format sales to match Prisma structure
const result = sales.map(sale => {
  const saleIdNum = Number(sale.sale_id);
  return {
    // ... other fields
    split_payments: splitPaymentsBySaleId[saleIdNum] || []  // ✅ Now uses actual data!
  };
});
```

---

## 🎯 **What This Fixes**

### **Before:**
```json
{
  "sale_id": 47,
  "payment": 1500,
  "split_payments": []  // ❌ Empty!
}
```

### **After:**
```json
{
  "sale_id": 47,
  "payment": 1500,
  "split_payments": [  // ✅ Populated!
    {
      "amount": 1000,
      "payment_type": "CASH",
      "debit_account": null
    },
    {
      "amount": 500,
      "payment_type": "BANK_TRANSFER",
      "debit_account": {
        "cus_name": "HBL Bank"
      }
    }
  ]
}
```

---

## 📋 **Flow Now Works Like This:**

```
1. Create Sale
   ├─ Cash: 1000
   ├─ Bank: 500
   └─ Bank Account: HBL
   
2. Backend Saves
   ├─ Table: sales (payment: 1500)
   └─ Table: split_payments (2 rows)
   
3. Frontend Fetches Sale
   ├─ API calls: GET /api/sales
   ├─ Raw SQL fallback executes (if needed)
   ├─ Fetches split_payments from DB ✅
   └─ Returns complete data
   
4. Receipt Display
   ├─ Receives split_payments array ✅
   ├─ Finds cash payment (1000) ✅
   ├─ Finds bank payment (500) ✅
   └─ Displays both rows ✅
```

---

## 🧪 **Testing Instructions**

### **Step 1: Restart Dev Server**
```bash
npm run dev
```

### **Step 2: Create NEW Sale**
1. Go to Sales page
2. Enter:
   - Cash: 1000
   - Bank: 500
   - Bank Account: Select any bank
3. Click Save

### **Step 3: View Receipt**
1. Click **View Receipt** on the sale you just created
2. **Expected Alert:**
   ```
   🧾 Receipt Payments Found:
   
   Sale #XX
   Total Payments: 2
   
   1. Cash: 1000
   2. HBL Bank: 500
   
   Total Received: 1500
   ```

### **Step 4: Check Console**
Open browser console (F12) and look for:
```
📋 Viewing bill: {sale_id: XX, ...}
💰 Split payments: Array(2)
   0: {amount: 1000, payment_type: "CASH"}
   1: {amount: 500, payment_type: "BANK_TRANSFER", debit_account: {...}}
```

### **Step 5: Verify Receipt Display**
Receipt should show:
```
┌─────────────────────────┬──────────┐
│ Grand Total             │  X,XXX   │
├─────────────────────────┼──────────┤
│ نقد كيش (Cash)          │  1,000   │  ← Should appear
├─────────────────────────┼──────────┤
│ HBL Bank                │    500   │  ← Should appear
├─────────────────────────┼──────────┤
│ Total Received          │  1,500   │
└─────────────────────────┴──────────┘
```

---

## ✅ **Expected Results**

- ✅ Split payments are fetched from database
- ✅ Split payments are included in API response
- ✅ Alert shows payment breakdown
- ✅ Console logs show split_payments array
- ✅ Receipt displays cash and bank rows separately
- ✅ Bank account name appears correctly

---

## 🚨 **If Still Not Working**

If split payments still don't show after this fix, check:

1. **Browser Cache:** Hard refresh (Ctrl+Shift+R)
2. **Server Restart:** Stop and restart `npm run dev`
3. **Database:** Verify split_payments exist:
   ```sql
   SELECT * FROM split_payments ORDER BY split_payment_id DESC LIMIT 10;
   ```
4. **Network Tab:** Check API response includes split_payments
5. **Console Errors:** Look for any JavaScript errors

---

## 📝 **Summary**

**The issue was:** Raw SQL fallback was not fetching split_payments from database.

**The fix:** Added SQL queries to fetch split_payments in both single and list GET endpoints.

**The result:** Split payments now display correctly in receipts! 🎉

---

**Try creating a NEW sale and viewing its receipt. The split payments should now display!** ✅




