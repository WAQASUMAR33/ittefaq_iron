import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  console.log('=== Vercel-side Cash Account Receiving to Debit correction ===');
  const results = [];

  try {
    const entries = await prisma.ledger.findMany({
      where: {
        cus_id: 2551,
        ledger_type: 'Receiving'
      }
    });

    results.push(`Found ${entries.length} "Receiving" entries in Cash Account.`);
    let updatedCount = 0;

    for (const entry of entries) {
      const debit = parseFloat(entry.debit_amount || 0);
      const credit = parseFloat(entry.credit_amount || 0);
      const amount = Math.max(debit, credit);

      if (credit > 0 || debit === 0) {
        await prisma.ledger.update({
          where: { l_id: entry.l_id },
          data: {
            debit_amount: amount,
            credit_amount: 0,
            trnx_type: 'DEBIT'
          }
        });
        updatedCount++;
      }
    }

    results.push(`Updated ${updatedCount} entries to DEBIT in the database.`);

    // Recalculate balances
    const remainingEntries = await prisma.ledger.findMany({
      where: { cus_id: 2551 },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    if (remainingEntries.length > 0) {
      let runningBalance = parseFloat(remainingEntries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const entry of remainingEntries) {
        const opening = runningBalance;
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        const change = debit - credit;
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
        where: { cus_id: 2551 },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      results.push(`Recalculated Cash Account: updated ${balanceUpdateCount} entries. Final balance: ${runningBalance.toFixed(2)}`);
    }

    return NextResponse.json({ success: true, logs: results });
  } catch (error) {
    console.error('Receiving correction API error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: results }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
