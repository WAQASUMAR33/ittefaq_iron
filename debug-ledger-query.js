/**
 * DETAILED LEDGER QUERY FOR DEBUGGING
 * Queries the actual database to see what ledger entries are stored
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const CUSTOMER_ID = 21; // zain

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function queryDatabase() {
  try {
    console.log(`${colors.cyan}${colors.bright}Fetching all ledger entries for customer ${CUSTOMER_ID}...${colors.reset}\n`);
    
    const response = await axios.get(`${API_BASE_URL}/ledger`);
    const customerLedger = response.data.filter(entry => entry.cus_id === CUSTOMER_ID);
    
    console.log(`${colors.bright}Total entries: ${customerLedger.length}${colors.reset}\n`);
    
    // Group by bill number
    const byBill = {};
    customerLedger.forEach(entry => {
      const bill = entry.bill_no || 'N/A';
      if (!byBill[bill]) byBill[bill] = [];
      byBill[bill].push(entry);
    });
    
    // Display all entries
    console.log(`${colors.cyan}${colors.bright}ALL LEDGER ENTRIES (Sorted by Date, then Bill):${colors.reset}\n`);
    console.log(`┌─────┬──────────────┬─────────────┬──────────┬──────────┬─────────────┬─────────────┬──────────────┐`);
    console.log(`│ No. │ Bill │ Date       │ Opening   │ Debit    │ Credit   │ Closing     │ Details│`);
    console.log(`├─────┼──────────────┼─────────────┼──────────┼──────────┼─────────────┼─────────────┼──────────────┤`);
    
    let counter = 1;
    customerLedger.forEach((entry, idx) => {
      const date = new Date(entry.created_at).toLocaleDateString();
      const opening = parseFloat(entry.opening_balance).toFixed(2);
      const debit = parseFloat(entry.debit_amount).toFixed(2);
      const credit = parseFloat(entry.credit_amount).toFixed(2);
      const closing = parseFloat(entry.closing_balance).toFixed(2);
      const details = (entry.details || '').substring(0, 20);
      
      // Verify calculation
      const calculated = parseFloat(opening) + parseFloat(debit) - parseFloat(credit);
      const isValid = Math.abs(calculated - parseFloat(closing)) < 0.01;
      const validity = isValid ? '✓' : `✗ (should be ${calculated.toFixed(2)})`;
      
      console.log(`│ ${counter.toString().padEnd(3)} │ ${(entry.bill_no || 'N/A').toString().padEnd(5)} │ ${date.padEnd(11)} │ ${opening.padEnd(8)} │ ${debit.padEnd(8)} │ ${credit.padEnd(8)} │ ${closing.padEnd(11)} │ ${validity.padEnd(12)} │`);
      counter++;
    });
    console.log(`└─────┴──────────────┴─────────────┴──────────┴──────────┴─────────────┴─────────────┴──────────────┘\n`);
    
    // Get last entry
    const lastEntry = customerLedger[customerLedger.length - 1];
    if (lastEntry) {
      console.log(`${colors.yellow}${colors.bright}LAST LEDGER ENTRY:${colors.reset}`);
      console.log(`  Bill: ${lastEntry.bill_no}`);
      console.log(`  Date: ${new Date(lastEntry.created_at).toLocaleString()}`);
      console.log(`  Opening: ${parseFloat(lastEntry.opening_balance).toFixed(2)}`);
      console.log(`  Debit: ${parseFloat(lastEntry.debit_amount).toFixed(2)}`);
      console.log(`  Credit: ${parseFloat(lastEntry.credit_amount).toFixed(2)}`);
      console.log(`  ${colors.red}Closing: ${parseFloat(lastEntry.closing_balance).toFixed(2)}${colors.reset}\n`);
    }
    
    // Get customer data
    const customerResponse = await axios.get(`${API_BASE_URL}/customers?id=${CUSTOMER_ID}`);
    const customer = customerResponse.data;
    
    console.log(`${colors.yellow}${colors.bright}CUSTOMER TABLE DATA:${colors.reset}`);
    console.log(`  Name: ${customer.cus_name}`);
    console.log(`  Balance: ${colors.green}${parseFloat(customer.cus_balance).toFixed(2)}${colors.reset}\n`);
    
    // Compare
    console.log(`${colors.bright}COMPARISON:${colors.reset}`);
    const lastClosing = parseFloat(lastEntry.closing_balance);
    const customerBalance = parseFloat(customer.cus_balance);
    const match = Math.abs(lastClosing - customerBalance) < 0.01;
    
    console.log(`  Last Ledger Closing: ${lastClosing.toFixed(2)}`);
    console.log(`  Customer Balance:    ${customerBalance.toFixed(2)}`);
    console.log(`  Match: ${match ? colors.green + 'YES ✓' + colors.reset : colors.red + 'NO ✗' + colors.reset}\n`);
    
    if (!match) {
      console.log(`${colors.red}${colors.bright}DISCREPANCY DETECTED:${colors.reset}`);
      console.log(`  Difference: ${Math.abs(lastClosing - customerBalance).toFixed(2)}`);
      console.log(`  The last ledger closing (${lastClosing.toFixed(2)}) doesn't match customer balance (${customerBalance.toFixed(2)})\n`);
    }
    
  } catch (error) {
    console.error(colors.red + 'Error:', error.message + colors.reset);
    process.exit(1);
  }
}

queryDatabase();
