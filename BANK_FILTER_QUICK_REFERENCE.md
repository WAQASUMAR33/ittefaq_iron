# Bank Selection Filter - Quick Reference ⚡

## What Was Changed?

### Files Modified:
1. `src/app/dashboard/sales/page.js` - Sales module
2. `src/app/dashboard/orders/page.js` - Orders module

### Changes Made:
✅ Added proper bank account filtering function based on both category AND type
✅ Updated fetch function to use the new filtering logic
✅ Added auto-filter effect to keep dropdowns synchronized with data changes

---

## How Bank Selection Filter Works

When creating a **Sale** or **Order** and you enter a **Bank Payment Amount**:

```
1. User enters Bank Payment Amount
   ↓
2. Bank Account dropdown becomes enabled
   ↓
3. Dropdown shows filtered accounts where:
   - Customer's category contains "bank"
   - AND customer's type contains "bank"
   ↓
4. User selects bank account for payment
   ↓
5. Selected bank account is used for ledger entries
```

---

## Filtering Criteria

### For Bank Accounts:
| Requirement | Details |
|-------------|---------|
| **Category** | Must contain 'bank' (case-insensitive) |
| **Type** | Must contain 'bank' (case-insensitive) |
| **Logic** | BOTH conditions must be true (AND) |

### Example:
✅ Valid: Category = "Bank Accounts", Type = "Bank Transfer"
✅ Valid: Category = "Banking", Type = "Bank"
❌ Invalid: Category = "Bank Accounts", Type = "Cash" (type doesn't match)
❌ Invalid: Category = "Suppliers", Type = "Bank" (category doesn't match)

---

## Console Debug Messages

When browser console is open (F12), you'll see:

```javascript
🔍 Filtering bank accounts for sales:
  - Available customers: 25
  - Available categories: 5
  - Available types: 8
✅ Filtered 3 bank accounts (BOTH category AND type contain 'bank')
🏦 Bank accounts found: 3
```

---

## Testing Steps

### 1. Test Sales Module:
```
1. Go to Dashboard → Sales
2. Click "Create New Sale"
3. Select a customer and add products
4. In Payment section, enter amount in "BANK" field
5. Click "BANK ACCOUNT" dropdown
6. Verify it shows only bank accounts (not suppliers, cash, etc.)
```

### 2. Test Orders Module:
```
1. Go to Dashboard → Orders
2. Click "Create New Order"
3. Select a customer and add products
4. In Payment section, enter amount in "BANK" field
5. Click "BANK ACCOUNT" dropdown
6. Verify it shows only bank accounts (not suppliers, transport, etc.)
```

### 3. Compare with Purchase:
```
1. Go to Dashboard → Purchases
2. Create a new purchase
3. Compare bank account dropdown options with Sales/Orders
4. Should show identical accounts across all three
```

---

## Code Structure

### Filtering Function (Same in both Sales & Orders):
```javascript
const filterBankAccountsByCategory = (customers, customerCategories, customerTypes) => {
  const filteredBankAccounts = customers.filter(customer => {
    const categoryInfo = customerCategories.find(cat => 
      cat.cus_cat_id === customer.cus_category
    );
    const typeInfo = customerTypes.find(t => 
      t.cus_type_id === customer.cus_type
    );
    const hasBank = categoryInfo && 
      categoryInfo.cus_cat_title.toLowerCase().includes('bank');
    const hasBank2 = typeInfo && 
      typeInfo.cus_type_title.toLowerCase().includes('bank');
    return hasBank && hasBank2;
  });
  return filteredBankAccounts;
};
```

### Auto-Filter Effect (Same in both Sales & Orders):
```javascript
useEffect(() => {
  if (customers.length > 0 && 
      customerCategories.length > 0 && 
      customerTypes.length > 0) {
    console.log('🔍 Auto-filtering bank accounts...');
    fetchBankAccounts(customers);
  }
}, [customers, customerCategories, customerTypes]);
```

---

## Related Documentation

- 📄 [BANK_SELECTION_FILTER_IMPLEMENTATION.md](BANK_SELECTION_FILTER_IMPLEMENTATION.md) - Detailed implementation
- 📄 [PURCHASE_DROPDOWN_FILTERING.md](PURCHASE_DROPDOWN_FILTERING.md) - Original purchase implementation

---

## Troubleshooting

### Issue: No bank accounts showing in dropdown
**Solution:**
1. Check browser console for error messages
2. Verify customer has 'bank' in BOTH category AND type
3. Check if customers and customer categories/types are loaded
4. Refresh the page

### Issue: Wrong accounts showing
**Solution:**
1. Verify customer setup in Database
2. Make sure category title contains 'bank'
3. Make sure type title contains 'bank'
4. Both must be true (not just one)

### Issue: Dropdown not updating
**Solution:**
1. Hard refresh browser (Ctrl+F5)
2. Check browser console for warnings
3. Verify fetching of customers, categories, and types completed

---

## Key Takeaway

Bank account filtering now works **consistently** across:
- ✅ Purchases
- ✅ Sales
- ✅ Orders

Using the **same logic**: Category AND Type must both contain 'bank'
