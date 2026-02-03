/**
 * ============================================================
 * COMPLETE ORDER TO SALE FLOW TEST
 * ============================================================
 * 
 * Test Scenario:
 * 1. Create an order for customer "zain" for 5000
 * 2. Pay 1000 cash + 2000 bank (3000 total)
 * 3. Check initial balance = 2000
 * 4. Convert order to sale
 * 5. Pay remaining 500 cash + 1500 bank (2000 total)
 * 6. Check final balance = 0
 * 7. Verify all ledger entries
 * ============================================================
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const CUSTOMER_ID = 21; // zain
const STORE_ID = 2; // Default store
const BANK_ACCOUNT_ID = 26; // Foji Bank
const UPDATED_BY = 1; // Default user

// Test values
const TEST_VALUES = {
  orderAmount: 5000,
  firstCashPayment: 1000,
  firstBankPayment: 2000,
  firstTotalPayment: 3000,
  secondCashPayment: 500,
  secondBankPayment: 1500,
  secondTotalPayment: 2000,
  expectedBalanceAfterOrder: 2000, // 5000 - 3000
  expectedBalanceAfterConversion: 0, // 2000 - 2000
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}═════ ${msg} ═════${colors.reset}\n`),
  value: (label, value) => console.log(`   ${label}: ${colors.bright}${value}${colors.reset}`),
};

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function assert(condition, message) {
  if (condition) {
    log.success(message);
    testResults.passed++;
  } else {
    log.error(message);
    testResults.failed++;
    testResults.errors.push(message);
  }
}

async function getCustomerBalance() {
  try {
    const response = await axios.get(`${API_BASE_URL}/customers?id=${CUSTOMER_ID}`);
    return parseFloat(response.data.cus_balance) || 0;
  } catch (error) {
    log.error(`Failed to fetch customer: ${error.message}`);
    return null;
  }
}

async function getLedgerEntries(customerId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/ledger`);
    return response.data.filter(entry => entry.cus_id === customerId);
  } catch (error) {
    log.error(`Failed to fetch ledger: ${error.message}`);
    return [];
  }
}

async function createOrder(orderData) {
  try {
    log.info(`Creating order...`);
    const response = await axios.post(`${API_BASE_URL}/sales`, orderData);
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data || error.message;
    log.error(`Failed to create order: ${JSON.stringify(errorMsg)}`);
    console.error('Full error response:', error.response?.data);
    return null;
  }
}

async function step1_CreateOrder() {
  log.section('STEP 1: CREATE ORDER');
  
  const orderData = {
    cus_id: CUSTOMER_ID,
    store_id: STORE_ID,
    total_amount: TEST_VALUES.orderAmount,
    discount: 0,
    payment: TEST_VALUES.firstTotalPayment,
    payment_type: 'CASH',
    cash_payment: TEST_VALUES.firstCashPayment,
    bank_payment: TEST_VALUES.firstBankPayment,
    bank_title: 'Foji Bank',
    debit_account_id: BANK_ACCOUNT_ID,
    credit_account_id: null,
    loader_id: null,
    shipping_amount: 0,
    bill_type: 'BILL',
    reference: 'Test Order - Initial Creation',
    is_loaded_order: false,
    sale_details: [
      {
        pro_id: 2, // crush dina
        vehicle_no: null,
        qnty: 50,
        unit: 'PCS',
        unit_rate: 100,
        total_amount: TEST_VALUES.orderAmount,
        discount: 0,
        cus_id: CUSTOMER_ID,
      },
    ],
    transport_details: [],
    split_payments: [
      {
        amount: TEST_VALUES.firstCashPayment,
        payment_type: 'CASH',
        debit_account_id: null,
        credit_account_id: null,
        reference: 'Cash payment',
      },
      {
        amount: TEST_VALUES.firstBankPayment,
        payment_type: 'BANK_TRANSFER',
        debit_account_id: BANK_ACCOUNT_ID,
        credit_account_id: null,
        reference: 'Bank payment',
      },
    ],
    updated_by: UPDATED_BY,
  };

  log.value('Order Amount', `PKR ${TEST_VALUES.orderAmount}`);
  log.value('Cash Payment', `PKR ${TEST_VALUES.firstCashPayment}`);
  log.value('Bank Payment', `PKR ${TEST_VALUES.firstBankPayment}`);
  log.value('Total Payment', `PKR ${TEST_VALUES.firstTotalPayment}`);
  log.value('Outstanding', `PKR ${TEST_VALUES.expectedBalanceAfterOrder}`);

  const order = await createOrder(orderData);
  if (!order) {
    await assert(false, 'Order creation failed');
    return null;
  }

  log.success(`Order created with ID: ${order.sale_id}`);
  
  // Wait for ledger to be created
  await sleep(500);

  // Check customer balance
  const balance = await getCustomerBalance();
  log.value('Customer Balance After Order', `PKR ${balance}`);
  await assert(
    balance === TEST_VALUES.expectedBalanceAfterOrder,
    `Balance after order should be PKR ${TEST_VALUES.expectedBalanceAfterOrder}, got PKR ${balance}`
  );

  return order;
}

async function step2_ConvertToSaleAndPayRemaining(orderId) {
  log.section('STEP 2: CONVERT ORDER TO SALE & PAY REMAINING');

  const saleData = {
    cus_id: CUSTOMER_ID,
    store_id: STORE_ID,
    total_amount: TEST_VALUES.orderAmount,
    discount: 0,
    payment: TEST_VALUES.secondTotalPayment,
    payment_type: 'CASH',
    cash_payment: TEST_VALUES.secondCashPayment,
    bank_payment: TEST_VALUES.secondBankPayment,
    bank_title: 'Foji Bank',
    debit_account_id: BANK_ACCOUNT_ID,
    credit_account_id: null,
    loader_id: null,
    shipping_amount: 0,
    bill_type: 'BILL',
    reference: `Converted from Order #${orderId}. Final Payment`,
    is_loaded_order: true, // This is the key flag!
    sale_details: [
      {
        pro_id: 2,
        vehicle_no: null,
        qnty: 50,
        unit: 'PCS',
        unit_rate: 100,
        total_amount: TEST_VALUES.orderAmount,
        discount: 0,
        cus_id: CUSTOMER_ID,
      },
    ],
    transport_details: [],
    split_payments: [
      {
        amount: TEST_VALUES.secondCashPayment,
        payment_type: 'CASH',
        debit_account_id: null,
        credit_account_id: null,
        reference: 'Cash payment',
      },
      {
        amount: TEST_VALUES.secondBankPayment,
        payment_type: 'BANK_TRANSFER',
        debit_account_id: BANK_ACCOUNT_ID,
        credit_account_id: null,
        reference: 'Bank payment',
      },
    ],
    updated_by: UPDATED_BY,
  };

  log.value('Cash Payment (Final)', `PKR ${TEST_VALUES.secondCashPayment}`);
  log.value('Bank Payment (Final)', `PKR ${TEST_VALUES.secondBankPayment}`);
  log.value('Total Final Payment', `PKR ${TEST_VALUES.secondTotalPayment}`);
  log.value('Expected Final Balance', `PKR ${TEST_VALUES.expectedBalanceAfterConversion}`);

  const sale = await createOrder(saleData);
  if (!sale) {
    await assert(false, 'Sale conversion failed');
    return null;
  }

  log.success(`Order converted to Sale with ID: ${sale.sale_id}`);

  // Wait for ledger to be created
  await sleep(500);

  // Check customer balance
  const balance = await getCustomerBalance();
  log.value('Customer Balance After Conversion', `PKR ${balance}`);
  await assert(
    balance === TEST_VALUES.expectedBalanceAfterConversion,
    `Balance after conversion should be PKR ${TEST_VALUES.expectedBalanceAfterConversion}, got PKR ${balance}`
  );

  return sale;
}

async function step3_VerifyLedgerEntries() {
  log.section('STEP 3: VERIFY LEDGER ENTRIES');

  const ledgerEntries = await getLedgerEntries(CUSTOMER_ID);
  
  if (!ledgerEntries || ledgerEntries.length === 0) {
    await assert(false, 'No ledger entries found for customer');
    return;
  }

  log.info(`Found ${ledgerEntries.length} ledger entries for customer ID ${CUSTOMER_ID}`);
  
  // Get the last 2 entries (order and sale)
  const sortedEntries = ledgerEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const lastSaleEntry = sortedEntries[0];
  const orderEntry = sortedEntries[1];

  log.info('\n--- Order Ledger Entry ---');
  if (orderEntry) {
    log.value('Opening Balance', `PKR ${orderEntry.opening_balance}`);
    log.value('Debit Amount', `PKR ${orderEntry.debit_amount}`);
    log.value('Credit Amount', `PKR ${orderEntry.credit_amount}`);
    log.value('Closing Balance', `PKR ${orderEntry.closing_balance}`);
    log.value('Type', orderEntry.trnx_type);
    log.value('Details', orderEntry.details);

    await assert(
      parseFloat(orderEntry.closing_balance) === TEST_VALUES.expectedBalanceAfterOrder,
      `Order closing balance should be PKR ${TEST_VALUES.expectedBalanceAfterOrder}, got PKR ${orderEntry.closing_balance}`
    );
  }

  log.info('\n--- Sale Ledger Entry ---');
  if (lastSaleEntry) {
    log.value('Opening Balance', `PKR ${lastSaleEntry.opening_balance}`);
    log.value('Debit Amount', `PKR ${lastSaleEntry.debit_amount}`);
    log.value('Credit Amount', `PKR ${lastSaleEntry.credit_amount}`);
    log.value('Closing Balance', `PKR ${lastSaleEntry.closing_balance}`);
    log.value('Type', lastSaleEntry.trnx_type);
    log.value('Details', lastSaleEntry.details);

    await assert(
      parseFloat(lastSaleEntry.closing_balance) === TEST_VALUES.expectedBalanceAfterConversion,
      `Sale closing balance should be PKR ${TEST_VALUES.expectedBalanceAfterConversion}, got PKR ${lastSaleEntry.closing_balance}`
    );
  }

  // Print all entries for reference
  log.info('\n--- All Recent Ledger Entries for Customer ---');
  sortedEntries.slice(0, 5).forEach((entry, index) => {
    console.log(
      `   ${index + 1}. ${entry.details} | Opening: PKR ${entry.opening_balance} | ` +
      `Debit: PKR ${entry.debit_amount} | Credit: PKR ${entry.credit_amount} | ` +
      `Closing: PKR ${entry.closing_balance}`
    );
  });
}

async function step4_FinalVerification() {
  log.section('STEP 4: FINAL VERIFICATION');

  const finalBalance = await getCustomerBalance();
  log.value('Final Customer Balance', `PKR ${finalBalance}`);

  await assert(
    finalBalance === TEST_VALUES.expectedBalanceAfterConversion,
    `Final balance should be PKR ${TEST_VALUES.expectedBalanceAfterConversion}, got PKR ${finalBalance}`
  );

  log.info('\n✨ All payments collected! Customer account cleared.');
}

async function printTestSummary() {
  log.section('TEST SUMMARY');
  
  console.log(`
${colors.bright}Test Results:${colors.reset}
  ${colors.green}Passed: ${testResults.passed}${colors.reset}
  ${colors.red}Failed: ${testResults.failed}${colors.reset}
  Total:  ${testResults.passed + testResults.failed}

${colors.bright}Expected Flow:${colors.reset}
  1. Initial Balance: PKR 0
  2. Order Created (PKR 5000) → Balance: PKR 2000 (paid PKR 3000)
  3. Order Converted (pay remaining PKR 2000) → Balance: PKR 0
  4. All ledger entries created with correct calculations

${colors.bright}Test Values Used:${colors.reset}
  - Order Amount: PKR ${TEST_VALUES.orderAmount}
  - First Payment: PKR ${TEST_VALUES.firstTotalPayment} (Cash: PKR ${TEST_VALUES.firstCashPayment} + Bank: PKR ${TEST_VALUES.firstBankPayment})
  - Second Payment: PKR ${TEST_VALUES.secondTotalPayment} (Cash: PKR ${TEST_VALUES.secondCashPayment} + Bank: PKR ${TEST_VALUES.secondBankPayment})
  - Customer: zain (ID: ${CUSTOMER_ID})
  - Store: Store 2
  - Bank: Foji Bank (ID: ${BANK_ACCOUNT_ID})
  `);

  if (testResults.failed === 0) {
    log.success('\n🎉 All tests passed! Order to Sale flow is working correctly.\n');
  } else {
    log.error(`\n${testResults.failed} test(s) failed. Please review the errors above.\n`);
    testResults.errors.forEach(error => console.log(`  - ${error}`));
  }
}

async function runTests() {
  console.log(`
${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║   ORDER TO SALE FLOW - COMPREHENSIVE TEST                  ║
║   Testing ledger entries and customer balance updates      ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}
  `);

  try {
    // Step 1: Create Order
    const order = await step1_CreateOrder();
    if (!order) {
      log.error('Test stopped: Order creation failed');
      return;
    }

    await sleep(1000);

    // Step 2: Convert to Sale
    const sale = await step2_ConvertToSaleAndPayRemaining(order.sale_id);
    if (!sale) {
      log.error('Test stopped: Sale conversion failed');
      return;
    }

    await sleep(1000);

    // Step 3: Verify Ledger
    await step3_VerifyLedgerEntries();

    await sleep(500);

    // Step 4: Final Check
    await step4_FinalVerification();

  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
  }

  // Print Summary
  await printTestSummary();
}

// Run the tests
runTests().catch(console.error);
