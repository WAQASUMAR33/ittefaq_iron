import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  // Simple security check using query parameter: ?secret=ittefaq786
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== 'ittefaq786') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetLIds = [2502, 2428, 1960, 1891, 1868, 1865, 1862, 1859, 1853, 1850, 1847, 1838, 1841, 1830, 236];
  const results = [];

  try {
    for (const targetLId of targetLIds) {
      const entry = await prisma.ledger.findUnique({ where: { l_id: targetLId } });
      if (!entry) {
        results.push(`Entry ${targetLId} not found`);
        continue;
      }

      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);

      let newDebit = 0;
      let newCredit = 0;
      let newTrnxType = 'CREDIT';
      let newLedgerType = 'Payment';

      if (debit > 0 && credit === 0) {
        newDebit = 0;
        newCredit = debit;
        newTrnxType = 'CREDIT';
        newLedgerType = 'Payment';
      } else if (credit > 0 && debit === 0) {
        newDebit = credit;
        newCredit = 0;
        newTrnxType = 'DEBIT';
        newLedgerType = 'Receiving';
      } else {
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

      results.push(`Entry ${targetLId} swapped successfully`);
    }

    // Recalculate Cash Account
    const remainingEntries = await prisma.ledger.findMany({
      where: { cus_id: 2551 },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    if (remainingEntries.length > 0) {
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

      results.push(`Cash Account balance recalculated. Final balance: ${runningBalance.toFixed(2)}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
