const { PrismaClient } = require('@prisma/client');

// This initializes Prisma using the DATABASE_URL environment variable configured in the environment it runs on.
const prisma = new PrismaClient();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const targetLIds = [2502, 2428, 1960, 1891, 1868, 1865, 1862, 1859, 1853, 1850, 1847, 1838, 1841, 1830, 236];

  console.log('==================================================');
  console.log('Starting standalone bulk ledger swap script...');
  console.log('==================================================');

  try {
    let modifiedCount = 0;

    for (const targetLId of targetLIds) {
      const entry = await prisma.ledger.findUnique({ where: { l_id: targetLId } });

      if (!entry) {
        console.log(`  Entry ${targetLId} not found.`);
        continue;
      }

      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);

      let newDebit = 0;
      let newCredit = 0;
      let newTrnxType = 'CREDIT';
      let newLedgerType = 'Payment';

      // If it is currently DEBIT, change to CREDIT
      if (debit > 0 && credit === 0) {
        newDebit = 0;
        newCredit = debit;
        newTrnxType = 'CREDIT';
        newLedgerType = 'Payment';
      } 
      // If it is currently CREDIT, change to DEBIT
      else if (credit > 0 && debit === 0) {
        newDebit = credit;
        newCredit = 0;
        newTrnxType = 'DEBIT';
        newLedgerType = 'Receiving';
      }
      // Fallback if both or none
      else {
        newDebit = credit;
        newCredit = debit;
        newTrnxType = entry.trnx_type === 'DEBIT' ? 'CREDIT' : 'DEBIT';
        newLedgerType = newTrnxType === 'DEBIT' ? 'Receiving' : 'Payment';
      }

      await prisma.ledger.update({
        where: { l_id: targetLId },
        data: {
          debit_amount: newDebit,
          credit_amount: newCredit,
          trnx_type: newTrnxType,
          ledger_type: newLedgerType
        }
      });

      console.log(`  ✅ Entry ${targetLId} swapped: [Debit: ${debit} -> ${newDebit}] [Credit: ${credit} -> ${newCredit}] [Type: ${entry.ledger_type} -> ${newLedgerType}]`);
      modifiedCount++;
      await sleep(50); // Small delay to prevent throttling
    }

    if (modifiedCount > 0) {
      console.log('\nRecalculating balances for Cash Account (ID: 2551)...');
      
      const remainingEntries = await prisma.ledger.findMany({
        where: { cus_id: 2551 },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      if (remainingEntries.length === 0) {
        console.log('  No entries found for Cash Account.');
        return;
      }

      console.log(`  Calculating balances for ${remainingEntries.length} entries in memory...`);

      let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
      const whenOpening = [];
      const whenClosing = [];
      const idsToUpdate = [];

      for (const entry of remainingEntries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        const change = debit - credit;
        const closing = opening + change;

        whenOpening.push(`WHEN ${entry.l_id} THEN ${Number(opening.toFixed(2))}`);
        whenClosing.push(`WHEN ${entry.l_id} THEN ${Number(closing.toFixed(2))}`);
        idsToUpdate.push(entry.l_id);

        runningBalance = closing;
      }

      console.log('  Executing fast bulk SQL update...');
      const query = `
        UPDATE ledger
        SET
          opening_balance = CASE l_id
            ${whenOpening.join('\n')}
          END,
          closing_balance = CASE l_id
            ${whenClosing.join('\n')}
          END
        WHERE l_id IN (${idsToUpdate.join(',')})
      `;

      await prisma.$executeRawUnsafe(query);

      await prisma.customer.update({
        where: { cus_id: 2551 },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      console.log(`  ✅ Cash Account balance recalculation complete. Final balance: ${runningBalance.toFixed(2)}`);
    } else {
      console.log('No entries were modified. Skipping balance recalculation.');
    }

  } catch (error) {
    console.error('❌ An error occurred during script execution:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
