# 💰 Bill Payment Flow in Sale Page - Complete Explanation

## 📊 Overview

The sale page collects **TWO types of payments**:
1. **CASH** - Cash payment amount
2. **BANK** - Bank transfer amount

These are saved separately as **split_payments** in the database.

---

## 🔄 Complete Payment Flow

### **Step 1: User Interface (Payment Section)**

On the sale creation page, there are 4 payment fields:

```
┌─────────────┬─────────────┬─────────────────┬──────────────────┐
│   CASH      │    BANK     │  BANK ACCOUNT   │  TOTAL RECEIVED  │
├─────────────┼─────────────┼─────────────────┼──────────────────┤
│  [1000]     │   [500]     │  [HBL Bank ▼]   │    1,500         │
└─────────────┴─────────────┴─────────────────┴──────────────────┘
```

**Fields:**
1. **CASH**: Input field for cash amount
2. **BANK**: Input field for bank amount
3. **BANK ACCOUNT**: Dropdown to select which bank account
4. **TOTAL CASH RECEIVED**: Auto-calculated (Cash + Bank) - READ ONLY

### **Step 2: State Management**

All payment data is stored in `paymentData` state:

```javascript
const [paymentData, setPaymentData] = useState({
  cash: 0,                    // Cash amount entered
  bank: 0,                    // Bank amount entered
  bankAccountId: '',          // Selected bank account ID
  totalCashReceived: 0,       // Auto-calculated total (cash + bank)
  discount: 0,
  labour: 0,
  deliveryCharges: 0,
  notes: ''
});
```

### **Step 3: Auto-Calculation**

When user enters cash or bank amount, `totalCashReceived` is auto-calculated:

```javascript
useEffect(() => {
  const cash = parseFloat(paymentData.cash) || 0;
  const bank = parseFloat(paymentData.bank) || 0;
  const totalCashReceived = cash + bank;
  
  setPaymentData(prev => ({
    ...prev,
    totalCashReceived: totalCashReceived
  }));
}, [paymentData.cash, paymentData.bank]);
```

**Example:**
- User enters Cash: 1000
- User enters Bank: 500
- Total Cash Received: **1500** (auto-calculated)

### **Step 4: Building Split Payments Array**

When user clicks "Save", the system builds `split_payments` array:

```javascript
// Build split payments array for cash and bank
const splitPayments = [];
const cashAmount = parseFloat(paymentData.cash) || 0;
const bankAmount = parseFloat(paymentData.bank) || 0;

// Add cash payment if there's any cash
if (cashAmount > 0) {
  splitPayments.push({
    amount: cashAmount,
    payment_type: 'CASH',
    debit_account_id: null,
    credit_account_id: null,
    reference: 'Cash payment'
  });
}

// Add bank payment if there's any bank payment
if (bankAmount > 0 && paymentData.bankAccountId) {
  splitPayments.push({
    amount: bankAmount,
    payment_type: 'BANK_TRANSFER',
    debit_account_id: paymentData.bankAccountId,
    credit_account_id: null,
    reference: 'Bank payment'
  });
}
```

**Result:**
```javascript
splitPayments = [
  {
    amount: 1000,
    payment_type: 'CASH',
    debit_account_id: null,
    credit_account_id: null,
    reference: 'Cash payment'
  },
  {
    amount: 500,
    payment_type: 'BANK_TRANSFER',
    debit_account_id: 123,  // Selected bank account ID
    credit_account_id: null,
    reference: 'Bank payment'
  }
]
```

### **Step 5: API Request**

The `split_payments` array is sent to the backend API:

```javascript
const saleData = {
  cus_id: formSelectedCustomer.cus_id,
  store_id: formSelectedStore.storeid,
  total_amount: grandTotal,
  discount: parseFloat(paymentData.discount) || 0,
  payment: totalCashReceived,  // Total of all payments
  payment_type: 'CASH',         // Default
  debit_account_id: paymentData.bankAccountId || null,
  sale_details: [...],
  transport_details: [...],
  split_payments: splitPayments,  // ← Split payments array
  updated_by: 1
};

// Send to API
const response = await fetch('/api/sales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(saleData)
});
```

### **Step 6: Backend Processing**

The backend API (`src/app/api/sales/route.js`) receives and saves the data:

```javascript
// Extract split_payments from request
const { split_payments } = body;

// Log what was received
console.log('💰 Split payments received:', split_payments);
console.log('💰 Split payments length:', split_payments?.length);

// Create split payments in database
if (split_payments && split_payments.length > 0) {
  const splitPaymentPromises = split_payments.map(splitPayment => 
    tx.splitPayment.create({
      data: {
        sale_id: sale.sale_id,
        amount: parseFloat(splitPayment.amount),
        payment_type: splitPayment.payment_type,
        debit_account_id: splitPayment.debit_account_id || null,
        credit_account_id: splitPayment.credit_account_id || null,
        reference: splitPayment.reference || null
      }
    })
  );
  await Promise.all(splitPaymentPromises);
}
```

### **Step 7: Database Storage**

Data is saved in TWO tables:

