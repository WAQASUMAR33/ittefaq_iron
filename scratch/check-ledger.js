const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entry = await prisma.ledger.findUnique({
    where: { l_id: 32 },
    include: { customer: true }
  });
  console.log('Ledger Entry L_ID 32:', JSON.stringify(entry, null, 2));
  await prisma.$disconnect();
}

main();
