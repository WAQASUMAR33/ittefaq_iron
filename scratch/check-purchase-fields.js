const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.purchase.findFirst();
  console.log('Purchase keys:', p ? Object.keys(p) : 'null');
}

main().finally(() => prisma.$disconnect());
