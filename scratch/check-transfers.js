const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transfers = await prisma.ledger.findMany({
    where: {
      OR: [
        { ledger_type: 'Transfer' },
        { bill_no: { startsWith: 'TRF-' } }
      ]
    },
    include: {
      customer: true
    },
    orderBy: {
      l_id: 'desc'
    }
  });

  console.log(`Found ${transfers.length} transfer entries in database:`);
  for (const t of transfers) {
    console.log(`- l_id: ${t.l_id}, Account: ${t.customer?.cus_name}, bill_no: ${t.bill_no}, type: ${t.ledger_type}, debit: ${t.debit_amount}, credit: ${t.credit_amount}, balance: ${t.closing_balance}`);
  }
}

main().finally(() => prisma.$disconnect());
