# Ledger Tracking & Console Reporting Feature

## Overview

This feature automatically tracks and reports ledger values whenever a **Sale** or **Order** is created in your system. It generates comprehensive console reports showing:

- Customer balance changes
- Ledger entries created
- Special account updates (Cash, Bank)
- Transaction verification
- Balance tracking

## How It Works

### When a Sale or Order is Created:

1. **Sales/Order Details** are saved to database
2. **Sale Details** are created for each product
3. **Ledger Entries** are generated for accounting
4. **Customer Balance** is updated
5. **Console Report** is automatically generated and printed

### Console Report Contents:

The report includes:

```
📊 SALE CREATION REPORT - LEDGER & BALANCE TRACKING

📋 TRANSACTION DETAILS:
   Sale ID: [ID]
   Bill Type: [BILL/ORDER/QUOTATION]
   Timestamp: [Date & Time]

👤 CUSTOMER INFORMATION:
   Customer ID: [ID]
   Customer Name: [Name]

💰 AMOUNT BREAKDOWN:
   Gross Total: PKR [Amount]
   Discount: PKR [Amount]
   Shipping: PKR [Amount]
   Net Total: PKR [Amount]

💵 PAYMENTS RECEIVED:
   Cash: PKR [Amount]
   Bank: PKR [Amount]
   Advance: PKR [Amount]
   Total Payment: PKR [Amount]
   Outstanding Balance: PKR [Amount]

📈 BALANCE UPDATE:
   Opening Balance: PKR [Amount]
   Amount Charged: PKR +[Amount]
   Amount Paid: PKR -[Amount]
   Closing Balance: PKR [Amount]
   Net Change: +/-[Amount] (⬆️/⬇️/➡️)

📚 LEDGER ENTRIES CREATED: (N entries)
   Entry 1: [Description]
      Opening: PKR [Amount]
      Dr: PKR [Amount] / Cr: PKR [Amount]
      Closing: PKR [Amount]
   ...

🏦 SPECIAL ACCOUNTS UPDATED:
   Cash Account: Cr: PKR [Amount]
   Bank Account: Cr: PKR [Amount]

✅ SUMMARY:
   Status: POSTED TO LEDGER / NOT POSTED (QUOTATION)
   Total Entries: [Count]
   Customer Balance Updated: YES/NO
```

## File Structure

### New Files Created:

1. **src/lib/ledger-reporter.js** - Main reporting module with functions:
   - `reportSaleCreation()` - Reports sale creation
   - `reportOrderCreation()` - Reports order creation
   - `reportLedgerCheck()` - Shows account balances
   - `reportTransactionVerification()` - Validates ledger integrity

### Modified Files:

1. **src/app/api/sales/route.js** - Added:
   - Import of `reportSaleCreation` function
   - Reporting code after transaction completes
   - Fetches updated customer balance
   - Fetches all ledger entries for the sale
   - Calls report function with transaction details

## Key Features

### ✅ Automatic Triggering
- Reports are generated **automatically** when:
  - A new **SALE** is created
  - A new **ORDER** is created
  - Bill type is NOT 'QUOTATION' (quotations skip ledger entries)

### ✅ Comprehensive Tracking
- **Opening and Closing Balances** for all accounts
- **Debit/Credit Amounts** for each ledger entry
- **Payment Breakdown** (cash, bank, advance)
- **Outstanding Balance** calculation
- **Special Accounts** (Cash, Bank) updates

### ✅ Real-Time Console Output
- Reports appear in **Node.js console/terminal**
- Shows in **VS Code Debug Console** during development
- Shows in **Server logs** during production
- Formatted with emojis and ASCII art for easy reading

### ✅ Balance Verification
- Shows previous customer balance
- Shows all amounts added/deducted
- Shows new closing balance
- Indicates if balance increased/decreased

## How to Use

### 1. View Reports in Development:
```bash
# When you run your Next.js server:
npm run dev

# Or with Node:
node run-server.js

# Check the terminal where server is running for the reports
```

### 2. View Reports in Production:
```bash
# Check your server logs:
tail -f /var/log/app.log

# Or check PM2 logs if using PM2:
pm2 logs

# Or Docker logs if containerized:
docker logs [container-name]
```

### 3. Monitor in Real-Time:
- Open browser DevTools → Console tab
- Make a sale or order
- Check your Node.js terminal/console for the report

## Report Examples

