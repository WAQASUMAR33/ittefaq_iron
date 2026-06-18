const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('\n🧪 TEST: Supplier Purchase Edit Ledger Balance Recalculation');

  let tempSupplier = null;
  let purId = null;

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

    // Create temporary supplier with 0 starting balance
    tempSupplier = await prisma.customer.create({
      data: {
        cus_name: `Temp Supplier Edit ${Date.now()}`,
        cus_phone_no: '03001234567',
        cus_address: 'Test Supplier Location',
        cus_category: cat.cus_cat_id,
        cus_type: type ? type.cus_type_id : null,
        cus_balance: 0
      }
    });

    console.log(`ℹ️  Created temporary supplier: ${tempSupplier.cus_name} (ID: ${tempSupplier.cus_id})`);
    console.log(`ℹ️  Initial balance: ${tempSupplier.cus_balance}`);

    // Find a store and a product
    const store = await prisma.store.findFirst();
    const product = await prisma.product.findFirst();

    if (!store || !product) {
      console.error('❌ Store or Product not found in DB (required for purchase test)');
      return process.exit(1);
    }

    const firstAmount = 11700;
    const editedAmount = 18700;
    const invoiceNumber = `TEST-PUR-EDIT-${Date.now()}`;

    // 1. Create initial purchase via API
    console.log(`\n1. Creating purchase of ${firstAmount} for supplier...`);
    const purchasePayload = {
      cus_id: tempSupplier.cus_id,
      store_id: store.storeid,
      total_amount: firstAmount,
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
          unit_rate: firstAmount,
          total_amount: firstAmount
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
      console.error('❌ API /api/purchases POST returned error:', purRes.status, err);
      return process.exit(1);
    }

    const createdPurchase = await purRes.json();
    purId = createdPurchase.pur_id;
    console.log(`✅ Purchase created successfully (ID: ${purId})`);

    // Verify initial supplier balance in DB
    let supplier = await prisma.customer.findUnique({
      where: { cus_id: tempSupplier.cus_id }
    });
    console.log(`✅ Supplier balance in DB: ${supplier.cus_balance} (Expected: -11700)`);
    if (parseFloat(supplier.cus_balance) !== -11700) {
      console.error(`❌ Balance mismatch! Expected -11700, got ${supplier.cus_balance}`);
      return process.exit(1);
    }

    // Verify initial purchase ledger entry
    let ledgers = await prisma.ledger.findMany({
      where: { bill_no: String(purId), cus_id: tempSupplier.cus_id }
    });
    console.log(`ℹ️  Ledger entries for purchase:`);
    for (const entry of ledgers) {
      console.log(`   - Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount}, Opening: ${entry.opening_balance}, Closing: ${entry.closing_balance}`);
    }

    // 2. Edit purchase via API
    console.log(`\n2. Editing purchase to ${editedAmount} for supplier...`);
    const editPayload = {
      id: purId,
      cus_id: tempSupplier.cus_id,
      store_id: store.storeid,
      total_amount: editedAmount,
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
          unit_rate: editedAmount,
          total_amount: editedAmount
        }
      ],
      updated_by: userId
    };

    const editRes = await fetch('http://localhost:3005/api/purchases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editPayload)
    });

    if (!editRes.ok) {
      const err = await editRes.text();
      console.error('❌ API /api/purchases PUT returned error:', editRes.status, err);
      return process.exit(1);
    }

    const updatedPurchase = await editRes.json();
    console.log(`✅ Purchase updated successfully`);

    // Verify updated supplier balance in DB
    supplier = await prisma.customer.findUnique({
      where: { cus_id: tempSupplier.cus_id }
    });
    console.log(`✅ Supplier balance in DB after edit: ${supplier.cus_balance} (Expected: -18700)`);

    // Verify updated ledger entries
    ledgers = await prisma.ledger.findMany({
      where: { bill_no: String(purId), cus_id: tempSupplier.cus_id }
    });
    console.log(`ℹ️  Ledger entries for purchase after edit:`);
    for (const entry of ledgers) {
      console.log(`   - Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount}, Opening: ${entry.opening_balance}, Closing: ${entry.closing_balance}`);
    }

    if (parseFloat(supplier.cus_balance) !== -18700) {
      console.error(`❌ Final balance mismatch! Expected -18700, got ${supplier.cus_balance}`);
      return process.exit(1);
    }

    const firstEntry = ledgers[0];
    if (parseFloat(firstEntry.opening_balance) !== 0 || parseFloat(firstEntry.closing_balance) !== -18700) {
      console.error(`❌ Ledger balance chain is corrupted! Expected Opening: 0, Closing: -18700. Got Opening: ${firstEntry.opening_balance}, Closing: ${firstEntry.closing_balance}`);
      return process.exit(1);
    }

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The purchase update opening balance bug is fixed.');

    // Cleanup
    console.log('\nCleaning up database entries...');
    await prisma.ledger.deleteMany({ where: { cus_id: tempSupplier.cus_id } });
    await prisma.purchaseDetail.deleteMany({ where: { pur_id: purId } });
    await prisma.purchase.delete({ where: { pur_id: purId } });
    await prisma.customer.delete({ where: { cus_id: tempSupplier.cus_id } });
    console.log('Cleanup finished.');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    if (tempSupplier) {
      try {
        console.log('Error cleanup...');
        await prisma.ledger.deleteMany({ where: { cus_id: tempSupplier.cus_id } });
        if (purId) {
          await prisma.purchaseDetail.deleteMany({ where: { pur_id: purId } });
          await prisma.purchase.delete({ where: { pur_id: purId } }).catch(() => {});
        }
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
