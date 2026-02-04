# Ledger Logic Update for Purchase and Purchase Return

## Overview
Updated the purchase API to properly differentiate between new purchases and purchase returns with correct ledger entries for each transaction type.

## Changes Made

### 1. **POST Request Update** - Accept `purchase_type` parameter
```javascript
purchase_type = 'new',        // 'new' or 'return'
return_for_purchase_id = null // Reference to original purchase if return
```

### 2. **Ledger Logic for SUPPLIER ACCOUNT**

#### NEW PURCHASE:
- **Debit**: Amount increases (supplier is owed money)
- **Closing Balance**: Opening + Debit Amount

#### PURCHASE RETURN:
- **Credit**: Amount decreases (refund to supplier)
- **Closing Balance**: Opening - Credit Amount

### 3. **Ledger Logic for CASH ACCOUNT**

#### NEW PURCHASE:
- **Credit**: Cash decreases (cash goes out)
- **Closing Balance**: Opening - Credit Amount
- **Ledger Entry**: `details = "Cash Payment for Purchase"`

#### PURCHASE RETURN:
- **Debit**: Cash increases (cash comes in)
- **Closing Balance**: Opening + Debit Amount
- **Ledger Entry**: `details = "Cash Refund for Purchase Return"`

### 4. **Ledger Logic for BANK ACCOUNT**

#### NEW PURCHASE:
- **Credit**: Bank balance decreases (funds transferred out)
- **Closing Balance**: Opening - Credit Amount
- **Ledger Entry**: `details = "Bank Payment for Purchase"`

#### PURCHASE RETURN:
- **Debit**: Bank balance increases (refund received)
- **Closing Balance**: Opening + Debit Amount
- **Ledger Entry**: `details = "Bank Refund for Purchase Return"`

### 5. **Stock Management**

#### NEW PURCHASE:
- Stock: **Increment** (items added to inventory)

#### PURCHASE RETURN:
- Stock: **Decrement** (items removed from inventory)

## Ledger Entry Structure

### For NEW PURCHASE:
```
Supplier Account:
- Debit: net_total
- Credit: 0
- Entry: "Purchase Invoice from [Supplier]"

Cash Account (if paid):
- Debit: 0
- Credit: cash_amount
- Entry: "Cash Payment for Purchase"

Bank Account (if paid):
- Debit: 0
- Credit: bank_amount
- Entry: "Bank Payment for Purchase"
```

### For PURCHASE RETURN:
```
Supplier Account:
- Debit: 0
- Credit: net_total
- Entry: "Purchase Return to [Supplier]"

Cash Account (if refunded):
- Debit: cash_amount
- Credit: 0
- Entry: "Cash Refund for Purchase Return"

Bank Account (if refunded):
- Debit: bank_amount
- Credit: 0
- Entry: "Bank Refund for Purchase Return"
```

## Summary Table

| Account | Purchase (Debit/Credit) | Return (Debit/Credit) | Balance Change |
|---------|-------------------------|------------------------|-----------------|
| **Supplier** | Debit / +Owed | Credit / -Owed | Purchase ↑, Return ↓ |
| **Cash** | Credit / -Cash | Debit / +Cash | Purchase ↓, Return ↑ |
| **Bank** | Credit / -Bank | Debit / +Bank | Purchase ↓, Return ↑ |

## Frontend Implementation
The purchase page now:
1. Includes dropdown to select "New Purchase" or "Purchase Return"
2. For returns: Shows supplier selection then purchase search
3. Sends `purchase_type` and `return_for_purchase_id` to API
4. API automatically creates correct ledger entries based on type

## Testing Checklist
- [ ] Create new purchase with cash payment - verify cash account decreases
- [ ] Create new purchase with bank payment - verify bank account decreases
- [ ] Create purchase return with cash refund - verify cash account increases
- [ ] Create purchase return with bank refund - verify bank account increases
- [ ] Verify supplier balance increases on new purchase
- [ ] Verify supplier balance decreases on purchase return
- [ ] Check ledger entries show correct transaction type
- [ ] Verify stock increments on new purchase
- [ ] Verify stock decrements on purchase return
