const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const categories = await prisma.customerCategory.findMany();
    console.log('=== Categories ===');
    console.log(categories);

    const transporters = await prisma.customer.findMany({
      where: {
        customer_category: {
          cus_cat_title: { contains: 'Transport' }
        }
      }
    });
    const transporterIds = transporters.map(t => t.cus_id);
    console.log('=== Transporters ===');
    console.log(transporters.map(t => ({ id: t.cus_id, name: t.cus_name, balance: t.cus_balance })));

    const cashAccountEntries = await prisma.ledger.findMany({
      where: { cus_id: 2551 },
      orderBy: [{ created_at: 'asc' }, { l_id: 'asc' }],
      take: 20
    });
    console.log(`\n=== Ledger Entries for Cash Account (ID: 2551) ===`);
    console.log(cashAccountEntries.map(e => ({
      id: e.l_id,
      bill: e.bill_no,
      type: e.trnx_type,
      debit: e.debit_amount,
      credit: e.credit_amount,
      open: e.opening_balance,
      close: e.closing_balance,
      details: e.details
    })));

    const cashAccounts = await prisma.customer.findMany({
      where: {
        customer_category: {
          cus_cat_title: { contains: 'Cash' }
        }
      }
    });
    console.log('=== Cash Accounts ===');
    console.log(cashAccounts.map(c => ({ id: c.cus_id, name: c.cus_name, balance: c.cus_balance })));

    const bankAccounts = await prisma.customer.findMany({
      where: {
        customer_category: {
          cus_cat_title: { contains: 'Bank' }
        }
      }
    });
    console.log('=== Bank Accounts ===');
    console.log(bankAccounts.map(b => ({ id: b.cus_id, name: b.cus_name, balance: b.cus_balance })));

    const labourAccounts = await prisma.customer.findMany({
      where: {
        customer_category: {
          cus_cat_title: { contains: 'Labour' }
        }
      }
    });
    console.log('=== Labour Accounts ===');
    console.log(labourAccounts.map(l => ({ id: l.cus_id, name: l.cus_name, balance: l.cus_balance })));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
