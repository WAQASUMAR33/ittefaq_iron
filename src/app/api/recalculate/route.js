import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ids = [677, 761, 770, 1270, 1552, 1556];
    const entries = await prisma.ledger.findMany({
      where: { l_id: { in: ids } }
    });

    const data = entries.map(e => ({
      l_id: e.l_id,
      details: e.details,
      debit: e.debit_amount,
      credit: e.credit_amount,
      type: e.ledger_type,
      trnx: e.trnx_type
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
