const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Customers ---');
  const customers = await prisma.customer.findMany({
    take: 10,
    select: {
      cus_id: true,
      cus_name: true,
      cus_balance: true,
      customer_category: {
        select: {
          cus_cat_title: true
        }
      }
    }
  });
  console.log(customers);

  console.log('--- Recent Sales ---');
  const sales = await prisma.sale.findMany({
    take: 5,
    orderBy: { sale_id: 'desc' },
    include: {
      customer: { select: { cus_name: true } }
    }
  });
  console.log(sales.map(s => ({
    sale_id: s.sale_id,
    customer: s.customer?.cus_name,
    total_amount: s.total_amount,
    payment: s.payment,
    bill_type: s.bill_type
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
