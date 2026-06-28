import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0');
  const limit = parseInt(searchParams.get('limit') || '15');
  
  console.log(`=== Vercel-side balance recalculation batch: offset=${offset}, limit=${limit} ===`);
  const results = [];

  try {
    // 1. Fetch distinct cus_ids from ledger entries that start with PAY-
    const payEntries = await prisma.ledger.findMany({
      where: {
        bill_no: { startsWith: 'PAY-' }
      },
      select: { cus_id: true },
      distinct: ['cus_id']
    });

    const dirtyCusIds = payEntries.map(e => e.cus_id);
    const batchCusIds = dirtyCusIds.slice(offset, offset + limit);

    results.push(`Found total ${dirtyCusIds.length} dirty accounts. Processing batch of ${batchCusIds.length} (range: ${offset} to ${offset + limit}).`);

    // 2. Fetch cash and bank categories to check accounts
    const cashBankCats = await prisma.customerCategory.findMany({
      where: {
        OR: [
          { cus_cat_title: { contains: 'cash' } },
          { cus_cat_title: { contains: 'bank' } }
        ]
      }
    });
    const cashBankCatIds = cashBankCats.map(c => c.cus_cat_id);

    // 3. For each customer in this batch, recalculate balances
    for (const cusId of batchCusIds) {
      const account = await prisma.customer.findUnique({
        where: { cus_id: cusId },
        include: { customer_category: true }
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

      const categoryTitle = (account.customer_category?.cus_cat_title || '').toLowerCase();
      const isCashBank = categoryTitle.includes('cash') || categoryTitle.includes('bank');
      const isSupplier = categoryTitle.includes('supplier') || categoryTitle.includes('labour') || categoryTitle.includes('transport') || categoryTitle.includes('delivery');

      let runningBalance = parseFloat(entries[0].opening_balance || 0);
      let balanceUpdateCount = 0;

      for (const entry of entries) {
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

      results.push(`Processed ${account.cus_name} (ID: ${cusId}). Entries updated: ${balanceUpdateCount}. New balance: ${runningBalance.toFixed(2)}`);
    }

    const hasMore = offset + limit < dirtyCusIds.length;
    return NextResponse.json({ success: true, hasMore, nextOffset: offset + limit, totalDirty: dirtyCusIds.length, logs: results });
  } catch (error) {
    console.error('Recalculation API error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: results }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
