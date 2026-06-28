const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== Continuing ledger_type updates (remaining entries) ===');

  try {
    // Payment entries (PAY- prefix, remaining nulls)
    const payPaidRes = await prisma.ledger.updateMany({
      where: {
        bill_no: { startsWith: 'PAY-' },
        ledger_type: null
      },
      data: { ledger_type: 'Payment' }
    });
    console.log(`Updated remaining PAY- entries: ${payPaidRes.count}`);

    // Adjustments (details contains Adjustment)
    const adjRes = await prisma.ledger.updateMany({
      where: { 
        ledger_type: null,
        details: { contains: 'Adjustment' }
      },
      data: { ledger_type: 'Adjustment' }
    });
    console.log(`Updated Adjustments: ${adjRes.count}`);

    // Purchase (trnx_type: PURCHASE)
    const purRes = await prisma.ledger.updateMany({
      where: { trnx_type: 'PURCHASE' },
      data: { ledger_type: 'Purchase' }
    });
    console.log(`Updated Purchases: ${purRes.count}`);

    // Cargo/Labour/Delivery/Fare
    const cargoRes = await prisma.ledger.updateMany({
      where: {
        ledger_type: null,
        OR: [
          { details: { contains: 'cargo' } },
          { details: { contains: 'labour' } },
          { details: { contains: 'delivery' } },
          { details: { contains: 'fare' } }
        ]
      },
      data: { ledger_type: 'Purchase' }
    });
    console.log(`Updated Cargo/Labour/Delivery/Fare: ${cargoRes.count}`);

    // Orders (trnx_type: SALE and details contains order/hold bill)
    const orderRes = await prisma.ledger.updateMany({
      where: {
        trnx_type: 'SALE',
        OR: [
          { details: { contains: 'order' } },
          { details: { contains: 'hold bill' } }
        ]
      },
      data: { ledger_type: 'Order' }
    });
    console.log(`Updated Orders: ${orderRes.count}`);

    // Sales (trnx_type: SALE or details contains sale/bill)
    const saleRes = await prisma.ledger.updateMany({
      where: {
        ledger_type: null,
        OR: [
          { trnx_type: 'SALE' },
          { details: { contains: 'sale' } },
          { details: { contains: 'bill' } }
        ]
      },
      data: { ledger_type: 'Sale' }
    });
    console.log(`Updated Sales: ${saleRes.count}`);

    // Fallback for remaining nulls
    const fallbackRes = await prisma.ledger.updateMany({
      where: { ledger_type: null },
      data: { ledger_type: 'Sale' }
    });
    console.log(`Fallback updates: ${fallbackRes.count}`);

    // Count remaining nulls
    const remaining = await prisma.ledger.count({ where: { ledger_type: null } });
    console.log(`Remaining null ledger_type entries: ${remaining}`);

    console.log('=== BULK UPDATE COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
