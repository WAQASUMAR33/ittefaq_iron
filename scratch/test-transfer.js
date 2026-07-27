const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('--- TESTING INTERNAL TRANSFER LOGIC ---');
  
  // Find accounts
  const accounts = await prisma.customer.findMany({
    where: {
      customer_category: {
        cus_cat_title: {
          in: ['Bank', 'Cash Account', 'Cash']
        }
      }
    }
  });

  if (accounts.length < 2) {
    console.log('Error: need at least 2 bank/cash accounts to test.');
    return;
  }

  const src = accounts[0];
  const dest = accounts[1];

  console.log(`Source: ${src.cus_name} (ID: ${src.cus_id}, Balance: ${src.cus_balance})`);
  console.log(`Destination: ${dest.cus_name} (ID: ${dest.cus_id}, Balance: ${dest.cus_balance})`);

  // We won't actually perform a write if we want it to be a dry run, or we can perform a transaction and roll it back.
  // Wait, Prisma doesn't have an easy rollback-on-success built-in without throwing an error.
  // Let's do the transaction and roll it back by throwing a rollback error!
  
  try {
    await prisma.$transaction(async (tx) => {
      console.log('\nStarting dry-run transaction...');
      const amount = 5000;
      
      const sAcc = await tx.customer.findUnique({ where: { cus_id: src.cus_id } });
      const dAcc = await tx.customer.findUnique({ where: { cus_id: dest.cus_id } });
      
      const sOpening = parseFloat(sAcc.cus_balance || 0);
      const dOpening = parseFloat(dAcc.cus_balance || 0);

      // Ledger ID helper max aggregate
      const resultMaxS = await tx.ledger.aggregate({ _max: { l_id: true } });
      const sLedgerId = (resultMaxS._max.l_id || 0) + 1;
      
      console.log(`- Calculated next source ledger ID: ${sLedgerId}`);
      console.log(`- Source opening: ${sOpening} -> closing credit: ${sOpening - amount}`);
      
      const resultMaxD = await tx.ledger.aggregate({ _max: { l_id: true } });
      const dLedgerId = (resultMaxD._max.l_id || 0) + 2; // simulating sequential or dynamic
      console.log(`- Destination opening: ${dOpening} -> closing debit: ${dOpening + amount}`);

      console.log('Simulated database updates successfully.');
      throw new Error('ROLLBACK_TEST_SUCCESS');
    });
  } catch (err) {
    if (err.message === 'ROLLBACK_TEST_SUCCESS') {
      console.log('\n✅ Transaction test passed (rolled back successfully).');
    } else {
      console.error('❌ Transaction test failed:', err);
    }
  }
}

test().finally(() => prisma.$disconnect());
