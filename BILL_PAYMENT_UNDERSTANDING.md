# 💰 Complete Understanding: Bill Payment in Sale Page

## 📊 **Overview**

The sale page supports **split payments** - allowing customers to pay with **BOTH cash AND bank transfer** in a single transaction.

---

## 🎯 **How It Works - Complete Flow**

### **1. User Interface (Payment Fields)**

On the sale creation page, there are 4 payment-related fields:

```
Payment Section:
┌─────────────┬─────────────┬─────────────────┬──────────────────┐
│   CASH      │    BANK     │  BANK ACCOUNT   │  TOTAL RECEIVED  │
├─────────────┼─────────────┼─────────────────┼──────────────────┤
│  [Input]    │   [Input]   │  [Dropdown]     │   [Read-Only]    │
│   1000      │    500      │   HBL Bank ▼    │      1,500       │
└─────────────┴─────────────┴─────────────────┴──────────────────┘
```

**Field Details:**
1. **CASH** - Amount paid in cash
2. **BANK** - Amount paid via bank transfer
3. **BANK ACCOUNT** - Which bank account received the payment
4. **TOTAL RECEIVED** - Auto-calculated (Cash + Bank)

---

### **2. State Management (React)**

```javascript
const [paymentData, setPaymentData] = useState({
  cash: 0,              // Cash amount
  bank: 0,              // Bank amount
  bankAccountId: '',    // Selected bank account ID
  totalCashReceived: 0, // Auto-calculated (cash + bank)
  discount: 0,
  labour: 0,
  deliveryCharges: 0,
  notes: ''
});
```

---

### **3. Auto-Calculation Logic**

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
- User enters Cash: **1000**
- User enters Bank: **500**
- System auto-calculates Total: **1500**

---

### **4. Building Split Payments Array**

When user clicks **Save**, the system creates a `split_payments` array:

```javascript
const splitPayments = [];
const cashAmount = parseFloat(paymentData.cash) || 0;
const bankAmount = parseFloat(paymentData.bank) || 0;

// Add CASH payment (if amount > 0)
if (cashAmount > 0) {
  splitPayments.push({
    amount: 1000,
    payment_type: 'CASH',
    debit_account_id: null,
    credit_account_id: null,
    reference: 'Cash payment'
  });
}

// Add BANK payment (if amount > 0 AND bank account selected)
if (bankAmount > 0 && paymentData.bankAccountId) {
  splitPayments.push({
    amount: 500,
    payment_type: 'BANK_TRANSFER',
    debit_account_id: 123,  // Selected bank account ID
    credit_account_id: null,
    reference: 'Bank payment'
  });
}
```

**Result:**
```javascript
splitPayments = [
  { amount: 1000, payment_type: 'CASH', debit_account_id: null },
  { amount: 500, payment_type: 'BANK_TRANSFER', debit_account_id: 123 }
]
```

---

### **5. Sending to Backend API**

```javascript
const saleData = {
  cus_id: formSelectedCustomer.cus_id,
  store_id: formSelectedStore.storeid,
  total_amount: grandTotal,
  payment: totalCashReceived,  // 1500 (cash + bank)
  payment_type: 'CASH',
  debit_account_id: paymentData.bankAccountId,
  sale_details: [...],
  transport_details: [...],
  split_payments: [            // ← The split payments array
    { amount: 1000, payment_type: 'CASH' },
    { amount: 500, payment_type: 'BANK_TRANSFER', debit_account_id: 123 }
  ]
};

await fetch('/api/sales', {
  method: 'POST',
  body: JSON.stringify(saleData)
});
```

---

### **6. Backend Processing**

```javascript
// Extract split_payments from request
const { split_payments } = body;

// Create split payment records in database
if (split_payments && split_payments.length > 0) {
  for (let splitPayment of split_payments) {
    await tx.splitPayment.create({
      data: {
        sale_id: sale.sale_id,
        amount: splitPayment.amount,
        payment_type: splitPayment.payment_type,
        debit_account_id: splitPayment.debit_account_id || null,
        credit_account_id: splitPayment.credit_account_id || null,
        reference: splitPayment.reference || null
      }
    });
  }
}
```

---

### **7. Database Storage**

Data is saved in **TWO tables**:

#### **Table: `sales`** (Main sale record)
```
sale_id | cus_id | total_amount | payment | payment_type | debit_account_id
--------|--------|--------------|---------|--------------|------------------
47      | 5      | 2500         | 1500    | CASH         | 123
```

#### **Table: `split_payments`** (Individual payments)
```
split_payment_id | sale_id | amount | payment_type   | debit_account_id
-----------------|---------|--------|----------------|------------------
1                | 47      | 1000   | CASH           | NULL
2                | 47      | 500    | BANK_TRANSFER  | 123
```

---

### **8. Fetching for Receipt Display**

#### **API GET Request**
```javascript
const response = await fetch('/api/sales?id=47');
const sale = await response.json();
```

#### **API Response**
```json
{
  "sale_id": 47,
  "payment": 1500,
  "payment_type": "CASH",
  "split_payments": [
    {
      "amount": 1000,
      "payment_type": "CASH",
      "debit_account": null
    },
    {
      "amount": 500,
      "payment_type": "BANK_TRANSFER",
      "debit_account": {
        "cus_id": 123,
        "cus_name": "HBL Bank"
      }
    }
  ]
}
```

---

### **9. Receipt Display Logic**

