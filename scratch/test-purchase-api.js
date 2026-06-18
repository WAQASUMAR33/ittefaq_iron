const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running purchase API verification test...');

  // Find a customer/supplier
  const supplier = await prisma.customer.findFirst({
    where: {
      customer_category: { cus_cat_title: { not: { contains: 'bank' } } },
      customer_type: { cus_type_title: { not: { contains: 'bank' } } }
    }
  });

  if (!supplier) {
    console.log('❌ No supplier found in database. Please run seed data or ensure customers exist.');
    return;
  }

  // Find a bank account
  const bank = await prisma.customer.findFirst({
    where: {
      customer_category: { cus_cat_title: { contains: 'bank' } },
      customer_type: { cus_type_title: { contains: 'bank' } }
    }
  });

  if (!bank) {
    console.log('❌ No bank account found in database. Please ensure at least one bank exists.');
    return;
  }

  console.log(`Found Supplier: ${supplier.cus_name} (ID: ${supplier.cus_id})`);
  console.log(`Found Bank Account: ${bank.cus_name} (ID: ${bank.cus_id})`);

  // Create a dummy purchase with split payment
  console.log('Creating a dummy purchase...');
  const purchase = await prisma.purchase.create({
    data: {
      cus_id: supplier.cus_id,
      total_amount: 100,
      net_total: 100,
      payment: 80,
      payment_type: 'BANK_TRANSFER', // backend normalizes SPLIT to BANK_TRANSFER
      cash_payment: 50,
      bank_payment: 30,
      bank_title: 'Bank Payment'
    }
  });

  console.log(`Created purchase with ID: ${purchase.pur_id}`);

  // Create a dummy ledger entry for the bank
  console.log('Creating bank ledger entry for purchase...');
  await prisma.ledger.create({
    data: {
      cus_id: bank.cus_id,
      opening_balance: 0,
      debit_amount: 0,
      credit_amount: 30,
      closing_balance: -30,
      bill_no: String(purchase.pur_id),
      trnx_type: 'BANK_TRANSFER',
      details: 'Payment to Supplier',
      payments: 30,
      cash_payment: 0,
      bank_payment: 30
    }
  });

  // Verify GET List logic
  console.log('Verifying GET List logic...');
  const purchases = await prisma.purchase.findMany({
    where: { pur_id: purchase.pur_id }
  });

  const purchaseIds = purchases.map(p => String(p.pur_id));
  const bankLedgerEntries = await prisma.ledger.findMany({
    where: {
      bill_no: { in: purchaseIds },
      customer: {
        customer_category: { cus_cat_title: { contains: 'bank' } },
        customer_type: { cus_type_title: { contains: 'bank' } }
      }
    },
    select: { bill_no: true, cus_id: true }
  });

  const bankAccountMap = {};
  bankLedgerEntries.forEach(entry => {
    bankAccountMap[entry.bill_no] = entry.cus_id;
  });

  const enhancedPurchases = purchases.map(p => {
    let resolvedBankAccountId = bankAccountMap[String(p.pur_id)] || null;
    if (!resolvedBankAccountId && parseFloat(p.bank_payment || 0) > 0) {
      resolvedBankAccountId = p.credit_account_id;
    }
    return Object.assign({}, p, { bank_account_id: resolvedBankAccountId });
  });

  console.log('Enhanced Purchase:', enhancedPurchases[0]);

  if (enhancedPurchases[0].bank_account_id === bank.cus_id) {
    console.log('✅ Success: bank_account_id resolved correctly!');
  } else {
    console.log(`❌ Failure: bank_account_id resolved as: ${enhancedPurchases[0].bank_account_id}, expected: ${bank.cus_id}`);
  }

  // Cleanup
  console.log('Cleaning up dummy purchase and ledger entries...');
  await prisma.ledger.deleteMany({ where: { bill_no: String(purchase.pur_id) } });
  await prisma.purchase.delete({ where: { pur_id: purchase.pur_id } });
  console.log('Cleanup complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
