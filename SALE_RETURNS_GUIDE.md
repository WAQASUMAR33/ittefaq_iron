# Sale Returns Feature Guide

## Overview
The Sale Returns feature allows you to process product returns from customers. When a sale is returned, the system automatically:
1. Restores product stock quantities
2. Reverses customer balance (reduces customer debt)
3. Processes refunds to customers
4. **Deducts shipping amounts from loader balance** (if applicable)
5. Creates appropriate ledger entries

## Key Features

### 1. Return Processing
- Select any existing sale to process a return
- All sale details are automatically populated
- Modify quantities if needed (partial returns)
- Add a reason for the return (required)

### 2. Loader Balance Adjustment
**Important:** When a sale return includes a loader and shipping amount:
- The shipping amount is **subtracted** from the loader's balance
- This reflects that the loader should not be paid for returned goods
- Example: If loader balance was 5000 and return has 200 shipping, new balance will be 4800

### 3. Ledger Entries
The system creates reverse ledger entries:
- Credit entry: Reduces customer's debt by the return amount
- Debit entry: Records the refund payment

### 4. Customer Balance
Customer balance is adjusted to reflect the return:
- Formula: `New Balance = Old Balance - Net Total + Refund Payment`

## How to Use

### Step 1: Access Sale Returns
1. Navigate to **Sales > Sale Returns** from the sidebar
2. Click **"Process Return"** button

### Step 2: Select Sale
1. Search for the sale you want to return
2. Click on the sale from the dropdown
3. All sale details will be automatically loaded

### Step 3: Configure Return
1. **Products**: Review products to be returned
   - Adjust quantities if needed (for partial returns)
   - Remove products that are not being returned
2. **Return Reason**: Enter a detailed reason (required)
3. **Refund Type**: Select payment method (Cash/Cheque/Bank Transfer)
4. **Refund Amount**: Enter the amount to refund
5. **Accounts**: 
   - To Account (Debit): Where the money goes
   - From Account (Credit): Where the money comes from

### Step 4: Review Loader Impact
- If the original sale had a loader assigned:
  - You'll see a yellow notification box
  - Shows which loader will be affected
  - Shows the shipping amount that will be deducted
  - **This deduction is automatic and cannot be skipped**

### Step 5: Submit
1. Review the total summary
2. Click **"Process Return"**
3. System will process all adjustments automatically

## Business Logic

### Stock Management
```
New Stock = Old Stock + Returned Quantity
```

### Customer Balance
```
Opening Balance: Customer's current balance
Credit: Return amount (reduces debt)
Debit: Refund payment (increases money owed back)
Closing Balance: Opening - Credit + Debit
```

### Loader Balance (If Applicable)
```
New Loader Balance = Old Balance - Shipping Amount
```
**Why?** Because the loader should not be compensated for goods that were returned.

## Important Notes

1. **Partial Returns**: You can return fewer items than the original sale
2. **Multiple Returns**: You can process multiple returns for the same sale
3. **Loader Impact**: Always check if a loader is involved before processing returns
4. **Cannot Edit**: Once created, returns cannot be edited (only deleted)
5. **Deletion**: Deleting a return will:
   - Reverse all stock adjustments
   - Add back the shipping amount to loader balance
   - Remove ledger entries
   - Restore customer balance

## Example Scenario

### Original Sale
- Customer: ABC Trading
- Products: 100 units @ $10 = $1000
- Loader: John Doe
- Shipping: $200
- Customer Balance After Sale: $1200

### Return Processing
- Returned: 50 units @ $10 = $500
- Refund: $500
- Reason: "Damaged goods"

### After Return
- Stock: +50 units restored
- Customer Balance: $1200 - $500 + $500 = $1200 (net zero if full refund)
- Loader Balance: Previous Balance - $200 (shipping deducted)
- Ledger: 2 new entries for return and refund

## Migration Instructions

### Database Setup
1. Run the migration SQL file:
```bash
# Using your preferred method to execute SQL
mysql -u username -p database_name < prisma/migrations/manual_add_sale_returns.sql
```

2. Or manually apply the migration through your database client

### Prisma Update
If you modify the schema further:
```bash
npx prisma generate
npx prisma db push
```

## Troubleshooting

### Error: "Sale not found"
- Ensure the sale exists and hasn't been deleted
- Check that you have proper permissions

### Error: "Failed to create sale return"
- Verify all required fields are filled
- Check that products still exist in the system
- Ensure customer account is active

### Loader Balance Issues
- Verify loader exists in the system
- Check that shipping amount is valid
- Ensure loader balance can accommodate the deduction

## Support
For additional support or questions, please contact your system administrator.


