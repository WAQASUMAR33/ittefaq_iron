const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CUSTOMER CATEGORIES ===');
  const categories = await prisma.customerCategory.findMany();
  console.log(categories);

  console.log('\n=== CUSTOMER TYPES ===');
  const types = await prisma.customerType.findMany();
  console.log(types);

  console.log('\n=== CUSTOMERS MATCHING CASH OR ADJUSTMENT ===');
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { cus_name: { contains: 'cash' } },
        { cus_name: { contains: 'adjust' } }
      ]
    },
    include: {
      customer_category: true,
      customer_type: true
    }
  });
  console.log(customers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
