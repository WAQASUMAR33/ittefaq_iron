const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCargo() {
  try {
    const entries = await prisma.ledger.findMany({
      where: {
        details: {
          contains: 'Out Delivery'
        }
      },
      orderBy: { created_at: 'asc' }
    });

    console.log(`\n📖 Found ${entries.length} Ledger entries for Out Delivery:`);
    for (const e of entries) {
      const customer = await prisma.customer.findUnique({
        where: { cus_id: e.cus_id },
        include: { customer_category: true }
      });
      console.log(`L_ID: ${e.l_id} | CustID: ${e.cus_id} | Name: ${customer?.cus_name} | Cat: ${customer?.customer_category?.cus_cat_title} | Date: ${e.created_at.toISOString().split('T')[0]} | Bill No: ${e.bill_no} | Debit: ${e.debit_amount} | Credit: ${e.credit_amount} | Opening: ${e.opening_balance} | Closing: ${e.closing_balance} | Details: ${e.details}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCargo();
