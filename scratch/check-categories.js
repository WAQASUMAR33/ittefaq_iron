const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.customerCategory.findMany({});
  console.log('Customer Categories:');
  console.table(categories);

  const types = await prisma.customerType.findMany({});
  console.log('Customer Types:');
  console.table(types);
}

main().finally(() => prisma.$disconnect());
