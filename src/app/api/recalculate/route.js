import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  console.log('=== Vercel-side specific ledger swap and recalculation (toggle) ===');
  const results = [];
  const targetIds = [677, 761, 770, 1270, 1552, 1556];
  const affectedCusIds = new Set();

  try {
    const entries = await prisma.ledger.findMany({
      where: { l_id: { in: targetIds } }
    });

    results.push(`Found ${entries.length} of ${targetIds.length} target entries.`);

    for (const entry of entries) {
      affectedCusIds.add(entry.cus_id);
      
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      const amount = Math.max(debit, credit);

      let targetDebit = 0;
      let targetCredit = 0;
      let targetTrnxType = '';
      let targetLedgerType = '';

      if (debit > 0) {
        targetDebit = 0;
        targetCredit = amount;
        targetTrnxType = 'CREDIT';
        targetLedgerType = 'Payment';
      } else {
        targetDebit = amount;
        targetCredit = 0;
        targetTrnxType = 'DEBIT';
        targetLedgerType = 'Receiving';
      }

      await prisma.ledger.update({
        where: { l_id: entry.l_id },
        data: {
          debit_amount: targetDebit,
          credit_amount: targetCredit,
          trnx_type: targetTrnxType,
          ledger_type: targetLedgerType
        }
      });
      results.push(`Toggled entry ${entry.l_id} to ${targetTrnxType} (${targetLedgerType})`);
    }

    // Recalculate balances
    for (const cusId of affectedCusIds) {
      const account = await prisma.customer.findUnique({
        where: { cus_id: cusId },
        include: { customer_category: true }
      });

      if (!account) continue;

      const remainingEntries = await prisma.ledger.findMany({
        where: { cus_id: cusId },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      if (remainingEntries.length === 0) continue;

      const categoryTitle = (account.customer_category?.cus_cat_title || '').toLowerCase();
      const isCashBank = categoryTitle.includes('cash') || categoryTitle.includes('bank');
      const isSupplier = categoryTitle.includes('supplier') || categoryTitle.includes('labour') || categoryTitle.includes('transport') || categoryTitle.includes('delivery');

      let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const entry of remainingEntries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        let change = 0;
        if (isCashBank) {
          change = debit - credit;
        } else if (isSupplier) {
          change = debit - credit;
        } else {
          change = credit - debit;
        }

        const closing = opening + change;

        if (
          Math.abs(parseFloat(entry.opening_balance) - opening) > 0.01 ||
          Math.abs(parseFloat(entry.closing_balance) - closing) > 0.01
        ) {
          await prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: {
              opening_balance: Number(opening.toFixed(2)),
              closing_balance: Number(closing.toFixed(2))
            }
          });
          balanceUpdateCount++;
        }

        runningBalance = closing;
      }

      await prisma.customer.update({
        where: { cus_id: cusId },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      results.push(`Recalculated account ${account.cus_name} (ID: ${cusId}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    return NextResponse.json({ success: true, logs: results });
  } catch (error) {
    console.error('Swap/Recalculation API error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: results }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
