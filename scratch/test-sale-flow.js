const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🚀 Running end-to-end Sales Recalculation Flow Test...');

  try {
    // 1. Get reference entities
    const customer = await prisma.customer.findFirst({
      where: { customer_category: { cus_cat_title: 'Customer' } }
    });
    const product = await prisma.product.findFirst();
    const store = await prisma.store.findFirst();
    const bank = await prisma.customer.findFirst({
      where: { customer_category: { cus_cat_title: 'Bank Account' } }
    });

    if (!customer || !product || !store || !bank) {
      console.error('❌ Missing required test data (Customer, Product, Store, or Bank Account).');
      return;
    }

    console.log(`Using Customer: ${customer.cus_name} (ID: ${customer.cus_id})`);
    console.log(`Using Product: ${product.pro_title} (ID: ${product.pro_id})`);
    console.log(`Using Store: ${product.pro_title} (ID: ${store.storeid})`);
    console.log(`Using Bank: ${bank.cus_name} (ID: ${bank.cus_id})`);

    // Helper to print all ledger entries for customer, cash, bank
    async function printLedgers(title) {
      console.log(`\n--- ${title} ---`);
      const entries = await prisma.ledger.findMany({
        orderBy: [{ created_at: 'asc' }, { l_id: 'asc' }],
        include: { customer: { select: { cus_name: true } } }
      });
      console.table(entries.map(e => ({
        l_id: e.l_id,
        cus: e.customer?.cus_name,
        bill: e.bill_no,
        type: e.trnx_type,
        details: e.details.substring(0, 40),
        opening: parseFloat(e.opening_balance),
        debit: parseFloat(e.debit_amount),
        credit: parseFloat(e.credit_amount),
        closing: parseFloat(e.closing_balance),
        created_at: e.created_at.toISOString()
      })));

      const customerAcc = await prisma.customer.findUnique({ where: { cus_id: customer.cus_id } });
      const bankAcc = await prisma.customer.findUnique({ where: { cus_id: bank.cus_id } });
      const cashAcc = await prisma.customer.findFirst({ where: { customer_category: { cus_cat_title: 'Cash Account' } } });
      console.log(`Customer balance in DB: ${customerAcc.cus_balance}`);
      console.log(`Bank balance in DB: ${bankAcc.cus_balance}`);
      console.log(`Cash balance in DB: ${cashAcc.cus_balance}`);
    }

    const baseUrl = 'http://localhost:3001';

    // Step A: Create Sale 1 (sequential first entry)
    console.log('\n--- Step A: Creating Sale 1 ---');
    const s1Payload = {
      cus_id: customer.cus_id,
      store_id: store.storeid,
      total_amount: 10000,
      payment: 3000,
      payment_type: 'CASH', // Paid via cash
      cash_payment: 3000,
      bank_payment: 0,
      sale_details: [
        {
          pro_id: product.pro_id,
          qnty: 10,
          unit: 'pcs',
          unit_rate: 1000,
          total_amount: 10000,
          discount: 0
        }
      ]
    };

    const s1Res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s1Payload)
    });
    if (!s1Res.ok) throw new Error(`POST Sale 1 failed: ${s1Res.statusText} ${await s1Res.text()}`);
    const s1 = await s1Res.json();
    console.log(`Created Sale 1 ID: ${s1.sale_id}`);

    await printLedgers('Ledgers after Sale 1');

    // Sleep for 1.5 seconds to ensure different created_at timestamp
    console.log('Sleeping 1.5 seconds...');
    await new Promise(r => setTimeout(r, 1500));

    // Step B: Create Sale 2 (sequential second entry)
    console.log('\n--- Step B: Creating Sale 2 ---');
    const s2Payload = {
      cus_id: customer.cus_id,
      store_id: store.storeid,
      total_amount: 5000,
      payment: 1000,
      payment_type: 'BANK_TRANSFER', // Paid via bank
      cash_payment: 0,
      bank_payment: 1000,
      bank_title: bank.cus_name,
      sale_details: [
        {
          pro_id: product.pro_id,
          qnty: 5,
          unit: 'pcs',
          unit_rate: 1000,
          total_amount: 5000,
          discount: 0
        }
      ]
    };

    const s2Res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s2Payload)
    });
    if (!s2Res.ok) throw new Error(`POST Sale 2 failed: ${s2Res.statusText} ${await s2Res.text()}`);
    const s2 = await s2Res.json();
    console.log(`Created Sale 2 ID: ${s2.sale_id}`);

    await printLedgers('Ledgers after Sale 2');

    // Step C: Edit Sale 1 (Updates total amount and payment backdated relative to Sale 2)
    console.log('\n--- Step C: Editing Sale 1 ---');
    const s1EditPayload = {
      id: s1.sale_id,
      cus_id: customer.cus_id,
      store_id: store.storeid,
      total_amount: 15000, // Amount increases from 10000 to 15000
      payment: 5000,       // Payment increases from 3000 to 5000
      payment_type: 'CASH',
      cash_payment: 5000,
      bank_payment: 0,
      sale_details: [
        {
          pro_id: product.pro_id,
          qnty: 15,
          unit: 'pcs',
          unit_rate: 1000,
          total_amount: 15000,
          discount: 0
        }
      ]
    };

    const s1EditRes = await fetch(`${baseUrl}/api/sales`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s1EditPayload)
    });
    if (!s1EditRes.ok) throw new Error(`PUT Sale 1 failed: ${s1EditRes.statusText} ${await s1EditRes.text()}`);
    console.log('Sale 1 edited successfully.');

    await printLedgers('Ledgers after editing Sale 1');

    // Step D: Delete Sale 1
    console.log('\n--- Step D: Deleting Sale 1 ---');
    const s1DelRes = await fetch(`${baseUrl}/api/sales?id=${s1.sale_id}`, {
      method: 'DELETE'
    });
    if (!s1DelRes.ok) throw new Error(`DELETE Sale 1 failed: ${s1DelRes.statusText} ${await s1DelRes.text()}`);
    console.log('Sale 1 deleted successfully.');

    await printLedgers('Ledgers after deleting Sale 1');

    // Step E: Clean up Sale 2
    console.log('\n--- Step E: Cleaning up Sale 2 ---');
    const s2DelRes = await fetch(`${baseUrl}/api/sales?id=${s2.sale_id}`, {
      method: 'DELETE'
    });
    if (!s2DelRes.ok) throw new Error(`DELETE Sale 2 failed: ${s2DelRes.statusText} ${await s2DelRes.text()}`);
    console.log('Sale 2 deleted successfully.');

    await printLedgers('Final Ledgers (Empty)');

  } catch (err) {
    console.error('❌ Test Flow Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
