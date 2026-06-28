const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const entries = await prisma.ledger.findMany({
      where: { cus_id: 2551 },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    console.log(`=== Cash Account Ledger Entries (Total: ${entries.length}) ===`);
    
    // Group entries by ledger_type and see count of debit vs credit
    const summary = {};
    for (const entry of entries) {
      const type = entry.ledger_type || 'Unknown';
      if (!summary[type]) {
        summary[type] = { debits: 0, credits: 0, zero: 0, total: 0 };
      }
      summary[type].total++;
      if (entry.debit_amount > 0) summary[type].debits++;
      else if (entry.credit_amount > 0) summary[type].credits++;
      else summary[type].zero++;
    }
    console.table(summary);

    // Let's print some examples of each type where things might be swapped
    console.log('\n=== Samples of Entries ===');
    for (const type of Object.keys(summary)) {
      console.log(`\n--- Type: ${type} ---`);
      const samples = entries.filter(e => (e.ledger_type || 'Unknown') === type).slice(0, 5);
      console.log(samples.map(e => ({
        id: e.l_id,
        bill: e.bill_no,
        trnx: e.trnx_type,
        debit: e.debit_amount,
        credit: e.credit_amount,
        open: e.opening_balance,
        close: e.closing_balance,
        details: e.details
      })));
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
