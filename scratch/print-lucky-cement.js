const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Verifying Lucky Cement Limited Ledger Entries ===');
  const account = await prisma.customer.findFirst({
    where: { cus_name: { contains: 'lucky' } }
  });

  const entries = await prisma.ledger.findMany({
    where: { cus_id: account.cus_id },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });

  for (const entry of entries.slice(0, 5)) {
    console.log(`L_ID: ${entry.l_id}`);
    console.log(`  Opening: ${entry.opening_balance}`);
    console.log(`  Debit: ${entry.debit_amount}`);
    console.log(`  Credit: ${entry.credit_amount}`);
    console.log(`  Closing: ${entry.closing_balance}`);
  }
}

main();
