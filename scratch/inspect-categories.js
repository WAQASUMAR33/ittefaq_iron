const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.customerCategory.findMany();
  console.log('Customer Categories:', JSON.stringify(categories, null, 2));
  
  const bankAndCashCustomers = await prisma.customer.findMany({
    where: {
      OR: [
        { customer_category: { cus_cat_title: { contains: 'bank' } } },
        { customer_category: { cus_cat_title: { contains: 'cash' } } },
        { cus_name: { contains: 'Cash' } },
        { cus_name: { contains: 'Bank' } }
      ]
    },
    include: {
      customer_category: true
    }
  });
  console.log('\nBank and Cash Customers:');
  for (const c of bankAndCashCustomers) {
    console.log(`- ID: ${c.cus_id}, Name: ${c.cus_name}, Balance: ${c.cus_balance}, Category: ${c.customer_category?.cus_cat_title}`);
  }
}

main().finally(() => prisma.$disconnect());
