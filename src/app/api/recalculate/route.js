import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  console.log('=== Vercel-side swapped payments fix ===');
  const results = [];

  try {
    // 1. Find the 10 Cash/Bank ledger entries
    const cashBankEntries = await prisma.ledger.findMany({
      where: {
        details: { contains: 'payment to customer account' }
      }
    });

    results.push(`Found ${cashBankEntries.length} swapped ledger entries to correct.`);
    const affectedCusIds = new Set();

    for (const cashEntry of cashBankEntries) {
      const billNo = cashEntry.bill_no;
      const match = billNo.match(/^PAY-(\d+)$/i);
      if (!match) continue;

      const paymentId = parseInt(match[1]);
      
      // A. Update the parent payment type in payments table to 'PAY'
      await prisma.payment.update({
        where: { payment_id: paymentId },
        data: { payment_type: 'PAY' }
      });

      // B. Fetch all ledger entries under this bill_no
      const allEntries = await prisma.ledger.findMany({
        where: { bill_no: billNo }
      });

      for (const entry of allEntries) {
        affectedCusIds.add(entry.cus_id);
        const debit = parseFloat(entry.debit_amount || 0);
        const credit = parseFloat(entry.credit_amount || 0);
        const amount = Math.max(debit, credit);

        let targetDebit = 0;
        let targetCredit = 0;
        let targetTrnxType = '';

        if (debit > 0) {
          targetDebit = 0;
          targetCredit = amount;
          targetTrnxType = 'CREDIT';
        } else {
          targetDebit = amount;
          targetCredit = 0;
          targetTrnxType = 'DEBIT';
        }

        await prisma.ledger.update({
          where: { l_id: entry.l_id },
          data: {
            debit_amount: targetDebit,
            credit_amount: targetCredit,
            trnx_type: targetTrnxType,
            ledger_type: 'Payment'
          }
        });
      }
      results.push(`Corrected transaction ${billNo} (Payment ID: ${paymentId})`);
    }

    // 2. Recalculate balances for all affected customer/cash accounts
    for (const cusId of affectedCusIds) {
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

      results.push(`Recalculated account ${account.cus_name} (ID: ${cusId}). Balance: ${runningBalance.toFixed(2)}`);
    }

    return NextResponse.json({ success: true, logs: results });
  } catch (error) {
    console.error('Recalculation API error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: results }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
