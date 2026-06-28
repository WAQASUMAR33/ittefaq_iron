import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  console.log('=== Vercel-side entry 1092 swap and recalculation ===');
  const results = [];
  const targetId = 1092;

  try {
    const entry = await prisma.ledger.findUnique({
      where: { l_id: targetId }
    });

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }

    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);
    const amount = Math.max(debit, credit);

    let targetDebit = 0;
    let targetCredit = 0;
    let targetTrnxType = '';
    let targetLedgerType = entry.ledger_type;

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

    results.push(`Successfully swapped entry ${targetId} to ${targetTrnxType}.`);

    // Recalculate balances
    const account = await prisma.customer.findUnique({
      where: { cus_id: entry.cus_id },
      include: { customer_category: true }
    });

    if (account) {
      const remainingEntries = await prisma.ledger.findMany({
        where: { cus_id: entry.cus_id },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const ent of remainingEntries) {
        const opening = runningBalance;
        const deb = parseFloat(ent.debit_amount || 0);
        const cred = parseFloat(ent.credit_amount || 0);

        const change = deb - cred; // Asset rule
        const closing = opening + change;

        if (
          Math.abs(parseFloat(ent.opening_balance) - opening) > 0.01 ||
          Math.abs(parseFloat(ent.closing_balance) - closing) > 0.01
        ) {
          await prisma.ledger.update({
            where: { l_id: ent.l_id },
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
        where: { cus_id: entry.cus_id },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      results.push(`Recalculated account ${account.cus_name} (ID: ${entry.cus_id}): updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    return NextResponse.json({ success: true, logs: results });
  } catch (error) {
    console.error('Swap/Recalculation API error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: results }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
