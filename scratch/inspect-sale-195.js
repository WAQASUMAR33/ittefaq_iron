const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const saleId = 195;
  console.log(`\n=== Current Ledger Entries for Sale ID ${saleId} ===`);
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

main().catch(console.error).finally(() => prisma.$disconnect());
