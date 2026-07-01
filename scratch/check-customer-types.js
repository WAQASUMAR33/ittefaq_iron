const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.customerType.findMany();
  console.log('Customer Types in DB:', types);

  const categories = await prisma.customerCategory.findMany();
  console.log('Customer Categories in DB:', categories);
}

main();
