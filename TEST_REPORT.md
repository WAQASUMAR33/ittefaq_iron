═════════════════════════════════════════════════════════════════════════════════
TEST REPORT: ORDER-TO-SALE FLOW WITH LEDGER VERIFICATION
═════════════════════════════════════════════════════════════════════════════════

TEST SCENARIO
─────────────

1. CREATE ORDER (for customer "zain" ID 21)
   - Order Amount: PKR 5000
   - Payment: PKR 3000 (1000 cash + 2000 bank)
   - Expected Balance: PKR 2000 (outstanding)

2. CONVERT TO SALE & PAY REMAINING
   - Remaining Payment: PKR 2000 (500 cash + 1500 bank)
   - Expected Final Balance: PKR 0 (fully paid)

═════════════════════════════════════════════════════════════════════════════════
ROOT CAUSE ANALYSIS
═════════════════════════════════════════════════════════════════════════════════

PROBLEM IDENTIFIED:
──────────────────
When creating a NEW ORDER (first transaction), the system is NOT creating the 
BILL DEBIT ENTRY. It only creates PAYMENT CREDIT ENTRIES.

EXPECTED LEDGER FLOW:
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. BILL ENTRY (Debit) - Customer Account                                    │
│    Opening: 0  │  Debit: 5000  │  Credit: 0  │  Closing: 5000             │
│                                                                              │
│ 2. PAYMENT ENTRY (Credit) - Customer Account                               │
│    Opening: 5000  │  Debit: 0  │  Credit: 3000  │  Closing: 2000          │
└─────────────────────────────────────────────────────────────────────────────┘

ACTUAL LEDGER FLOW (BROKEN):
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PAYMENT ENTRY ONLY (Credit) - Customer Account                          │
│    Opening: 0  │  Debit: 0  │  Credit: 3000  │  Closing: -3000            │
│    (Missing bill debit!)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

RESULT:
───────
❌ First Order Balance: -1000 (should be 2000)
❌ Converted Sale Balance: -3000 (should be 0)

═════════════════════════════════════════════════════════════════════════════════
ROOT CAUSE IN CODE
═════════════════════════════════════════════════════════════════════════════════

Location: /src/app/api/sales/route.js (lines 810-830)

CODE LOGIC:
───────────
```javascript
if (!actualIsLoadedOrder) {
  // New sale from scratch: Debit full netTotal
  const debitAmount = netTotal;
  
  if (debitAmount > 0) {
    const billEntry = createLedgerEntry({
      // ... create bill entry ...
    });
    ledgerEntries.push(billEntry);
    runningBalance = billEntry.closing_balance;
  }
}
```

PROBLEM:
────────
The condition `if (!actualIsLoadedOrder)` should evaluate to TRUE for new orders,
but it appears to be FALSE, so the bill entry is never created.

POSSIBLE REASONS:
─────────────────
1. actualIsLoadedOrder is being set to TRUE incorrectly
2. The is_loaded_order flag from frontend is being sent as TRUE
3. The reference field is somehow matching "Converted from Order"

═════════════════════════════════════════════════════════════════════════════════
INVESTIGATION NEEDED
═════════════════════════════════════════════════════════════════════════════════

To fix this, we need to:

1. Add comprehensive logging to verify:
   - What value of is_loaded_order is being received
   - What value of reference is being received
   - What actualIsLoadedOrder evaluates to

2. Check why the bill entry creation code is being skipped

3. Verify the ledger entry array is being built in the correct order

═════════════════════════════════════════════════════════════════════════════════
TEST DATA USED
═════════════════════════════════════════════════════════════════════════════════

Order #95 (First Transaction):
- Customer: zain (ID: 21)
- Product: crush dina (ID: 2)
- Quantity: 50 PCS @ 100 each = 5000
- is_loaded_order flag: false
- reference: "Test Order - Initial Creation"
- cash_payment: 1000
- bank_payment: 2000

Order #96 (Conversion):
- Same customer & product
- is_loaded_order flag: true
- reference: "Converted from Order #95. Final Payment"
- cash_payment: 500
- bank_payment: 1500

═════════════════════════════════════════════════════════════════════════════════
NEXT STEPS
═════════════════════════════════════════════════════════════════════════════════

1. Add detailed server-side logging to trace:
   - Incoming request data
   - actualIsLoadedOrder evaluation
   - Ledger entry creation order

2. Check if the issue is in:
   - Frontend: Is it sending is_loaded_order: true when it should be false?
   - Backend: Is the logic incorrectly evaluating the flag?
   - Database: Are entries being created in wrong order?

3. Once identified, fix the root cause and re-run the test

═════════════════════════════════════════════════════════════════════════════════
