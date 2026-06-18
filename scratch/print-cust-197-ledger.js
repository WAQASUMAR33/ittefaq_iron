const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.ledger.findMany({
    where: { cus_id: 197 },
    orderBy: { l_id: 'asc' }
  });
  console.log('Ledger entries for customer 197:');
  console.log(entries.map(e => ({
    l_id: e.l_id,
    bill_no: e.bill_no,
    trnx_type: e.trnx_type,
    details: e.details,
    opening: e.opening_balance,
    debit: e.debit_amount,
    credit: e.credit_amount,
    closing: e.closing_balance,
    payments: e.payments,
    created_at: e.created_at
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
