/**
 * Simple Database Account Check
 * This script checks what accounts exist in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkAccounts() {
    const output = [];

    try {
        output.push('='.repeat(80));
        output.push('DATABASE ACCOUNT CHECK');
        output.push('='.repeat(80));
        output.push('');

        // Check customer categories
        output.push('CUSTOMER CATEGORIES:');
        output.push('-'.repeat(80));
        const categories = await prisma.customerCategory.findMany();
        categories.forEach(cat => {
            output.push(`  ID: ${cat.cus_cat_id.toString().padEnd(5)} | Title: "${cat.cus_cat_title}"`);
        });
        output.push('');

        // Find special account categories
        const cashCategory = categories.find(c =>
            c.cus_cat_title.toLowerCase().includes('cash') &&
            c.cus_cat_title.toLowerCase().includes('account')
        );
        const bankCategory = categories.find(c =>
            c.cus_cat_title.toLowerCase().includes('bank') &&
            c.cus_cat_title.toLowerCase().includes('account')
        );
        const sundryDebtorsCategory = categories.find(c =>
            c.cus_cat_title.toLowerCase().includes('sundry') &&
            c.cus_cat_title.toLowerCase().includes('debtor')
        );
        const sundryCreditors Category = categories.find(c =>
            c.cus_cat_title.toLowerCase().includes('sundry') &&
            c.cus_cat_title.toLowerCase().includes('creditor')
        );

        output.push('SPECIAL ACCOUNT CATEGORIES:');
        output.push('-'.repeat(80));
        output.push(`  Cash Account Category: ${cashCategory ? `"${cashCategory.cus_cat_title}" (ID: ${cashCategory.cus_cat_id})` : 'NOT FOUND'}`);
        output.push(`  Bank Account Category: ${bankCategory ? `"${bankCategory.cus_cat_title}" (ID: ${bankCategory.cus_cat_id})` : 'NOT FOUND'}`);
        output.push(`  Sundry Debtors Category: ${sundryDebtorsCategory ? `"${sundryDebtorsCategory.cus_cat_title}" (ID: ${sundryDebtorsCategory.cus_cat_id})` : 'NOT FOUND'}`);
        output.push(`  Sundry Creditors Category: ${sundryCreditors Category ? `"${sundryCreditors Category.cus_cat_title}" (ID: ${sundryCreditors Category.cus_cat_id})` : 'NOT FOUND'}`);
    output.push('');

    // Find actual accounts
    output.push('SPECIAL ACCOUNTS:');
    output.push('-'.repeat(80));

    if (cashCategory) {
        const cashAccounts = await prisma.customer.findMany({
            where: { cus_category: cashCategory.cus_cat_id }
        });
        output.push(`  Cash Accounts (${cashAccounts.length}):`);
        cashAccounts.forEach(acc => {
            output.push(`    - ID: ${acc.cus_id.toString().padEnd(5)} | Name: "${acc.cus_name}" | Balance: ${acc.cus_balance}`);
        });
    }
    output.push('');

    if (bankCategory) {
        const bankAccounts = await prisma.customer.findMany({
            where: { cus_category: bankCategory.cus_cat_id }
        });
        output.push(`  Bank Accounts (${bankAccounts.length}):`);
        bankAccounts.forEach(acc => {
            output.push(`    - ID: ${acc.cus_id.toString().padEnd(5)} | Name: "${acc.cus_name}" | Balance: ${acc.cus_balance}`);
        });
    }
    output.push('');

    if (sundryDebtorsCategory) {
        const sundryDebtors = await prisma.customer.findMany({
            where: { cus_category: sundryDebtorsCategory.cus_cat_id }
        });
        output.push(`  Sundry Debtors Accounts (${sundryDebtors.length}):`);
        sundryDebtors.forEach(acc => {
            output.push(`    - ID: ${acc.cus_id.toString().padEnd(5)} | Name: "${acc.cus_name}" | Balance: ${acc.cus_balance}`);
        });
    }
    output.push('');

    if (sundryCreditors Category) {
        const sundryCreditors = await prisma.customer.findMany({
            where: { cus_category: sundryCreditors Category.cus_cat_id }
        });
        output.push(`  Sundry Creditors Accounts (${sundryCreditors.length}):`);
        sundryCreditors.forEach(acc => {
            output.push(`    - ID: ${acc.cus_id.toString().padEnd(5)} | Name: "${acc.cus_name}" | Balance: ${acc.cus_balance}`);
        });
    }
    output.push('');

    // Find regular customers
    const customerCategory = categories.find(c =>
        c.cus_cat_title.toLowerCase().includes('customer') &&
        !c.cus_cat_title.toLowerCase().includes('cash') &&
        !c.cus_cat_title.toLowerCase().includes('bank')
    );

    if (customerCategory) {
        const customers = await prisma.customer.findMany({
            where: { cus_category: customerCategory.cus_cat_id },
            take: 5
        });
        output.push(`  Sample Customers from "${customerCategory.cus_cat_title}" (showing first 5):`);
        customers.forEach(acc => {
            output.push(`    - ID: ${acc.cus_id.toString().padEnd(5)} | Name: "${acc.cus_name}" | Balance: ${acc.cus_balance}`);
        });
    }
    output.push('');

    output.push('='.repeat(80));
    output.push('SUMMARY:');
    output.push('='.repeat(80));
    output.push(`  Total Categories: ${categories.length}`);
    output.push(`  Cash Account: ${cashCategory ? '✅ FOUND' : '❌ NOT FOUND'}`);
    output.push(`  Bank Account: ${bankCategory ? '✅ FOUND' : '❌ NOT FOUND'}`);
    output.push(`  Sundry Debtors: ${sundryDebtorsCategory ? '✅ FOUND' : '❌ NOT FOUND'}`);
    output.push(`  Sundry Creditors: ${sundryCreditors Category ? '✅ FOUND' : '❌ NOT FOUND'} `);
    output.push('='.repeat(80));
    
  } catch (error) {
    output.push('');
    output.push('ERROR: ' + error.message);
    output.push(error.stack);
  } finally {
    await prisma.$disconnect();
  }
  
  const result = output.join('\n');
  console.log(result);
  fs.writeFileSync('test-results.txt', result);
  console.log('\n✅ Results written to test-results.txt');
}

checkAccounts();
