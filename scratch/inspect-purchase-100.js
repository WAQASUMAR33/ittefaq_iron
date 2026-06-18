const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.purchase.findUnique({
    where: { pur_id: 100 },
    include: {
      purchase_details: true
    }
  });
  console.log('Purchase 100:', JSON.stringify(p, null, 2));
}

main().finally(() => prisma.$disconnect());