**Table 1: `sales`**
```sql
sale_id | cus_id | total_amount | payment | payment_type | ...
--------|--------|--------------|---------|--------------|----
47      | 5      | 2500         | 1500    | CASH         | ...
```

**Table 2: `split_payments`**
```sql
split_payment_id | sale_id | amount | payment_type   | debit_account_id
-----------------|---------|--------|----------------|------------------
1                | 47      | 1000   | CASH           | NULL
2                | 47      | 500    | BANK_TRANSFER  | 123
```

### **Step 8: Receipt Display**

When viewing the receipt, the system:

1. Fetches sale with split_payments from API
2. Checks if `split_payments` array exists
3. Displays cash and bank separately:

```
Receipt Display:
┌──────────────────┬──────────┐
│ كل رقم           │  2,500   │ Total Amount
├──────────────────┼──────────┤
│ نقد كيش          │  1,000   │ Cash (from split_payments)
├──────────────────┼──────────┤
│ HBL Bank         │    500   │ Bank (from split_payments)
├──────────────────┼──────────┤
│ كل رقم وصول      │  1,500   │ Total Received
└──────────────────┴──────────┘
```

---

## 🔍 Payment Rules

### **Rule 1: Cash Payment**
```javascript
if (cashAmount > 0) {
  // Add to split_payments
}
```
- Only added if amount > 0
- debit_account_id is NULL (cash doesn't have account)

### **Rule 2: Bank Payment**
```javascript
if (bankAmount > 0 && paymentData.bankAccountId) {
  // Add to split_payments
}
```
- Only added if amount > 0 **AND** bank account is selected
- debit_account_id = selected bank account ID

### **Rule 3: Total Cash Received**
```javascript
totalCashReceived = cash + bank
```
- Auto-calculated
- Stored in `sales.payment` field
- Sum of all split payments

---

## ❌ Common Issues & Causes

### Issue 1: Split payments not being created

**Possible Causes:**
1. **Cash amount is 0 or empty**
   - Solution: Enter cash amount > 0
   
2. **Bank amount is 0 or empty**
   - Solution: Enter bank amount > 0
   
3. **Bank account not selected**
   - Solution: Select bank from dropdown
   
4. **Both payments are 0**
   - Solution: Enter at least one payment > 0

### Issue 2: Only one payment saved (not both)

**Possible Causes:**
1. **Only one payment entered**
   - Check: Did you enter BOTH cash AND bank?
   
2. **Bank account not selected**
   - Check: Did you select bank from dropdown?

### Issue 3: Split payments not showing in receipt

**Possible Causes:**
1. **Viewing old sale** (before feature was added)
   - Solution: Create NEW sale to test
   
2. **API not including split_payments in response**
   - Check: API response includes split_payments
   
3. **Display rendering issue**
   - Check: Browser console for errors

---

## 🧪 Test Scenarios

### Scenario 1: Both Cash and Bank
```
Input:
- Cash: 1000
- Bank: 500
- Bank Account: HBL

Expected split_payments:
[
  { amount: 1000, payment_type: 'CASH' },
  { amount: 500, payment_type: 'BANK_TRANSFER', debit_account_id: 123 }
]
```

### Scenario 2: Cash Only
```
Input:
- Cash: 1500
- Bank: 0
- Bank Account: (not selected)

Expected split_payments:
[
  { amount: 1500, payment_type: 'CASH' }
]
```

### Scenario 3: Bank Only
```
Input:
- Cash: 0
- Bank: 1500
- Bank Account: MCB

Expected split_payments:
[
  { amount: 1500, payment_type: 'BANK_TRANSFER', debit_account_id: 456 }
]
```

### Scenario 4: No Payments
```
Input:
- Cash: 0
- Bank: 0

Expected split_payments:
[]  ← Empty array
```

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│   User Input    │
│  Cash: 1000     │
│  Bank: 500      │
│  Bank ID: 123   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  paymentData    │
│   State         │
│  (React)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Array     │
│ splitPayments = │
│   [cash, bank]  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Request   │
│  POST /sales    │
│ {split_payments}│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend Save   │
│  to Database    │
│  (split_pay...  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Display       │
│   Receipt       │
│  Cash: 1000     │
│  Bank: 500      │
└─────────────────┘
```

---

## ✅ Key Points

1. **Two payment types**: Cash and Bank
2. **Auto-calculation**: Total = Cash + Bank
3. **Conditional creation**: Only if amount > 0
4. **Bank requires account**: Bank payment needs bank account selected
5. **Array format**: split_payments is an array of objects
6. **Separate storage**: Each payment is a row in split_payments table
7. **Receipt display**: Shows both payments separately

---

## 🔍 Debugging Checklist

To debug payment issues, check:

- [ ] Are cash and bank values being entered?
- [ ] Is bank account selected from dropdown?
- [ ] Is split_payments array built correctly? (Check console)
- [ ] Is split_payments sent in API request? (Check network tab)
- [ ] Are split_payments saved to database? (Check database query)
- [ ] Are split_payments loaded in receipt? (Check API response)
- [ ] Is receipt rendering split_payments? (Check browser console)

---

**This is how the complete payment flow works from user input to database storage to receipt display!** 💰




