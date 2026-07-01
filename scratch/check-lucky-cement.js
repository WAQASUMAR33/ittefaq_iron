const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Lucky Cement Limited account details ===');
  const account = await prisma.customer.findFirst({
    where: { cus_name: { contains: 'lucky' } },
    include: { customer_category: true, customer_type: true }
  });

  if (!account) {
    console.log('Account "lucky cement limited" not found.');
    return;
  }

  console.log(`Account ID: ${account.cus_id}`);
  console.log(`Account Name: ${account.cus_name}`);
  console.log(`Category: ${account.customer_category?.cus_cat_title} (ID: ${account.cus_category})`);
  console.log(`Type: ${account.customer_type?.cus_type_title} (ID: ${account.cus_type})`);
  console.log(`Balance in customer table: ${account.cus_balance}`);

  const entries = await prisma.ledger.findMany({
    where: { cus_id: account.cus_id },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });

  console.log(`Total ledger entries: ${entries.length}`);
  for (const entry of entries.slice(0, 15)) {
    console.log(`  L_ID: ${entry.l_id}`);
    console.log(`    Date: ${entry.created_at}`);
    console.log(`    Opening: ${entry.opening_balance}`);
    console.log(`    Debit: ${entry.debit_amount}`);
    console.log(`    Credit: ${entry.credit_amount}`);
    console.log(`    Closing: ${entry.closing_balance}`);
    console.log(`    Trnx Type: ${entry.trnx_type}, Ledger Type: ${entry.ledger_type}`);
  }
}

main();
