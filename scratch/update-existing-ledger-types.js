const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== Updating ledger_type for existing ledger entries ===');

  try {
    const entries = await prisma.ledger.findMany({
      include: {
        customer: true
      }
    });

    console.log(`Found ${entries.length} ledger entries to check/update.`);

    let updatedCount = 0;

    for (const entry of entries) {
      let inferredType = entry.ledger_type;

      if (!inferredType) {
        const bStr = (entry.bill_no || '').toString().toUpperCase();
        const detLower = (entry.details || '').toLowerCase();
        const trnxType = entry.trnx_type;

        if (bStr.startsWith('PR-')) {
          inferredType = 'Purchase Return';
        } else if (bStr.startsWith('EXP-')) {
          inferredType = 'Expense';
        } else if (detLower.includes('package subscription')) {
          inferredType = 'Order';
        } else if (detLower.includes('sale return') || detLower.includes('refund paid out')) {
          inferredType = 'Sale Return';
        } else if (bStr.startsWith('PAY-')) {
          inferredType = detLower.includes('payment received') || detLower.includes('receive') ? 'Receiving' : 'Payment';
        } else if (bStr.startsWith('JRN-')) {
          inferredType = 'Journal';
        } else if (trnxType === 'PURCHASE') {
          inferredType = 'Purchase';
        } else if (trnxType === 'SALE') {
          inferredType = detLower.includes('order') ? 'Order' : 'Sale';
        } else if (detLower.includes('purchase')) {
          inferredType = 'Purchase';
        } else if (detLower.includes('sale') || detLower.includes('bill')) {
          inferredType = detLower.includes('order') ? 'Order' : 'Sale';
        } else if (detLower.includes('cargo') || detLower.includes('labour') || detLower.includes('delivery') || detLower.includes('fare')) {
          inferredType = 'Purchase';
        } else if (trnxType === 'ADJUSTMENT') {
          inferredType = 'Adjustment';
        } else {
          // Fallback if nothing matched
          inferredType = 'Sale'; // Default fallback
        }
      }

      // If inferred type is different, update it
      if (inferredType !== entry.ledger_type) {
        await prisma.ledger.update({
          where: { l_id: entry.l_id },
          data: { ledger_type: inferredType }
        });
        updatedCount++;
      }
    }

    console.log(`✅ Success! Updated ledger_type for ${updatedCount} entries.`);
  } catch (error) {
    console.error('Error running update script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
