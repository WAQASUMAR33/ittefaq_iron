const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- Directly Invoking POST handler ---');
  try {
    const { POST } = await import('../src/app/api/purchases/route.js');

    const supplier = await prisma.customer.findFirst({
      where: { customer_category: { cus_cat_title: 'Supplier' } }
    });
    const product = await prisma.product.findFirst();
    const store = await prisma.store.findFirst();

    const body = {
      cus_id: supplier.cus_id,
      store_id: store.storeid,
      total_amount: 10000,
      payment: 3000,
      payment_type: 'CASH',
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

    const req = {
      url: 'http://localhost:3000/api/purchases',
      json: () => Promise.resolve(body)
    };

    const res = await POST(req);
    console.log('Response Status:', res.status);
    const data = await res.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('❌ Execution Error Stack:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
