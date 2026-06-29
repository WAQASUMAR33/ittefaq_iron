import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  console.log('=== Vercel-side Cash/Bank columns alignment by type ===');
  const results = [];

  try {
    // 1. Fetch cash/bank categories
    const cashBankCats = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });
    const cashBankCatIds = cashBankCats.map(c => c.cus_cat_id);

    // 2. Fetch all Cash/Bank accounts
    const accounts = await prisma.customer.findMany({
      where: { cus_category: { in: cashBankCatIds } }
    });

    results.push(`Found ${accounts.length} Cash/Bank accounts.`);
    const affectedCusIds = new Set();
    accounts.forEach(a => affectedCusIds.add(a.cus_id));

    let updatedCount = 0;

    for (const account of accounts) {
      const entries = await prisma.ledger.findMany({
        where: { cus_id: account.cus_id }
      });

      for (const entry of entries) {
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);
        const amount = Math.max(debit, credit);
        if (amount <= 0) continue;

        const type = (entry.ledger_type || '').toLowerCase();
        const isDebit = ['sale', 'receiving', 'order', 'purchase return', 'receipt'].includes(type);

        const targetDebit = isDebit ? amount : 0;
        const targetCredit = isDebit ? 0 : amount;
        const targetTrnxType = isDebit ? 'DEBIT' : 'CREDIT';

        if (
          Math.abs(debit - targetDebit) > 0.01 ||
          Math.abs(credit - targetCredit) > 0.01 ||
          entry.trnx_type !== targetTrnxType
        ) {
          await prisma.ledger.update({
            where: { l_id: entry.l_id },
            data: {
              debit_amount: targetDebit,
              credit_amount: targetCredit,
              trnx_type: targetTrnxType
            }
          });
          updatedCount++;
        }
      }
    }

    results.push(`Aligned ${updatedCount} Cash/Bank ledger entries in the database.`);

    // 3. Recalculate balances
    for (const cusId of affectedCusIds) {
      const account = await prisma.customer.findUnique({
        where: { cus_id: cusId }
      });
      if (!account) continue;

      const entries = await prisma.ledger.findMany({
        where: { cus_id: cusId },
        orderBy: [
          { created_at: 'asc' },
          { l_id: 'asc' }
        ]
      });

      if (entries.length === 0) continue;

      let runningBalance = parseFloat(entries[0].opening_balance || 0);
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
        where: { cus_id: cusId },
        data: { cus_balance: Number(runningBalance.toFixed(2)) }
      });

      results.push(`Recalculated account ${account.cus_name} (ID: ${cusId}). Updated entries: ${balanceUpdateCount}. Final: ${runningBalance.toFixed(2)}`);
    }

    return NextResponse.json({ success: true, logs: results });
  } catch (error) {
    console.error('Alignment API error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: results }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
