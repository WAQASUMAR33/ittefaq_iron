# 🎯 Quick Reference: Ledger Reporting Feature

## What Does It Do?

✅ **Automatically reports ledger values and balances every time you create a sale or order**

## Where Do I See the Reports?

📍 **In the Terminal/Console where your server is running**

```
When you run:  npm run dev
Reports appear in: The terminal output (NOT in browser console)
```

## What Information Does Each Report Show?

| Item | Description |
|------|-------------|
| 📊 **Sale/Order ID** | The bill number |
| 👤 **Customer Name** | Who bought |
| 💰 **Amounts** | Total, discount, shipping, net |
| 💵 **Payments** | Cash, bank, advance payments |
| 📈 **Balance Change** | Old balance → New balance |
| 📚 **Ledger Entries** | All accounting entries created |
| 🏦 **Special Accounts** | Cash & Bank updates |

## How to Check the Reports

### During Development:
```bash
# Terminal 1 - Start your server:
npm run dev

# Terminal 2 - Create a sale via the UI
# Then look back at Terminal 1 for the report
```

### During Production:
```bash
# Check your server logs:
pm2 logs
# OR
tail -f /var/log/app.log
# OR
docker logs [container-name]
```

## Example Report Summary

```
═══════════════════════════════════════════════════════════════════════════
📊 SALE CREATION REPORT - LEDGER & BALANCE TRACKING
═══════════════════════════════════════════════════════════════════════════

Sale ID: 1001
Bill Type: BILL

Customer: ABC Construction Company
Opening Balance: PKR 50,000
New Balance: PKR 103,000
Change: +53,000 ⬆️

Amount Details:
  Gross Total: PKR 80,000
  Discount: PKR 5,000
  Net Total: PKR 78,000
  
Payment Received: PKR 25,000
  - Cash: PKR 15,000
  - Bank: PKR 10,000
  
Outstanding Balance: PKR 53,000

Ledger Entries Created: 4 entries
  ✓ Customer Account Debit
  ✓ Customer Account Credit
  ✓ Cash Account Debit
  ✓ Bank Account Debit

Status: ✅ POSTED TO LEDGER
═══════════════════════════════════════════════════════════════════════════
```

## What to Look For

### ✅ Good Signs:
- Balance increases when you add charges
- Balance decreases when customer pays
- Ledger entries match the amounts
- Debits = Credits (balanced accounting)

### ⚠️ Warning Signs:
- Balance changes are unexpected
- Negative stock warnings
- Missing ledger entries
- Unbalanced debits and credits

## Files Involved

| File | Purpose |
|------|---------|
| `src/lib/ledger-reporter.js` | Report generation (do not edit) |
| `src/app/api/sales/route.js` | Sales API - calls reporter (modified) |
| `LEDGER_REPORTING_GUIDE.md` | Detailed documentation |
| `test-ledger-reporter.js` | Test the reporting |

## Common Questions

**Q: Where should I see the report?**
A: In your terminal where `npm run dev` is running, NOT in browser console

**Q: Can I disable the reports?**
A: Yes, comment out the `reportSaleCreation()` call in `src/app/api/sales/route.js`

**Q: Do quotations get reported?**
A: No, only BILL and ORDER types are reported (quotations skip ledger)

**Q: What if numbers don't match?**
A: Check the database directly and compare with the report details

**Q: How often are reports generated?**
A: Every single time a sale or order is created - automatically!

## Testing

```bash
# To see sample reports without creating real data:
node test-ledger-reporter.js
```

## Key Metrics to Monitor

| Metric | What It Means |
|--------|---------------|
| Opening Balance | Customer's balance before this sale |
| Closing Balance | Customer's balance after this sale |
| Outstanding Balance | How much customer still owes |
| Total Debits | Total amount charged to accounts |
| Total Credits | Total amount received/paid |

## Pro Tips

1. **Save reports for audit trail:**
   ```bash
   # Redirect terminal output to file
   npm run dev > app.log 2>&1
   ```

2. **Monitor specific customer:**
   - Create sales for that customer
   - Check the reports for accuracy

3. **Daily reconciliation:**
   - Review reports from yesterday
   - Match with your accounting records
   - Flag any discrepancies

4. **Track cash flow:**
   - Cash Account balance shows total cash
   - Bank Account balance shows total in bank
   - Both updated in real-time via reports

## Symbols Used in Reports

| Symbol | Meaning |
|--------|---------|
| 📊 | Sale/Transaction Report |
| 💰 | Money/Amount |
| 💵 | Cash Payment |
| 🏦 | Bank Account |
| 📈 | Balance Increase |
| ⬆️ | Going Up |
| ⬇️ | Going Down |
| ➡️ | No Change |
| 📚 | Ledger Entries |
| ✅ | Success/Posted |
| ⚠️ | Warning |
| ❌ | Error/Issue |

---

**Remember:** Every sale and order automatically creates a detailed ledger report in your console! 🎉

For detailed information, see: `LEDGER_REPORTING_GUIDE.md`
