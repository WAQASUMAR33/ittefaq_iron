/**
 * DEBUG: Check if customer balance tracking is being maintained across sales
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function test() {
  try {
    // Get customer data for zain (ID: 21)
    const customerRes = await axios.get(`${API_BASE_URL}/customers?id=21`);
    const customer = customerRes.data;
    
    console.log(`\nCustomer: ${customer.cus_name} (ID: ${customer.cus_id})`);
    console.log(`Current Balance: ${customer.cus_balance}`);
    
    // Get all ledger entries
    const ledgerRes = await axios.get(`${API_BASE_URL}/ledger`);
    const allEntries = ledgerRes.data.filter(e => e.cus_id === 21);
    
    // Group by bill to see the pattern
    const byBill = {};
    allEntries.forEach(e => {
      const bill = e.bill_no;
      if (!byBill[bill]) byBill[bill] = [];
      byBill[bill].push(e);
    });
    
    console.log(`\n📊 LEDGER ANALYSIS BY BILL:`);
    console.log(`Total bills: ${Object.keys(byBill).length}`);
    
    // Sort bills numerically
    const sortedBills = Object.keys(byBill).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedBills.forEach(bill => {
      const entries = byBill[bill];
      const firstEntry = entries[entries.length - 1]; // Last in array is oldest (desc order)
      const lastEntry = entries[0]; // First in array is newest
      
      console.log(`\n  Bill #${bill}:`);
      console.log(`    Entries: ${entries.length}`);
      console.log(`    First Entry Opening: ${firstEntry.opening_balance}`);
      console.log(`    Last Entry Closing: ${lastEntry.closing_balance}`);
    });
    
    // Show the actual ledger sequence
    console.log(`\n📈 COMPLETE LEDGER SEQUENCE (Chronological):`);
    const chronological = [...allEntries].reverse();
    
    chronological.forEach((e, idx) => {
      console.log(`  ${idx + 1}. Bill ${e.bill_no}: O=${parseFloat(e.opening_balance).toFixed(0)} D=${parseFloat(e.debit_amount).toFixed(0)} C=${parseFloat(e.credit_amount).toFixed(0)} = ${parseFloat(e.closing_balance).toFixed(0)}`);
    });
    
    console.log(`\n❓ ISSUE: Do all bills use continuous running balance?`);
    let isOK = true;
    for (let i = 1; i < chronological.length; i++) {
      const prev = chronological[i - 1];
      const curr = chronological[i];
      
      if (Math.abs(parseFloat(prev.closing_balance) - parseFloat(curr.opening_balance)) > 0.01) {
        console.log(`  ❌ Gap between Bill ${prev.bill_no} and Bill ${curr.bill_no}: Prev closing ${prev.closing_balance} ≠ Curr opening ${curr.opening_balance}`);
        isOK = false;
      }
    }
    
    if (isOK) {
      console.log(`  ✅ All bills maintain continuous running balance`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
