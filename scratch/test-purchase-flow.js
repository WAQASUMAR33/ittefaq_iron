const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🚀 Running end-to-end Purchase Recalculation Flow Test...');

  try {
    // 1. Get reference entities
    const supplier = await prisma.customer.findFirst({
      where: { customer_category: { cus_cat_title: 'Supplier' } }
    });
    const product = await prisma.product.findFirst();
    const store = await prisma.store.findFirst();
    const bank = await prisma.customer.findFirst({
      where: { customer_category: { cus_cat_title: 'Bank Account' } }
    });

    if (!supplier || !product || !store || !bank) {
      console.error('❌ Missing required test data (Supplier, Product, Store, or Bank Account).');
      return;
    }

    console.log(`Using Supplier: ${supplier.cus_name} (ID: ${supplier.cus_id})`);
    console.log(`Using Product: ${product.pro_title} (ID: ${product.pro_id})`);
    console.log(`Using Store: ${store.store_name} (ID: ${store.storeid})`);
    console.log(`Using Bank: ${bank.cus_name} (ID: ${bank.cus_id})`);

    // Helper to print all ledger entries for supplier, cash, bank
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

      const supplierAcc = await prisma.customer.findUnique({ where: { cus_id: supplier.cus_id } });
      const bankAcc = await prisma.customer.findUnique({ where: { cus_id: bank.cus_id } });
      const cashAcc = await prisma.customer.findFirst({ where: { customer_category: { cus_cat_title: 'Cash Account' } } });
      console.log(`Supplier balance in DB: ${supplierAcc.cus_balance}`);
      console.log(`Bank balance in DB: ${bankAcc.cus_balance}`);
      console.log(`Cash balance in DB: ${cashAcc.cus_balance}`);
    }

    // Probing base URL
    const baseUrl = 'http://localhost:3001';

    // Step A: Create Purchase 1 (sequential first entry)
    console.log('\n--- Step A: Creating Purchase 1 ---');
    const p1Payload = {
      cus_id: supplier.cus_id,
      store_id: store.storeid,
      total_amount: 10000,
      payment: 3000,
      payment_type: 'CASH', // Paid via cash
      cash_payment: 3000,
      bank_payment: 0,
      purchase_details: [
        {
          pro_id: product.pro_id,
          qnty: 10,
          unit: 'pcs',
          unit_rate: 1000,
          total_amount: 10000
        }
      ]
    };

    const p1Res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p1Payload)
    });
    if (!p1Res.ok) throw new Error(`POST Purchase 1 failed: ${p1Res.statusText} ${await p1Res.text()}`);
    const p1 = await p1Res.json();
    console.log(`Created Purchase 1 ID: ${p1.pur_id}`);

    await printLedgers('Ledgers after Purchase 1');

    // Sleep for 1.5 seconds to ensure different created_at timestamp
    console.log('Sleeping 1.5 seconds...');
    await new Promise(r => setTimeout(r, 1500));

    // Step B: Create Purchase 2 (sequential second entry)
    console.log('\n--- Step B: Creating Purchase 2 ---');
    const p2Payload = {
      cus_id: supplier.cus_id,
      store_id: store.storeid,
      total_amount: 5000,
      payment: 1000,
      payment_type: 'BANK_TRANSFER', // Paid via bank
      cash_payment: 0,
      bank_payment: 1000,
      bank_account_id: bank.cus_id,
      purchase_details: [
        {
          pro_id: product.pro_id,
          qnty: 5,
          unit: 'pcs',
          unit_rate: 1000,
          total_amount: 5000
        }
      ]
    };

    const p2Res = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p2Payload)
    });
    if (!p2Res.ok) throw new Error(`POST Purchase 2 failed: ${p2Res.statusText} ${await p2Res.text()}`);
    const p2 = await p2Res.json();
    console.log(`Created Purchase 2 ID: ${p2.pur_id}`);

    await printLedgers('Ledgers after Purchase 2');

    // Step C: Edit Purchase 1 (Updates total amount and payment backdated relative to Purchase 2)
    console.log('\n--- Step C: Editing Purchase 1 ---');
    const p1EditPayload = {
      id: p1.pur_id,
      cus_id: supplier.cus_id,
      store_id: store.storeid,
      total_amount: 15000, // Amount increases from 10000 to 15000
      payment: 5000,       // Payment increases from 3000 to 5000
      payment_type: 'CASH',
      cash_payment: 5000,
      bank_payment: 0,
      purchase_details: [
        {
          pro_id: product.pro_id,
          qnty: 15,
          unit: 'pcs',
          unit_rate: 1000,
          total_amount: 15000
        }
      ]
    };

    const p1EditRes = await fetch(`${baseUrl}/api/purchases`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p1EditPayload)
    });
    if (!p1EditRes.ok) throw new Error(`PUT Purchase 1 failed: ${p1EditRes.statusText} ${await p1EditRes.text()}`);
    console.log('Purchase 1 edited successfully.');

    await printLedgers('Ledgers after editing Purchase 1');

    // Step D: Delete Purchase 1
    console.log('\n--- Step D: Deleting Purchase 1 ---');
    const p1DelRes = await fetch(`${baseUrl}/api/purchases?id=${p1.pur_id}`, {
      method: 'DELETE'
    });
    if (!p1DelRes.ok) throw new Error(`DELETE Purchase 1 failed: ${p1DelRes.statusText} ${await p1DelRes.text()}`);
    console.log('Purchase 1 deleted successfully.');

    await printLedgers('Ledgers after deleting Purchase 1');

    // Step E: Clean up Purchase 2
    console.log('\n--- Step E: Cleaning up Purchase 2 ---');
    const p2DelRes = await fetch(`${baseUrl}/api/purchases?id=${p2.pur_id}`, {
      method: 'DELETE'
    });
    if (!p2DelRes.ok) throw new Error(`DELETE Purchase 2 failed: ${p2DelRes.statusText} ${await p2DelRes.text()}`);
    console.log('Purchase 2 deleted successfully.');

    await printLedgers('Final Ledgers (Empty)');

  } catch (err) {
    console.error('❌ Test Flow Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
