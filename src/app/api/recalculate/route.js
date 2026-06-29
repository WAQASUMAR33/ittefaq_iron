import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const entries = await prisma.ledger.findMany({
      where: { l_id: { in: [1585, 1588] } }
    });
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
