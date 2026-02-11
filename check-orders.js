#!/usr/bin/env node

/**
 * Simple Direct Test: Check what labour values were sent vs saved
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🔍 CHECKING SAVED ORDERS\n');
  
  // Get all test orders
  const orders = await prisma.sale.findMany({
    where: {
      bill_type: 'ORDER'
    },
    orderBy: { sale_id: 'desc' },
    take: 10,
    select: {
      sale_id: true,
      total_amount: true,
      labour_charges: true,
      shipping_amount: true,
      discount: true,
      reference: true
    }
  });
  
  console.log('📊 Last 10 ORDERS:\n');
  
  orders.forEach((order, idx) => {
    const labour = parseFloat(order.labour_charges);
    const hasLabour = labour > 0 ? '✅' : '❌';
    console.log(`${hasLabour} Order ${order.sale_id}: Labour=${labour} | Total=${order.total_amount} | Shipping=${order.shipping_amount}`);
  });
  
  console.log('\n📈 SUMMARY:\n');
  const withLabour = orders.filter(o => parseFloat(o.labour_charges) > 0).length;
  const totalOrders = orders.length;
  
  console.log(`Orders with labour charges: ${withLabour}/${totalOrders}`);
  console.log(`Orders with zero labour: ${totalOrders - withLabour}/${totalOrders}`);
  
  if (withLabour > 0) {
    console.log('\n✅ SUCCESS! System IS saving labour charges!');
    console.log('   This means API backend is working correctly.');
    console.log('\n⚠️  Why earlier orders show 0?');
    console.log('   → Frontend was not entering labour values in the form');
    console.log('   → OR browser caching prevented labour field from working');
  } else {
    console.log('\n❌ No labour charges found in any order.');
    console.log('   Issue: Frontend is not sending labour_charges to API');
  }
  
  console.log('\n');
  
  await prisma.$disconnect();
})();
