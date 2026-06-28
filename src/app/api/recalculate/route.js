import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  console.log('=== Vercel-side Cash/Bank types fix ===');
  const results = [];

  try {
    // 1. Fetch cash and bank categories
    const cashBankCategories = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });

    const categoryIds = cashBankCategories.map(c => c.cus_cat_id);
    const accounts = await prisma.customer.findMany({
      where: {
        cus_category: { in: categoryIds }
      }
    });

    results.push(`Found ${accounts.length} Cash/Bank accounts.`);

    for (const account of accounts) {
      const entries = await prisma.ledger.findMany({
        where: { cus_id: account.cus_id },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      let updatedCount = 0;
      for (const entry of entries) {
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);

        let targetLedgerType = entry.ledger_type;

        if (debit > 0) {
          targetLedgerType = 'Receiving';
        } else if (credit > 0) {
          targetLedgerType = 'Payment';
        }

        if (entry.ledger_type !== targetLedgerType) {
          await prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: { ledger_type: targetLedgerType }
          });
          entry.ledger_type = targetLedgerType;
          updatedCount++;
        }
      }

      // Recalculate balances
      let runningBalance = entries.length > 0 ? parseFloat(entries[0].opening_balance || 0) : 0;
      let balanceUpdateCount = 0;

      for (const entry of entries) {
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
        where: { cus_id: account.cus_id },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      results.push(`Account ${account.cus_name} (ID: ${account.cus_id}): updated ${updatedCount} types, ${balanceUpdateCount} balances. Final: ${runningBalance.toFixed(2)}`);
    }

    return NextResponse.json({ success: true, logs: results });
  } catch (error) {
    console.error('Recalculation API error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: results }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
