const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- TESTING REPORT STOCK SYNCHRONIZATION ---');

  const products = await prisma.product.findMany({
    take: 5,
    include: { store_stocks: true }
  });

  for (const product of products) {
    const proId = product.pro_id;
    console.log(`\nProduct: ${product.pro_title} (ID: ${proId})`);

    // Sum of store stocks
    const currentStock = product.store_stocks.reduce((sum, ss) => sum + parseFloat(ss.stock_quantity || 0), 0);
    console.log(`- Current Stock from store_stocks: ${currentStock}`);

    // Retrieve returns
    const returnLedgerEntries = await prisma.ledger.findMany({
      where: { details: { contains: 'Purchase Return to' } },
      select: { bill_no: true },
      distinct: ['bill_no']
    });
    const returnPurIds = new Set(returnLedgerEntries.map(e => parseInt(e.bill_no)).filter(n => !isNaN(n)));

    // Fetch transactions since 1970
    const afterDateStart = new Date('1970-01-01T00:00:00.000+05:00');
    const [aggAllPur, aggPurRet, aggSale, aggSaleRet, returnLedgerAfter] = await Promise.all([
      prisma.purchaseDetail.aggregate({
        where: { pro_id: proId, purchase: { created_at: { gte: afterDateStart } } },
        _sum: { qnty: true }
      }),
      prisma.purchaseReturnDetail.aggregate({
        where: { pro_id: proId, purchase_return: { return_date: { gte: afterDateStart } } },
        _sum: { return_quantity: true }
      }),
      prisma.saleDetail.aggregate({
        where: { pro_id: proId, sale: { bill_type: 'BILL', created_at: { gte: afterDateStart } } },
        _sum: { qnty: true }
      }),
      prisma.saleReturnDetail.aggregate({
        where: { pro_id: proId, sale_return: { created_at: { gte: afterDateStart } } },
        _sum: { qnty: true }
      }),
      prisma.purchaseDetail.aggregate({
        where: { pro_id: proId, pur_id: { in: returnPurIds.size > 0 ? [...returnPurIds] : [] }, purchase: { created_at: { gte: afterDateStart } } },
        _sum: { qnty: true }
      }),
    ]);

    const purRetFromPurTable = parseFloat(returnLedgerAfter._sum.qnty || 0);
    const realPurchases = parseFloat(aggAllPur._sum.qnty || 0) - purRetFromPurTable;
    
    const netChange = realPurchases
      - parseFloat(aggPurRet._sum.return_quantity || 0)
      - purRetFromPurTable
      - parseFloat(aggSale._sum.qnty || 0)
      + parseFloat(aggSaleRet._sum.qnty || 0);

    const calculatedOpeningStock = currentStock - netChange;
    console.log(`- Calculated Opening Stock: ${calculatedOpeningStock}`);
    console.log(`- Net Change during period: ${netChange}`);
    console.log(`- Calculated Final Stock (Opening + Net Change): ${calculatedOpeningStock + netChange}`);
    console.log(`- Matches currentStock? ${calculatedOpeningStock + netChange === currentStock ? '✅ YES' : '❌ NO'}`);
  }
}

main().finally(() => prisma.$disconnect());
