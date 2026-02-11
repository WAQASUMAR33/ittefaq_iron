#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🧪 CORRECTED API TEST for Labour Charges\n');
  
  try {
    // Get real data
    const customer = await prisma.customer.findFirst();
    const store = await prisma.store.findFirst();
    const product = await prisma.product.findFirst();
    
    if (!customer || !store || !product) {
      console.log('❌ Missing test data (customer, store, or product)');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`📌 Test Data:`);
    console.log(`   Customer: ${customer.cus_name} (ID: ${customer.cus_id})`);
    console.log(`   Store: ${store.store_name} (ID: ${store.storeid})`);
    console.log(`   Product: ${product.pro_name} (ID: ${product.pro_id})\n`);
    
    // Create test payload with REAL product ID
    const testPayload = {
      cus_id: customer.cus_id,
      store_id: store.storeid,
      total_amount: 5000,
      discount: 500,
      payment: 3000,
      payment_type: 'CASH',
      cash_payment: 3000,
      bank_payment: 0,
      advance_payment: 0,
      labour_charges: 750,  // ← TEST VALUE: Should be saved
      shipping_amount: 500,
      bill_type: 'ORDER',
      reference: `TEST-LABOUR-${Date.now()}`,
      sale_details: [
        {
          pro_id: product.pro_id,  // ← REAL product ID
          qnty: 10,
          unit: product.unit_type || 'PCS',
          unit_rate: 450,
          total_amount: 4500,
          discount: 0,
          cus_id: customer.cus_id
        }
      ],
      split_payments: [],
      updated_by: 1
    };
    
    console.log('📤 Sending test order payload:');
    console.log(`   labour_charges: 750 ✓`);
    console.log(`   total_amount: 5000`);
    console.log(`   payment: 3000\n`);
    
    // Make API call
    const response = await fetch('http://localhost:3000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.log(`❌ API Error (${response.status}): ${error.error}`);
      await prisma.$disconnect();
      return;
    }
    
    const result = await response.json();
    console.log(`✅ Order created - Sale ID: ${result.sale_id}\n`);
    
    // Query the saved order
    await new Promise(r => setTimeout(r, 100)); // Small delay to ensure write
    
    const savedOrder = await prisma.sale.findUnique({
      where: { sale_id: result.sale_id }
    });
    
    if (!savedOrder) {
      console.log('❌ Order not found in database!');
      await prisma.$disconnect();
      return;
    }
    
    console.log('📊 Saved Order Data:');
    console.log(`   Sale ID: ${savedOrder.sale_id}`);
    console.log(`   labour_charges: ${savedOrder.labour_charges}`);
    console.log(`   total_amount: ${savedOrder.total_amount}`);
    console.log(`   shipping_amount: ${savedOrder.shipping_amount}`);
    console.log(`   discount: ${savedOrder.discount}\n`);
    
    // THE KEY CHECK
    const labourValue = parseFloat(savedOrder.labour_charges);
    if (labourValue === 750) {
      console.log('✅ SUCCESS! Labour charges saved correctly (750)');
    } else {
      console.log(`❌ FAILED! Expected labour_charges=750 but got ${labourValue}`);
      console.log('\n   This means:');
      console.log('   - Frontend not sending labour_charges in JSON');
      console.log('   - OR backend not parsing labour_charges correctly');
      console.log('   - OR browser caching prevents labour field from being populated');
    }
    
  } catch (err) {
    console.error('❌ Test Error:', err.message);
  }
  
  await prisma.$disconnect();
  process.exit(0);
})();
