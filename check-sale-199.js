#!/usr/bin/env node

/**
 * Check Specific Sale: What was saved in database for invoice 199?
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 CHECKING DATABASE FOR SALE ID 199');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Query the specific sale
    const sale = await prisma.sale.findUnique({
      where: { sale_id: 199 },
      include: {
        sale_details: true,
        split_payments: true
      }
    });
    
    if (!sale) {
      console.log('❌ Sale ID 199 not found in database\n');
      await prisma.$disconnect();
      return;
    }
    
    console.log('✅ FOUND SALE 199 IN DATABASE\n');
    
    console.log('📋 MAIN SALE INFORMATION:');
    console.log('─'.repeat(70));
    console.log(`  Sale ID: ${sale.sale_id}`);
    console.log(`  Customer ID: ${sale.cus_id}`);
    console.log(`  Store ID: ${sale.store_id}`);
    console.log(`  Bill Type: ${sale.bill_type}`);
    console.log(`  Reference: ${sale.reference || 'N/A'}`);
    console.log(`  Created: ${sale.created_at}`);
    
    console.log('\n💰 PAYMENT AMOUNTS:');
    console.log('─'.repeat(70));
    console.log(`  Total Amount: ${sale.total_amount}`);
    console.log(`  Discount: ${sale.discount}`);
    console.log(`  Shipping: ${sale.shipping_amount}`);
    console.log(`  Labour Charges: ${sale.labour_charges} ← THIS SHOULD NOT BE 0 IF YOU ENTERED A VALUE`);
    console.log(`  Payment Received: ${sale.payment}`);
    console.log(`  Payment Type: ${sale.payment_type}`);
    
    console.log('\n💳 SPLIT PAYMENTS:');
    console.log('─'.repeat(70));
    if (sale.split_payments && sale.split_payments.length > 0) {
      sale.split_payments.forEach((sp, idx) => {
        console.log(`  Payment ${idx + 1}:`);
        console.log(`    Amount: ${sp.amount}`);
        console.log(`    Type: ${sp.payment_type}`);
        console.log(`    Reference: ${sp.reference}`);
      });
    } else {
      console.log('  No split payments recorded');
    }
    
    console.log('\n📦 SALE DETAILS (Line Items):');
    console.log('─'.repeat(70));
    if (sale.sale_details && sale.sale_details.length > 0) {
      sale.sale_details.forEach((detail, idx) => {
        console.log(`  Item ${idx + 1}:`);
        console.log(`    Product ID: ${detail.pro_id}`);
        console.log(`    Quantity: ${detail.qnty} ${detail.unit}`);
        console.log(`    Unit Rate: ${detail.unit_rate}`);
        console.log(`    Total: ${detail.total_amount}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('💡 ANALYSIS');
    console.log('='.repeat(70) + '\n');
    
    if (sale.labour_charges === 0 || sale.labour_charges === '0') {
      console.log('❌ PROBLEM FOUND: labour_charges is 0 in database');
      console.log('\nWhy this happened:');
      console.log('1. Frontend form did NOT send labour_charges value');
      console.log('2. Backend received labour_charges as NULL or undefined');
      console.log('3. Backend defaults to 0: parseFloat(labour_charges || 0)');
      console.log('\n🔧 ROOT CAUSE:');
      console.log('   The Labour Charges field on the form was EMPTY');
      console.log('   OR the field value never reached the API payload');
      console.log('\n✅ SOLUTION:');
      console.log('   1. Check browser console logs when creating order');
      console.log('   2. Look for "Labour input changed to" message');
      console.log('   3. Check if labour value appears in "Final JSON payload"');
      console.log('   4. If not appearing, browser cached old code - restart server + hard refresh');
    } else {
      console.log(`✅ SUCCESS! labour_charges was saved: ${sale.labour_charges}`);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  }
  
  await prisma.$disconnect();
})();
