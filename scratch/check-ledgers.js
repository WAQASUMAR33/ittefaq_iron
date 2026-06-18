const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ledgers = await prisma.ledger.findMany({
    take: 20,
    include: {
      customer: {
        include: {
          customer_category: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  console.log('Recent Ledger Entries:');
  const formatted = ledgers.map(l => ({
    l_id: l.l_id,
    cus_name: l.customer.cus_name,
    category: l.customer.customer_category.cus_cat_title,
    opening: l.opening_balance,
    debit: l.debit_amount,
    credit: l.credit_amount,
    closing: l.closing_balance,
    trnx_type: l.trnx_type
  }));
  console.table(formatted);
}

main().finally(() => prisma.$disconnect());