### Example 1: Sale Creation
```
═══════════════════════════════════════════════════════════════════════════
📊 SALE CREATION REPORT - LEDGER & BALANCE TRACKING
═══════════════════════════════════════════════════════════════════════════

📋 TRANSACTION DETAILS:
   SALE ID: 1001
   Bill Type: BILL
   Timestamp: 2/2/2026, 2:30:45 PM

👤 CUSTOMER INFORMATION:
   Customer ID: 5
   Customer Name: ABC Construction Company

💰 AMOUNT BREAKDOWN:
   Gross Total: PKR 80000.00
   Discount: PKR 5000.00
   Shipping: PKR 3000.00
   Net Total: PKR 78000.00

💵 PAYMENTS RECEIVED:
   Cash: PKR 15000.00
   Bank: PKR 10000.00
   Advance: PKR 0.00
   Total Payment: PKR 25000.00
   Outstanding Balance: PKR 53000.00

📈 BALANCE UPDATE:
   Opening Balance: PKR 50000.00
   Amount Charged: PKR +78000.00
   Amount Paid: PKR -25000.00
   Closing Balance: PKR 103000.00
   Net Change: +53000.00 (⬆️ INCREASED)

📚 LEDGER ENTRIES CREATED: (4 entries)
   ┌─────────────────────────────────────────────────────────────┐
   │ Entry 1: Sale Bill - BILL - Customer Account (Debit)
   │   Opening: PKR 50000.00
   │   Dr: PKR 78000.00
   │   Closing: PKR 128000.00
   │ Entry 2: Payment Received - BILL - Customer Account (Credit)
   │   Opening: PKR 128000.00
   │   Cr: PKR 25000.00
   │   Closing: PKR 103000.00
   │ Entry 3: Payment Received - BILL - CASH Account (Debit)
   │   Opening: PKR 10000.00
   │   Dr: PKR 15000.00
   │   Closing: PKR 25000.00
   │ Entry 4: Payment Received - BILL - BANK Account (Debit)
   │   Opening: PKR 5000.00
   │   Dr: PKR 10000.00
   │   Closing: PKR 15000.00
   └─────────────────────────────────────────────────────────────┘

🏦 SPECIAL ACCOUNTS UPDATED:
   Cash Account:
      Name: Cash Account
      Credit: PKR 15000.00
   Bank Account:
      Name: Bank Account
      Credit: PKR 10000.00

✅ SUMMARY:
   Status: POSTED TO LEDGER
   Total Entries: 4
   Customer Balance Updated: YES
═══════════════════════════════════════════════════════════════════════════
```

## Testing

### Test the Feature:

1. **Run the test script:**
   ```bash
   # This will show sample reports without hitting the database
   node test-ledger-reporter.js
   ```

2. **Create a test sale in the UI:**
   - Go to Dashboard → Orders/Sales
   - Create a new sale with some products
   - Check the Node.js terminal for the report

3. **Verify ledger entries:**
   - Go to Dashboard → Finance → Ledger
   - Search for the bill number from the report
   - Verify that all entries match the report

## Configuration

No configuration is required! The feature works automatically.

### Optional: Disable Reports (if needed)

To disable console reports, comment out this section in `src/app/api/sales/route.js`:

```javascript
// Comment out the entire reportSaleCreation() call if you want to disable
/*
reportSaleCreation({
  transactionType: 'SALE',
  // ... rest of config
});
*/
```

## Troubleshooting

### Reports Not Showing?

1. **Check server is running:**
   ```bash
   npm run dev
   ```

2. **Check console output:**
   - Look at the terminal where you started `npm run dev`
   - NOT the browser console, but the SERVER console

3. **Check log file (if using file logging):**
   ```bash
   tail -f /path/to/logs.txt
   ```

### Reports Look Corrupted (Special Characters)?

- This is usually fine - emojis should display correctly
- If you see `?` instead of emojis, it's a terminal encoding issue
- Try: `export LANG=en_US.UTF-8` (on Linux/Mac)

### Wrong Numbers in Report?

- Verify the sale was created successfully in the database
- Check that all calculations are correct in the ledger entries
- Use the transaction verification to balance debits and credits

## Best Practices

1. **Monitor Reports Daily:**
   - Check the console reports for any unusual transactions
   - Watch for balance changes that don't make sense

2. **Use for Auditing:**
   - Save/archive the console output regularly
   - Cross-check with your accounting records
   - Identify discrepancies early

3. **Debug Transactions:**
   - Use the detailed report to understand balance changes
   - See exactly what ledger entries were created
   - Verify split payments and special accounts

## Support

For issues or questions about the ledger reporting feature:
1. Check the console output format
2. Verify the transaction in the database
3. Check the ledger table for entries
4. Cross-reference with the report details

## Summary

✨ **Your ledger is now automatically tracked and reported!**

Every sale and order creates a detailed console report showing:
- What happened
- Why the balance changed
- Which accounts were affected
- Verification of accounting integrity

This helps you stay on top of your finances in real-time! 🎉
