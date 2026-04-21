import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Set or change PIN for a user
export async function POST(request) {
  try {
    const { userId, pin } = await request.json();

    if (!userId || !pin) {
      return NextResponse.json({ error: 'userId and pin required' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(String(pin))) {
      return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(String(pin), 12);

    await prisma.users.update({
      where: { user_id: userId },
      data: { pin_code: hashedPin },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('pin set error:', error);
    return NextResponse.json({ error: 'Failed to set PIN' }, { status: 500 });
  }
}

// Remove PIN for a user
export async function DELETE(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    await prisma.users.update({
      where: { user_id: userId },
      data: { pin_code: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('pin delete error:', error);
    return NextResponse.json({ error: 'Failed to remove PIN' }, { status: 500 });
  }
}
