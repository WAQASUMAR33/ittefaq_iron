const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting deletion of all cities...');
  
  // 1. Find all customers that currently reference a city and clear their city_id
  const updatedCustomers = await prisma.customer.updateMany({
    where: {
      city_id: {
        not: null
      }
    },
    data: {
      city_id: null
    }
  });
  console.log(`Cleared city references on ${updatedCustomers.count} customers.`);

  // 2. Delete all records from the City table
  const deleteResult = await prisma.city.deleteMany({});
  console.log(`Successfully deleted ${deleteResult.count} cities from the database.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Error during deletion:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
