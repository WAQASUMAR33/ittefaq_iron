const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('\n🧪 TEST: Supplier Purchase and Payment Ledger Flow');

  let tempSupplier = null;

  try {
    // Find a valid user to avoid foreign key constraint errors
    const user = await prisma.users.findFirst();
    const userId = user ? user.user_id : 1;
    console.log(`ℹ️  Using User ID: ${userId} for created_by/updated_by`);

    // Find supplier category and type
    const cat = await prisma.customerCategory.findFirst({
      where: { cus_cat_title: { contains: 'Supplier' } }
    });
    const type = await prisma.customerType.findFirst({
      where: { cus_type_title: { contains: 'supplier' } }
    });

    if (!cat) {
      console.error('❌ Supplier category not found in DB');
      return process.exit(1);
    }

    // Resolve cash account ID dynamically to prevent FK errors
    const cashCategory = await prisma.customerCategory.findFirst({
      where: { cus_cat_title: { contains: 'Cash' } }
    });
    let cashAccount = null;
    if (cashCategory) {
      cashAccount = await prisma.customer.findFirst({
        where: { cus_category: cashCategory.cus_cat_id }
      });
    }
    const cashAccountId = cashAccount ? cashAccount.cus_id : 1;
    console.log(`ℹ️  Using Cash Account ID: ${cashAccountId}`);

    // Create temporary supplier
    tempSupplier = await prisma.customer.create({
      data: {
        cus_name: `Temp Supplier ${Date.now()}`,
        cus_phone_no: '03001234567',
        cus_address: 'Test Supplier Location',
        cus_category: cat.cus_cat_id,
        cus_type: type ? type.cus_type_id : null,
        cus_balance: 0
      }
    });

    console.log(`ℹ️  Created temporary supplier: ${tempSupplier.cus_name} (ID: ${tempSupplier.cus_id})`);
    console.log(`ℹ️  Initial balance: ${tempSupplier.cus_balance}`);

    const initialBalance = parseFloat(tempSupplier.cus_balance || 0);

    // Find a store and a product
    const store = await prisma.store.findFirst();
    const product = await prisma.product.findFirst();

    if (!store || !product) {
      console.error('❌ Store or Product not found in DB (required for purchase test)');
      return process.exit(1);
    }

    const testAmount = 11700;
    const testPayment = 5000;
    const invoiceNumber = `TEST-PUR-${Date.now()}`;

    // 1. Create purchase via API
    console.log(`\n1. Creating purchase of ${testAmount} for supplier...`);
    const purchasePayload = {
      cus_id: tempSupplier.cus_id,
      store_id: store.storeid,
      total_amount: testAmount,
      unloading_amount: 0,
      fare_amount: 0,
      transport_amount: 0,
      labour_amount: 0,
      discount: 0,
      payment: 0,
      payment_type: 'CASH',
      cash_payment: 0,
      bank_payment: 0,
      invoice_number: invoiceNumber,
      purchase_details: [
        {
          pro_id: product.pro_id,
          qnty: 1,
          unit: 'pcs',
          unit_rate: testAmount,
          total_amount: testAmount
        }
      ],
      updated_by: userId
    };

    const purRes = await fetch('http://localhost:3005/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchasePayload)
    });

    if (!purRes.ok) {
      const err = await purRes.text();
      console.error('❌ API /api/purchases returned error:', purRes.status, err);
      return process.exit(1);
    }

    const createdPurchase = await purRes.json();
    const purId = createdPurchase.pur_id;
    console.log(`✅ Purchase created successfully (ID: ${purId})`);

    // Verify purchase ledger entry
    const purchaseLedgers = await prisma.ledger.findMany({
      where: { bill_no: String(purId), cus_id: tempSupplier.cus_id }
    });

    console.log(`   Found ${purchaseLedgers.length} ledger entry/entries for purchase:`);
    for (const entry of purchaseLedgers) {
      console.log(`   - Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount}, Opening: ${entry.opening_balance}, Closing: ${entry.closing_balance}, Details: "${entry.details}"`);
    }

    if (purchaseLedgers.length !== 1) {
      console.error(`❌ Expected exactly 1 ledger entry, found ${purchaseLedgers.length}`);
      return process.exit(1);
    }

    const purEntry = purchaseLedgers[0];
    if (parseFloat(purEntry.debit_amount) !== testAmount || parseFloat(purEntry.credit_amount) !== 0) {
      console.error(`❌ Purchase ledger debit/credit is incorrect. Expected Debit: ${testAmount}, Credit: 0`);
      return process.exit(1);
    }

    // Verify supplier balance in DB
    const supplierAfterPur = await prisma.customer.findUnique({
      where: { cus_id: tempSupplier.cus_id }
    });
    console.log(`✅ Supplier balance in DB after purchase: ${supplierAfterPur.cus_balance}`);
    const expectedBalanceAfterPur = initialBalance - testAmount;
    if (Math.abs(parseFloat(supplierAfterPur.cus_balance) - expectedBalanceAfterPur) > 0.01) {
      console.error(`❌ Balance mismatch! Expected ${expectedBalanceAfterPur}, got ${supplierAfterPur.cus_balance}`);
      return process.exit(1);
    }

    // 2. Create payment via API
    console.log(`\n2. Creating payment of ${testPayment} for supplier...`);
    const paymentPayload = {
      payment_date: new Date().toISOString(),
      payment_type: 'PAY',
      account_id: tempSupplier.cus_id,
      total_amount: testPayment,
      discount_amount: 0,
      cash_account_id: cashAccountId,
      cash_amount: testPayment,
      bank_account_id: null,
      bank_amount: 0,
      description: `Test payment of ${testPayment}`,
      created_by: userId
    };

    const payRes = await fetch('http://localhost:3005/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentPayload)
    });

    if (!payRes.ok) {
      const err = await payRes.text();
      console.error('❌ API /api/payments returned error:', payRes.status, err);
      return process.exit(1);
    }

    const createdPayment = await payRes.json();
    const payId = createdPayment.payment_id;
    console.log(`✅ Payment created successfully (ID: ${payId})`);

    // Verify payment ledger entry
    const paymentLedgers = await prisma.ledger.findMany({
      where: { bill_no: `PAY-${payId}`, cus_id: tempSupplier.cus_id }
    });

    console.log(`   Found ${paymentLedgers.length} ledger entry/entries for payment:`);
    for (const entry of paymentLedgers) {
      console.log(`   - Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount}, Opening: ${entry.opening_balance}, Closing: ${entry.closing_balance}, Details: "${entry.details}"`);
    }

    if (paymentLedgers.length !== 1) {
      console.error(`❌ Expected exactly 1 ledger entry, found ${paymentLedgers.length}`);
      return process.exit(1);
    }

    const payEntry = paymentLedgers[0];
    if (parseFloat(payEntry.debit_amount) !== 0 || parseFloat(payEntry.credit_amount) !== testPayment) {
      console.error(`❌ Payment ledger debit/credit is incorrect. Expected Debit: 0, Credit: ${testPayment}`);
      return process.exit(1);
    }

    // Verify supplier final balance in DB
    const supplierAfterPay = await prisma.customer.findUnique({
      where: { cus_id: tempSupplier.cus_id }
    });
    console.log(`✅ Supplier balance in DB after payment: ${supplierAfterPay.cus_balance}`);
    const expectedFinalBalance = initialBalance - testAmount + testPayment;
    if (Math.abs(parseFloat(supplierAfterPay.cus_balance) - expectedFinalBalance) > 0.01) {
      console.error(`❌ Final balance mismatch! Expected ${expectedFinalBalance}, got ${supplierAfterPay.cus_balance}`);
      return process.exit(1);
    }

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
    console.log('Supplier purchases are correctly DEBITED and supplier payments are correctly CREDITED.');
    
    // Cleanup transactions for our temp customer to keep DB clean
    console.log('\nCleaning up database entries...');
    await prisma.ledger.deleteMany({ where: { cus_id: tempSupplier.cus_id } });
    await prisma.purchaseDetail.deleteMany({ where: { pur_id: purId } });
    await prisma.purchase.delete({ where: { pur_id: purId } });
    await prisma.paymentDetail.deleteMany({ where: { payment_id: payId } });
    await prisma.payment.delete({ where: { payment_id: payId } });
    await prisma.customer.delete({ where: { cus_id: tempSupplier.cus_id } });
    console.log('Cleanup finished.');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    if (tempSupplier) {
      try {
        console.log('Error cleanup...');
        await prisma.ledger.deleteMany({ where: { cus_id: tempSupplier.cus_id } });
        await prisma.customer.delete({ where: { cus_id: tempSupplier.cus_id } });
      } catch (cleanupErr) {
        console.warn('Cleanup failed:', cleanupErr.message);
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
