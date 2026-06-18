const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Database Reset Script...');

  // 1. Delete Purchase Returns
  const countPRD = await prisma.purchaseReturnDetail.deleteMany({});
  console.log(`Deleted ${countPRD.count} PurchaseReturnDetail records.`);
  const countPR = await prisma.purchaseReturn.deleteMany({});
  console.log(`Deleted ${countPR.count} PurchaseReturn records.`);

  // 2. Delete Purchase Details and Purchases
  const countPD = await prisma.purchaseDetail.deleteMany({});
  console.log(`Deleted ${countPD.count} PurchaseDetail records.`);
  const countP = await prisma.purchase.deleteMany({});
  console.log(`Deleted ${countP.count} Purchase records.`);

  // 3. Delete Sale Returns
  const countSRD = await prisma.saleReturnDetail.deleteMany({});
  console.log(`Deleted ${countSRD.count} SaleReturnDetail records.`);
  const countSR = await prisma.saleReturn.deleteMany({});
  console.log(`Deleted ${countSR.count} SaleReturn records.`);

  // 4. Delete Split Payments, Sale Details, and Sales (includes Bills and Orders)
  const countSP = await prisma.splitPayment.deleteMany({});
  console.log(`Deleted ${countSP.count} SplitPayment records.`);
  const countSD = await prisma.saleDetail.deleteMany({});
  console.log(`Deleted ${countSD.count} SaleDetail records.`);
  const countS = await prisma.sale.deleteMany({});
  console.log(`Deleted ${countS.count} Sale/Order records.`);

  // 5. Delete Ledgers
  const countL = await prisma.ledger.deleteMany({});
  console.log(`Deleted ${countL.count} Ledger records.`);

  // 6. Delete Payments and Payment Details
  const countPayD = await prisma.paymentDetail.deleteMany({});
  console.log(`Deleted ${countPayD.count} PaymentDetail records.`);
  const countPay = await prisma.payment.deleteMany({});
  console.log(`Deleted ${countPay.count} Payment records.`);

  // 7. Delete Journals and Journal Details
  const countJD = await prisma.journalDetail.deleteMany({});
  console.log(`Deleted ${countJD.count} JournalDetail records.`);
  const countJ = await prisma.journal.deleteMany({});
  console.log(`Deleted ${countJ.count} Journal records.`);

  // 8. Delete Expenses
  const countExp = await prisma.expense.deleteMany({});
  console.log(`Deleted ${countExp.count} Expense records.`);

  // 9. Delete Drafts and Hold Bills
  const countDS = await prisma.draftSale.deleteMany({});
  console.log(`Deleted ${countDS.count} DraftSale records.`);
  const countHBD = await prisma.holdBillDetail.deleteMany({});
  console.log(`Deleted ${countHBD.count} HoldBillDetail records.`);
  const countHB = await prisma.holdBill.deleteMany({});
  console.log(`Deleted ${countHB.count} HoldBill records.`);

  // 10. Reset Customer Balances to 0
  const countCust = await prisma.customer.updateMany({
    data: { cus_balance: 0 }
  });
  console.log(`Reset balances for ${countCust.count} Customer records.`);

  // 11. Reset Loader Balances to 0
  const countLoader = await prisma.loader.updateMany({
    data: { loader_balance: 0 }
  });
  console.log(`Reset balances for ${countLoader.count} Loader records.`);

  // 12. Reset Store Stocks and Product Stocks to 0
  const countSS = await prisma.storeStock.updateMany({
    data: { stock_quantity: 0 }
  });
  console.log(`Reset stock quantities for ${countSS.count} StoreStock records.`);
  
  const countProd = await prisma.product.updateMany({
    data: { pro_stock_qnty: 0 }
  });
  console.log(`Reset stock quantities for ${countProd.count} Product records.`);

  console.log('✅ Database Reset Completed Successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
