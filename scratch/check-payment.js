const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.payment.findFirst();
  console.log('Payment keys:', p ? Object.keys(p) : 'null');
  console.log('Payment record:', p);

  const pd = await prisma.paymentDetail.findFirst();
  console.log('PaymentDetail keys:', pd ? Object.keys(pd) : 'null');
  console.log('PaymentDetail record:', pd);
}

main().finally(() => prisma.$disconnect());
