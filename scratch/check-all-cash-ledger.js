const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const cashAccount = await prisma.customer.findFirst({
      where: {
        customer_category: {
          cus_cat_title: { contains: 'Cash Account' }
        }
      }
    });

    if (!cashAccount) {
      console.log('Cash account not found');
      return;
    }

    console.log(`Cash Account: ${cashAccount.cus_name} (ID: ${cashAccount.cus_id})`);

    const creditEntries = await prisma.ledger.findMany({
      where: {
        cus_id: cashAccount.cus_id,
        OR: [
          { trnx_type: 'CREDIT' },
          { credit_amount: { gt: 0 } }
        ]
      },
      orderBy: { l_id: 'desc' },
      take: 20
    });

    console.log('\n=== Cash Account CREDIT/Credit Amount > 0 Entries ===');
    console.log(creditEntries.map(e => ({
      id: e.l_id,
      bill: e.bill_no,
      type: e.trnx_type,
      debit: e.debit_amount,
      credit: e.credit_amount,
      open: e.opening_balance,
      close: e.closing_balance,
      details: e.details,
      created_at: e.created_at
    })));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
