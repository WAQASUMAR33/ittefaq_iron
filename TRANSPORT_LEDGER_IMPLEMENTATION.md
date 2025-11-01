# Transport Amount and Ledger Implementation

## Changes Made

### 1. Frontend Changes (✅ COMPLETED)
Updated `src/app/dashboard/sales/page.js` to:
- Include transport amounts in total calculation
- Send transport details to the API
- Use grand total (including transport) as the sale total amount

### 2. Backend Changes (NEEDS IMPLEMENTATION)
The sales API needs to be updated to handle transport ledger entries.

## Required API Changes

Add the following code to the POST method in `src/app/api/sales/route.js` after the split payments section:

```javascript
// 6. Transport Entries (if any)
if (transport_details && transport_details.length > 0) {
  for (const transport of transport_details) {
    const transportAmount = parseFloat(transport.amount);
    
    if (transport.account_id && transportAmount > 0) {
      const transportAccount = await tx.customer.findUnique({
        where: { cus_id: transport.account_id }
      });
      
      if (transportAccount) {
        // Debit Transport Account
        await createLedgerEntry(tx, {
          cus_id: transport.account_id,
          opening_balance: transportAccount.cus_balance,
          debit_amount: transportAmount,
          credit_amount: 0,
          closing_balance: transportAccount.cus_balance + transportAmount,
          bill_no: sale.sale_id.toString(),
          trnx_type: 'CASH',
          details: `Transport Charges - ${bill_type || 'BILL'} - ${transport.description || 'Transport'}`,
          payments: 0,
          updated_by
        });

        // Credit Sundry Debtors Account
        if (specialAccounts.sundryDebtors) {
          await createLedgerEntry(tx, {
            cus_id: specialAccounts.sundryDebtors.cus_id,
            opening_balance: specialAccounts.sundryDebtors.cus_balance,
            debit_amount: 0,
            credit_amount: transportAmount,
            closing_balance: specialAccounts.sundryDebtors.cus_balance - transportAmount,
            bill_no: sale.sale_id.toString(),
            trnx_type: 'CASH',
            details: `Transport Charges - ${bill_type || 'BILL'} - Sundry Debtors`,
            payments: 0,
            updated_by
          });
        }

        // Update transport account balance
        await tx.customer.update({
          where: { cus_id: transport.account_id },
          data: {
            cus_balance: {
              increment: transportAmount
            }
          }
        });

        // Update sundry debtors balance
        if (specialAccounts.sundryDebtors) {
          await tx.customer.update({
            where: { cus_id: specialAccounts.sundryDebtors.cus_id },
            data: {
              cus_balance: {
                decrement: transportAmount
              }
            }
          });
        }
      }
    }
  }
}
```

## How It Works

### 1. Total Amount Calculation
- **Before**: Only product amounts were included in `total_amount`
- **After**: Grand total (products + transport + labour + delivery - discount) is used as `total_amount`

### 2. Transport Ledger Entries
For each transport entry, the system creates:
- **Debit Entry**: Transport account (amount owed to transporter)
- **Credit Entry**: Sundry Debtors account (amount to be collected from customer)

### 3. Balance Updates
- Transport account balance is increased (debit)
- Sundry Debtors account balance is decreased (credit)

## Benefits

1. **Accurate Totals**: Transport amounts are now included in the sale total
2. **Complete Ledger**: Every transport charge creates proper double-entry bookkeeping
3. **Account Tracking**: Transport accounts and sundry debtors are properly tracked
4. **Audit Trail**: Clear ledger entries for all transport transactions

## Testing

To test the implementation:
1. Create a sale with transport amounts
2. Verify the total includes transport costs
3. Check that ledger entries are created for transport accounts
4. Confirm account balances are updated correctly


