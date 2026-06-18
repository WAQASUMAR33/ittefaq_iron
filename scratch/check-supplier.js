const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const s = await prisma.customer.findUnique({
    where: { cus_id: 200 }
  });
  console.log(`Supplier ID: ${s.cus_id}, Name: ${s.cus_name}, Balance: ${s.cus_balance}`);
  const entries = await prisma.ledger.findMany({
    where: { cus_id: s.cus_id },
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
    details: e.details,
    created_at: e.created_at
  })));
}

main().finally(() => prisma.$disconnect());
