const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectSaleLedger(saleId) {
  console.log(`\n=== Ledger Entries for Sale ID ${saleId} ===`);
  const entries = await prisma.ledger.findMany({
    where: { bill_no: String(saleId) },
    orderBy: { l_id: 'asc' }
  });
  console.log(entries.map(e => ({
    l_id: e.l_id,
    cus_id: e.cus_id,
    trnx_type: e.trnx_type,
    details: e.details,
    opening: e.opening_balance,
    debit: e.debit_amount,
    credit: e.credit_amount,
    closing: e.closing_balance,
    payments: e.payments
  })));

  // Print referenced customer balances
  const uniqCusts = [...new Set(entries.map(e => e.cus_id))];
  for (const cid of uniqCusts) {
    const cust = await prisma.customer.findUnique({
      where: { cus_id: cid },
      select: { cus_id: true, cus_name: true, cus_balance: true }
    });
    console.log(`Customer ID ${cid} (${cust?.cus_name}) Current Balance: ${cust?.cus_balance}`);
  }
}

async function run() {
  const saleId = 195;
  await inspectSaleLedger(saleId);

  // Now let's try to import the PUT handler and execute a simulated PUT request
  try {
    const { PUT, GET } = await import('../src/app/api/sales/route.js');
    
    // We will retrieve the full sale details first using our GET or directly from Prisma
    const sale = await prisma.sale.findUnique({
      where: { sale_id: saleId },
      include: {
        sale_details: true,
        split_payments: true
      }
    });

    console.log('\n--- Original Sale ---');
    console.log(`Total: ${sale.total_amount}, Payment: ${sale.payment}`);

    // Let's modify the total amount and payment amount:
    // Original: total_amount = 19227.23, payment = 1000, cash_payment = 1000
    // We will update it to total_amount = 20000, payment = 5000, cash_payment = 5000
    const body = {
      id: sale.sale_id,
      cus_id: sale.cus_id,
      store_id: sale.store_id,
      total_amount: 20000,
      discount: sale.discount,
      payment: 5000,
      payment_type: 'CASH',
      cash_payment: 5000,
      bank_payment: 0,
      bank_title: sale.bank_title,
      advance_payment: sale.advance_payment,
      debit_account_id: sale.debit_account_id,
      credit_account_id: sale.credit_account_id,
      loader_id: sale.loader_id,
      shipping_amount: sale.shipping_amount,
      labour_charges: sale.labour_charges,
      bill_type: sale.bill_type,
      reference: sale.reference,
      sale_details: sale.sale_details.map(d => ({
        pro_id: d.pro_id,
        qnty: d.qnty,
        unit: d.unit,
        unit_rate: d.unit_rate,
        total_amount: d.total_amount,
        discount: d.discount
      })),
      transport_details: [],
      split_payments: [],
      updated_by: 1
    };

    console.log('\n--- Simulating PUT request ---');
    const req = {
      json: async () => body
    };

    const response = await PUT(req);
    console.log(`Response Status: ${response.status}`);
    const resData = await response.json();
    if (response.status !== 200) {
      console.log('Error details:', resData);
    } else {
      console.log('✅ PUT succeeded!');
      await inspectSaleLedger(saleId);
    }

  } catch (err) {
    console.error('Execution failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
