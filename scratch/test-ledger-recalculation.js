const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const saleId = 195;
  try {
    console.log(`\n=== 1. Original Customer Balance & Ledger for Sale ${saleId} ===`);
    const initialCust = await prisma.customer.findUnique({
      where: { cus_id: 197 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Customer hafeez khan sb (197) initial balance: ${initialCust.cus_balance}`);

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

    // GET sale
    const getRes = await fetch(`http://localhost:3005/api/sales?id=${saleId}`);
    const sale = await getRes.json();

    // Modify total_amount and payment
    // Current total_amount=20000, payment=5000, cash_payment=2500, bank_payment=2500, advance_payment=15000
    // Let's change: total_amount=22000, payment=6000, cash_payment=3000, bank_payment=3000, advance_payment=15000
    // Net customer change: New owed = 22000 - 6000 = 16000. Old owed = 15000.
    // Difference: Customer owes 1000 MORE.
    // So customer balance should change from -16600 to -15600.
    // Cash payment change: from 2500 to 3000 (+500). Cash balance should increase by 500.
    // Bank payment change: from 2500 to 3000 (+500). Bank balance should increase by 500.
    
    const updatedSale = {
      ...sale,
      id: sale.sale_id,
      total_amount: 22000,
      payment: 6000,
      cash_payment: 3000,
      bank_payment: 3000,
      payment_type: 'CASH',
      customer: undefined,
      sale_details: sale.sale_details.map(d => ({
        pro_id: d.pro_id,
        qnty: d.qnty,
        unit: d.unit,
        unit_rate: d.unit_rate,
        total_amount: d.total_amount,
        discount: d.discount
      })),
      split_payments: [
        {
          amount: 3000,
          payment_type: 'CASH',
          debit_account_id: null,
          credit_account_id: null,
          reference: 'Cash payment edit 2'
        },
        {
          amount: 3000,
          payment_type: 'BANK_TRANSFER',
          debit_account_id: 148,
          credit_account_id: null,
          reference: 'Bank payment edit 2'
        }
      ],
      transport_details: sale.transport_details.map(t => ({
        account_id: t.account_id,
        amount: t.amount
      }))
    };

    console.log('\n=== 2. Sending PUT request to port 3005 ===');
    const putRes = await fetch(`http://localhost:3005/api/sales`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSale)
    });

    console.log(`PUT status: ${putRes.status} ${putRes.statusText}`);
    const resText = await putRes.text();
    console.log(`PUT response:`, resText.slice(0, 1000));

    if (!putRes.ok) {
      console.log('Error during PUT execution!');
      return;
    }

    console.log('\n=== 3. Inspecting updated Customer/Cash/Bank balances in DB ===');
    const finalCust = await prisma.customer.findUnique({
      where: { cus_id: 197 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Customer hafeez khan sb (197) final balance: ${finalCust.cus_balance} (Expected: -15600)`);

    const finalCash = await prisma.customer.findUnique({
      where: { cus_id: 157 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Cash Account (157) final balance: ${finalCash.cus_balance} (Expected: ${initialCash.cus_balance + 500})`);

    const finalBank = await prisma.customer.findUnique({
      where: { cus_id: 148 },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`UBL Bank (148) final balance: ${finalBank.cus_balance} (Expected: ${initialBank.cus_balance + 500})`);

    console.log('\n=== 4. Current Ledger entries for customer 197 ===');
    const entries = await prisma.ledger.findMany({
      where: { cus_id: 197 },
      orderBy: { created_at: 'asc' }
    });
    console.log(entries.map(e => ({
      l_id: e.l_id,
      bill_no: e.bill_no,
      trnx_type: e.trnx_type,
      opening: e.opening_balance,
      debit: e.debit_amount,
      credit: e.credit_amount,
      closing: e.closing_balance,
      payments: e.payments,
      created_at: e.created_at
    })));

  } catch (err) {
    console.error('Fetch/test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
