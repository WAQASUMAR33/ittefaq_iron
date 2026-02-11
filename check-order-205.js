#!/usr/bin/env node

/**
 * Check Order 205 Database Details
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📦 ORDER 205 DATABASE CHECK');
    console.log('='.repeat(80) + '\n');

    // Query order 205
    const order = await prisma.sale.findUnique({
      where: { sale_id: 205 },
      include: {
        customer: true,
        sale_details: true
      }
    });

    if (!order) {
      console.log('❌ Order 205 NOT FOUND\n');
      process.exit(1);
    }

    console.log('✅ Order 205 FOUND\n');
    console.log('📋 Full Order Details:');
    console.log('─'.repeat(80));
    console.log(`  Sale ID:              ${order.sale_id}`);
    console.log(`  Customer:             ${order.customer.cus_name} (ID: ${order.cus_id})`);
    console.log(`  Bill Type:            ${order.bill_type}`);
    console.log(`  Total Amount:         ${order.total_amount}`);
    console.log(`  Discount:             ${order.discount}`);
    console.log(`  Payment:              ${order.payment}`);
    console.log(`  Payment Type:         ${order.payment_type}`);
    console.log(`  Cash Payment:         ${order.cash_payment}`);
    console.log(`  Bank Payment:         ${order.bank_payment}`);
    console.log(`  Bank Title:           ${order.bank_title}`);
    console.log(`  Advance Payment:      ${order.advance_payment}`);
    console.log(`  🔴 LABOUR CHARGES:    ${order.labour_charges}`);
    console.log(`  🔴 LABOUR TYPE:       ${typeof order.labour_charges}`);
    console.log(`  Shipping Amount:      ${order.shipping_amount}`);
    console.log(`  Reference:            ${order.reference}`);
    console.log(`  Created At:           ${order.created_at}`);
    console.log(`  Updated At:           ${order.updated_at}`);
    console.log('─'.repeat(80));

    console.log(`\n📊 Products in Order (${order.sale_details?.length || 0} items):`);
    if (order.sale_details?.length > 0) {
      order.sale_details.forEach((detail, idx) => {
        console.log(`  ${idx + 1}. Product ID: ${detail.pro_id}, Qty: ${detail.qnty}, Rate: ${detail.unit_rate}, Total: ${detail.total_amount}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 SUMMARY:');
    console.log('─'.repeat(80));
    console.log(`  Labour Charges in DB: ${order.labour_charges}`);
    if (order.labour_charges === 0 || order.labour_charges === null) {
      console.log(`  ⚠️  Issue: Labour charges showing as ${order.labour_charges}`);
      console.log(`  Possible causes:`);
      console.log(`    1. Order was created BEFORE labour_charges field was added to form`);
      console.log(`    2. Order was saved with 0 labour charges`);
      console.log(`    3. Frontend was not sending labour_charges value`);
    } else {
      console.log(`  ✅ Labour charges are correctly saved: ${order.labour_charges}`);
    }
    console.log('─'.repeat(80) + '\n');

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
