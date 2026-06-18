const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const purId = 100;
  try {
    console.log(`\n=== 1. Original Balances for Purchase ${purId} ===`);
    const initialSupp = await prisma.customer.findUnique({
      where: { cus_id: 200 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Supplier ism (200) initial balance: ${initialSupp.cus_balance}`);

    const initialCash = await prisma.customer.findUnique({
      where: { cus_id: 157 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Cash Account (157) initial balance: ${initialCash.cus_balance}`);

    const initialBank = await prisma.customer.findUnique({
      where: { cus_id: 148 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`UBL Bank (148) initial balance: ${initialBank.cus_balance}`);

    // GET purchase
    const getRes = await fetch(`http://localhost:3005/api/purchases?id=${purId}`);
    const purchase = await getRes.json();

    // Modify total_amount and payment
    // Current total_amount=11700, payment=20000, cash_payment=10000, bank_payment=10000
    // Let's change: total_amount=12700, payment=21000, cash_payment=10500, bank_payment=10500
    const updatedPurchase = {
      ...purchase,
      id: purchase.pur_id,
      total_amount: 12700,
      payment: 21000,
      cash_payment: 10500,
      bank_payment: 10500,
      payment_type: 'BANK_TRANSFER',
      bank_account_id: 148,
      purchase_details: purchase.purchase_details.map(d => ({
        pro_id: d.pro_id,
        qnty: d.qnty,
        unit: d.unit,
        unit_rate: 260, // 260 * 50 = 13000? Wait, 12700 total_amount. Let's make unit_rate = 254 (254 * 50 = 12700)
        prate: 254,
        crate: d.crate,
        total_amount: 12700
      }))
    };

    console.log('\n=== 2. Sending PUT request to port 3005 ===');
    const putRes = await fetch(`http://localhost:3005/api/purchases`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedPurchase)
    });

    console.log(`PUT status: ${putRes.status} ${putRes.statusText}`);
    const resText = await putRes.text();
    console.log(`PUT response:`, resText.slice(0, 1000));

    if (!putRes.ok) {
      console.log('Error during PUT execution!');
      return;
    }

    console.log('\n=== 3. Inspecting updated Balances in DB ===');
    const finalSupp = await prisma.customer.findUnique({
      where: { cus_id: 200 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Supplier ism (200) final balance: ${finalSupp.cus_balance}`);

    const finalCash = await prisma.customer.findUnique({
      where: { cus_id: 157 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Cash Account (157) final balance: ${finalCash.cus_balance}`);

    const finalBank = await prisma.customer.findUnique({
      where: { cus_id: 148 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`UBL Bank (148) final balance: ${finalBank.cus_balance}`);

    console.log('\n=== 4. Current Ledger entries for Supplier 200 ===');
    const entries = await prisma.ledger.findMany({
      where: { cus_id: 200 },
      orderBy: [{ created_at: 'asc' }, { l_id: 'asc' }]
    });
    console.log(entries.map(e => ({
      l_id: e.l_id,
      bill_no: e.bill_no,
      trnx_type: e.trnx_type,
      opening: e.opening_balance,
      debit: e.debit_amount,
      credit: e.credit_amount,
      closing: e.closing_balance,
      created_at: e.created_at
    })));

  } catch (err) {
    console.error('Fetch/test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
