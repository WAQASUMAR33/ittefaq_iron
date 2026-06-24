const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const account_id = 2706; // undertaker
    const total_amount = 3000;
    const discount_amount = 0;
    const payment_type = 'PAY'; // means RECEIVE in frontend
    const created_by = 7;
    const netAmount = total_amount - discount_amount;

    const accountBalances = await prisma.customer.findMany({
      where: { cus_id: account_id },
      select: {
        cus_id: true,
        cus_name: true,
        cus_balance: true,
        cus_category: true,
        customer_category: { select: { cus_cat_title: true } }
      }
    });

    const balanceMap = {};
    const categoryMap = {};
    const supplierAccountIds = new Set();
    accountBalances.forEach(acc => {
      balanceMap[acc.cus_id] = parseFloat(acc.cus_balance || 0);
      categoryMap[acc.cus_id] = acc.cus_category;
      const catTitle = (acc.customer_category?.cus_cat_title || '').toLowerCase();
      if (catTitle.includes('supplier')) supplierAccountIds.add(acc.cus_id);
    });

    const mainAccountIsSupplier = supplierAccountIds.has(account_id);

    // Let's mock a simple ledger entry creation like in payments/route.js
    const mainDebitAmount = total_amount;
    const mainCreditAmount = 0;

    const mainAccountEntry = {
      cus_id: account_id,
      opening_balance: balanceMap[account_id] || 0,
      debit_amount: mainDebitAmount,
      credit_amount: mainCreditAmount,
      closing_balance: (balanceMap[account_id] || 0) - total_amount,
    };

    // Let's create a test payment record (without saving to db, just mock model properties)
    const payment = {
      payment_id: 9999,
      payment_date: new Date(),
      payment_type,
      account_id,
      total_amount,
      discount_amount,
      net_amount: netAmount,
      created_by
    };

    const result = {
      ...payment,
      customer_opening_balance: mainAccountEntry.opening_balance,
      customer_closing_balance: mainAccountEntry.closing_balance
    };

    console.log('=== Simulated API Response ===');
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
