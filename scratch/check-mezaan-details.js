const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Mezaan Bank entries 1585 and 1588 ===');
  const entries = await prisma.ledger.findMany({
    where: { l_id: { in: [1585, 1588] } },
    include: { customer: true }
  });

  for (const entry of entries) {
    console.log(`L_ID: ${entry.l_id}`);
    console.log(`  Details: ${entry.details}`);
    console.log(`  Debit: ${entry.debit_amount}`);
    console.log(`  Credit: ${entry.credit_amount}`);
    console.log(`  Trnx Type: ${entry.trnx_type}`);
    console.log(`  Ledger Type: ${entry.ledger_type}`);
    console.log(`  Customer: ${entry.customer?.cus_name} (ID: ${entry.cus_id})`);
  }
}

main();
