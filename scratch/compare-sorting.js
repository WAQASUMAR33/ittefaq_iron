const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.ledger.findMany({
    where: {
      l_id: { gte: 3080, lte: 3096 }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  console.log('Ledger entries by created_at desc:');
  for (const e of entries) {
    console.log(`- l_id: ${e.l_id}, created_at: ${e.created_at.toISOString()}, bill_no: ${e.bill_no}`);
  }
  
  console.log('\nLedger entries by l_id desc:');
  const entriesById = await prisma.ledger.findMany({
    where: {
      l_id: { gte: 3080, lte: 3096 }
    },
    orderBy: {
      l_id: 'desc'
    }
  });
  for (const e of entriesById) {
    console.log(`- l_id: ${e.l_id}, created_at: ${e.created_at.toISOString()}, bill_no: ${e.bill_no}`);
  }
}

main().finally(() => prisma.$disconnect());
