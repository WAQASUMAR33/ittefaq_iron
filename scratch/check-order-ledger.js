const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const orderSales = await prisma.sale.findMany({
      where: {
        bill_type: 'ORDER'
      },
      orderBy: { sale_id: 'desc' },
      take: 10
    });
    
    console.log('=== Recent ORDER Sales ===');
    console.log(orderSales.map(s => ({
      id: s.sale_id,
      bill_no: s.bill_number,
      total: s.total_amount,
      payment: s.payment,
      cash_payment: s.cash_payment,
      bank_payment: s.bank_payment,
      bank_title: s.bank_title,
      created_at: s.created_at
    })));

    if (orderSales.length > 0) {
      const saleIds = orderSales.map(s => String(s.sale_id));
      const ledgerEntries = await prisma.ledger.findMany({
        where: {
          bill_no: { in: saleIds }
        },
        orderBy: [{ bill_no: 'asc' }, { l_id: 'asc' }]
      });

      console.log('\n=== Ledger Entries for Recent ORDER Sales ===');
      console.log(ledgerEntries.map(e => ({
        id: e.l_id,
        cus_id: e.cus_id,
        bill_no: e.bill_no,
        type: e.trnx_type,
        debit: e.debit_amount,
        credit: e.credit_amount,
        open: e.opening_balance,
        close: e.closing_balance,
        details: e.details
      })));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
