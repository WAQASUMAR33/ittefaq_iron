const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cash = await prisma.customer.findUnique({
    where: { cus_id: 157 }
  });
  console.log('Cash account:', cash);

  const entries = await prisma.ledger.findMany({
    where: { cus_id: 157 },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });

  console.log('Cash entries count:', entries.length);
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
}

main().finally(() => prisma.$disconnect());
