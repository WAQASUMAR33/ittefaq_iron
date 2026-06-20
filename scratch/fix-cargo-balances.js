const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateLedgerBalances(cus_id) {
  const customer = await prisma.customer.findUnique({
    where: { cus_id },
    include: { customer_category: true }
  });
  if (!customer) return;

  const categoryTitle = (customer.customer_category?.cus_cat_title || '').toLowerCase();
  const isPayable = categoryTitle.includes('supplier') || categoryTitle.includes('creditor');
  const nature = isPayable ? 'PAYABLE' : 'RECEIVABLE';

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
      const closing = nature === 'PAYABLE'
        ? opening - debit + credit
        : opening + debit - credit;

      updates.push(
        prisma.ledger.update({
          where: { l_id: entry.l_id },
          data: {
            opening_balance: Number(opening.toFixed(2)),
            closing_balance: Number(closing.toFixed(2))
          }
        })
      );
      runningBalance = closing;
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  await prisma.customer.update({
    where: { cus_id },
    data: { cus_balance: Number(runningBalance.toFixed(2)) }
  });
  console.log(`   📊 Recalculated ledger for ${customer.cus_name} (ID: ${cus_id}). Final balance: ${runningBalance.toFixed(2)} (${updates.length} entries updated)`);
}

async function fixCargoBalances() {
  try {
    // 1. Find all entries where details contains "Out Delivery" and debit_amount > 0 and credit_amount == 0
    const wrongEntries = await prisma.ledger.findMany({
      where: {
        details: {
          contains: 'Out Delivery'
        },
        debit_amount: {
          gt: 0
        },
        credit_amount: 0
      }
    });

    console.log(`🔍 Found ${wrongEntries.length} incorrect ledger entries to fix.`);

    const affectedCusIds = new Set();

    // 2. Swaps the debit amount to credit amount, and sets trnx_type to CREDIT
    for (const entry of wrongEntries) {
      console.log(`⚡ Swapping L_ID: ${entry.l_id} | CustID: ${entry.cus_id} | Debit: ${entry.debit_amount} -> Credit: ${entry.debit_amount}`);
      
      await prisma.ledger.update({
        where: { l_id: entry.l_id },
        data: {
          credit_amount: entry.debit_amount,
          debit_amount: 0,
          trnx_type: 'CREDIT'
        }
      });

      affectedCusIds.add(entry.cus_id);
    }

    console.log(`\n🔄 Recalculating balances for affected accounts: ${Array.from(affectedCusIds).join(', ')}`);

    // 3. Recalculate balances for all affected accounts
    for (const cid of affectedCusIds) {
      await recalculateLedgerBalances(cid);
    }

    console.log('\n✅ Database migration completed successfully!');
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCargoBalances();
