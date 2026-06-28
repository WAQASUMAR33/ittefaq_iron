const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== Updating ledger_type for existing entries in BULK ===');

  try {
    // 1. Purchase Returns (starts with PR-)
    const prRes = await prisma.ledger.updateMany({
      where: { bill_no: { startsWith: 'PR-' } },
      data: { ledger_type: 'Purchase Return' }
    });
    console.log(`Updated Purchase Returns: ${prRes.count}`);

    // 2. Expenses (starts with EXP-)
    const expRes = await prisma.ledger.updateMany({
      where: { bill_no: { startsWith: 'EXP-' } },
      data: { ledger_type: 'Expense' }
    });
    console.log(`Updated Expenses: ${expRes.count}`);

    // 3. Subscriptions (contains Package Subscription)
    const subRes = await prisma.ledger.updateMany({
      where: { details: { contains: 'Package Subscription' } },
      data: { ledger_type: 'Order' }
    });
    console.log(`Updated Subscriptions (Order): ${subRes.count}`);

    // 4. Sale Returns (contains Sale Return or Refund Paid Out)
    const srRes1 = await prisma.ledger.updateMany({
      where: { details: { contains: 'Sale Return' } },
      data: { ledger_type: 'Sale Return' }
    });
    const srRes2 = await prisma.ledger.updateMany({
      where: { details: { contains: 'Refund Paid Out' } },
      data: { ledger_type: 'Sale Return' }
    });
    console.log(`Updated Sale Returns: ${srRes1.count + srRes2.count}`);

    // 5. Payments (PAY- prefix)
    const payRecRes = await prisma.ledger.updateMany({
      where: {
        bill_no: { startsWith: 'PAY-' },
        OR: [
          { details: { contains: 'payment received' } },
          { details: { contains: 'receive' } }
        ]
      },
      data: { ledger_type: 'Receiving' }
    });
    const payPaidRes = await prisma.ledger.updateMany({
      where: {
        bill_no: { startsWith: 'PAY-' },
        NOT: [
          { details: { contains: 'payment received' } },
          { details: { contains: 'receive' } }
        ]
      },
      data: { ledger_type: 'Payment' }
    });
    console.log(`Updated Payments: Receiving=${payRecRes.count}, Payment=${payPaidRes.count}`);

    // 6. Manual Journal (starts with JRN-)
    const jrnRes = await prisma.ledger.updateMany({
      where: { bill_no: { startsWith: 'JRN-' } },
      data: { ledger_type: 'Journal' }
    });
    console.log(`Updated Manual Journals: ${jrnRes.count}`);

    // 7. Adjustments
    const adjRes = await prisma.ledger.updateMany({
      where: { details: { contains: 'Adjustment' } },
      data: { ledger_type: 'Adjustment' }
    });
    console.log(`Updated Adjustments: ${adjRes.count}`);

    // 8. Purchase (trnx_type: PURCHASE)
    const purRes = await prisma.ledger.updateMany({
      where: { trnx_type: 'PURCHASE' },
      data: { ledger_type: 'Purchase' }
    });
    console.log(`Updated Purchases: ${purRes.count}`);

    // 9. Cargo/Labour/Delivery/Fare (from purchases)
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

    // 10. Orders (trnx_type: SALE and details contains order/hold bill)
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

    // 11. Sales (trnx_type: SALE or details contains sale/bill)
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

    // 12. Fallback for any remaining nulls
    const fallbackRes = await prisma.ledger.updateMany({
      where: { ledger_type: null },
      data: { ledger_type: 'Sale' }
    });
    console.log(`Fallback updates: ${fallbackRes.count}`);

    console.log('=== BULK UPDATE COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error running bulk update script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