```javascript
// Check if split_payments exist
if (selectedBill.split_payments && selectedBill.split_payments.length > 0) {
  // NEW SALES: Show split payments
  const cashPayment = selectedBill.split_payments.find(sp => sp.payment_type === 'CASH');
  const bankPayment = selectedBill.split_payments.find(sp => sp.payment_type === 'BANK_TRANSFER');
  
  // Display cash row
  <TableRow>
    <TableCell>نقد كيش</TableCell>
    <TableCell>{cashPayment?.amount || 0}</TableCell>
  </TableRow>
  
  // Display bank row (if exists)
  {bankPayment && (
    <TableRow>
      <TableCell>{bankPayment.debit_account?.cus_name || 'بینک'}</TableCell>
      <TableCell>{bankPayment.amount}</TableCell>
    </TableRow>
  )}
} else {
  // OLD SALES: Legacy display (single payment)
  <TableRow>
    <TableCell>نقد كيش</TableCell>
    <TableCell>{selectedBill.payment}</TableCell>
  </TableRow>
}
```

---

### **10. Final Receipt Display**

```
┌────────────────────────────┬──────────┐
│ كل رقم (Grand Total)       │  2,500   │
├────────────────────────────┼──────────┤
│ نقد كيش (Cash)             │  1,000   │  ← From split_payments[0]
├────────────────────────────┼──────────┤
│ HBL Bank                   │    500   │  ← From split_payments[1]
├────────────────────────────┼──────────┤
│ كل رقم وصول (Total)        │  1,500   │
├────────────────────────────┼──────────┤
│ باقی (Balance)             │  1,000   │
└────────────────────────────┴──────────┘
```

---

## 🔄 **Complete Data Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                       USER INPUT                            │
│  Cash: 1000  |  Bank: 500  |  Bank: HBL  |  Total: 1500   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    REACT STATE                              │
│  paymentData = {cash: 1000, bank: 500, bankAccountId: 123} │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                BUILD SPLIT PAYMENTS                         │
│  splitPayments = [                                          │
│    {amount: 1000, type: 'CASH'},                           │
│    {amount: 500, type: 'BANK_TRANSFER', account_id: 123}   │
│  ]                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   API REQUEST                               │
│  POST /api/sales                                            │
│  Body: { split_payments: [...] }                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND PROCESSING                             │
│  1. Create sale record in 'sales' table                    │
│  2. Create 2 records in 'split_payments' table             │
│  3. Update customer balance                                 │
│  4. Update bank account balance                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE STORAGE                           │
│  Table: sales            Table: split_payments              │
│  ┌──────────────┐       ┌───────────────────────┐          │
│  │ sale_id: 47  │       │ id: 1, amount: 1000   │          │
│  │ payment: 1500│       │ id: 2, amount: 500    │          │
│  └──────────────┘       └───────────────────────┘          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                VIEW RECEIPT (FETCH)                         │
│  GET /api/sales?id=47                                       │
│  Response: { sale_id: 47, split_payments: [...] }          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 RECEIPT DISPLAY                             │
│  نقد كيش: 1,000                                             │
│  HBL Bank: 500                                              │
│  Total: 1,500                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Payment Scenarios**

### **Scenario 1: Cash Only**
```
Input:  Cash: 1500  |  Bank: 0
Result: split_payments = [{amount: 1500, type: 'CASH'}]
Display: نقد كيش: 1,500
```

### **Scenario 2: Bank Only**
```
Input:  Cash: 0  |  Bank: 1500  |  Bank: HBL
Result: split_payments = [{amount: 1500, type: 'BANK_TRANSFER', account: 123}]
Display: HBL Bank: 1,500
```

### **Scenario 3: Both Cash and Bank**
```
Input:  Cash: 1000  |  Bank: 500  |  Bank: MCB
Result: split_payments = [
  {amount: 1000, type: 'CASH'},
  {amount: 500, type: 'BANK_TRANSFER', account: 456}
]
Display: 
  نقد كيش: 1,000
  MCB Bank: 500
```

### **Scenario 4: No Payment**
```
Input:  Cash: 0  |  Bank: 0
Result: split_payments = []
Display: نقد كيش: 0
```

---

## 🛠️ **The Fix Applied**

### **Problem:**
The API's raw SQL fallback was returning **empty split_payments arrays** even though data existed in the database.

### **Solution:**
Added SQL queries to fetch split_payments from the database in the raw SQL fallback code.

**Before:**
```javascript
split_payments: []  // ❌ Hardcoded empty
```

**After:**
```javascript
// Fetch from database
const splitPayments = await prisma.$queryRaw`...`;
// Transform and return
split_payments: splitPaymentsBySaleId[saleId] || []  // ✅ Real data
```

---

## ✅ **Key Points to Remember**

1. **Two payment types**: Cash and Bank Transfer
2. **Auto-calculation**: Total = Cash + Bank
3. **Conditional creation**: Only creates payment if amount > 0
4. **Bank requires account**: Bank payment needs bank account selected
5. **Array storage**: Each payment is a separate record in `split_payments` table
6. **Separate display**: Receipt shows cash and bank payments separately
7. **Bank name display**: Shows actual bank account name (not "easy paisa")
8. **Legacy support**: Old sales without split_payments still display correctly

---

## 📝 **Testing Checklist**

To verify everything works:

- [ ] Create new sale with cash and bank amounts
- [ ] Select bank account from dropdown
- [ ] Save sale successfully
- [ ] View receipt
- [ ] See alert showing payment breakdown
- [ ] Verify console shows split_payments array
- [ ] Check receipt displays both cash and bank rows
- [ ] Confirm bank name appears correctly
- [ ] Verify customer balance updates correctly

---

**This is the complete understanding of how bill payments work in the sale page!** 💰




