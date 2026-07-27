const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- FIXING TRANSFER TIMESTAMPS ---');
  
  const transfers = await prisma.ledger.findMany({
    where: {
      ledger_type: 'Transfer',
      bill_no: { startsWith: 'TRF-' }
    }
  });

  console.log(`Found ${transfers.length} transfer entries to fix.`);
  
  for (const t of transfers) {
    console.log(`Fixing l_id: ${t.l_id}, changing created_at from ${t.created_at.toISOString()} to ${t.updated_at.toISOString()}`);
    await prisma.ledger.update({
      where: { l_id: t.l_id },
      data: { created_at: t.updated_at }
    });
  }

  console.log('✅ Done fixing transfer timestamps.');
}

main().finally(() => prisma.$disconnect());
