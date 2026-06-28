const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateLedgerBalances(cus_id) {
  const customer = await prisma.customer.findUnique({
    where: { cus_id },
    include: { customer_category: true }
  });
  if (!customer) return;

  const categoryTitle = (customer.customer_category?.cus_cat_title || '').toLowerCase();

  const entries = await prisma.ledger.findMany({
    where: { cus_id },
    orderBy: [
      { created_at: 'asc' },
      { l_id: 'asc' }
    ]
  });

  // Re-sort in JS: created_at ASC → bill_no (numeric) ASC → l_id ASC
  entries.sort((a, b) => {
    const timeDiff = a.created_at.getTime() - b.created_at.getTime();
    if (timeDiff !== 0) return timeDiff;
    const billA = parseInt(a.bill_no) || 0;
    const billB = parseInt(b.bill_no) || 0;
    if (billA !== billB) return billA - billB;
    return a.l_id - b.l_id;
  });

  let runningBalance = 0;
  const updates = [];
  if (entries.length > 0) {
    runningBalance = parseFloat(entries[0].opening_balance || 0);
    
    for (const entry of entries) {
      const opening = runningBalance;
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      
      let change = 0;
      if (categoryTitle.includes('cash') || categoryTitle.includes('bank')) {
        if (entry.trnx_type === 'DEBIT') {
          change = debit - credit;
        } else {
          change = credit - debit;
        }
      } else if (
        categoryTitle.includes('supplier') ||
        categoryTitle.includes('labour') ||
        categoryTitle.includes('transport') ||
        categoryTitle.includes('delivery')
      ) {
        change = debit - credit; // Swap: debit adds, credit deducts
      } else {
        change = credit - debit; // Default: credit adds, debit deducts
      }
      const closing = opening + change;

      if (
        Math.abs(parseFloat(entry.opening_balance) - opening) > 0.01 ||
        Math.abs(parseFloat(entry.closing_balance) - closing) > 0.01
      ) {
        updates.push(
          prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: {
              opening_balance: Number(opening.toFixed(2)),
              closing_balance: Number(closing.toFixed(2))
            }
          })
        );
      }
      runningBalance = closing;
    }
  }

  if (updates.length > 0) {
    console.log(`⚡ Updating ${updates.length} ledger entries for ${customer.cus_name} (ID: ${cus_id})...`);
    for (const updatePromise of updates) {
      await updatePromise;
    }
  }

  await prisma.customer.update({
    where: { cus_id },
    data: { cus_balance: Number(runningBalance.toFixed(2)) }
  });
  console.log(`📊 Recalculated ledger for ${customer.cus_name} (ID: ${cus_id}). Final balance: ${runningBalance.toFixed(2)}`);
}

async function main() {
  try {
    const customers = await prisma.customer.findMany({
      select: { cus_id: true, cus_name: true }
    });

    console.log(`Starting recalculation for ${customers.length} accounts...`);
    for (const c of customers) {
      await recalculateLedgerBalances(c.cus_id);
    }
    console.log('✅ Recalculation complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
