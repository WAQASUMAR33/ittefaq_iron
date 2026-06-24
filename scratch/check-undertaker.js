const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        cus_name: {
          contains: 'undertaker',
        }
      },
      include: {
        customer_category: true,
      }
    });

    if (!customer) {
      console.log('Customer "undertaker" not found.');
      return;
    }

    console.log('=== Customer Record ===');
    console.log(JSON.stringify(customer, null, 2));

    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        cus_id: customer.cus_id
      },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    console.log('\n=== Ledger Entries ===');
    console.log(JSON.stringify(ledgerEntries, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
