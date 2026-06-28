const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.payment.findUnique({
    where: { payment_id: 194 }
  });
  console.log('Payment 194:', JSON.stringify(p, null, 2));
  await prisma.$disconnect();
}

main();
