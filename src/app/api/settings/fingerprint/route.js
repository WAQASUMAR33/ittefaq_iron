import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Save enrolled fingerprint template for a user
export async function POST(request) {
  try {
    const { userId, template } = await request.json();

    if (!userId || !template) {
      return NextResponse.json({ error: 'userId and template required' }, { status: 400 });
    }

    if (typeof template !== 'string' || template.length < 20) {
      return NextResponse.json({ error: 'Invalid fingerprint template' }, { status: 400 });
    }

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        fingerprint_template: template,
        fingerprint_enrolled: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('fingerprint enroll error:', error);
    return NextResponse.json({ error: 'Failed to save fingerprint' }, { status: 500 });
  }
}

// Remove fingerprint for a user
export async function DELETE(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        fingerprint_template: null,
        fingerprint_enrolled: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('fingerprint delete error:', error);
    return NextResponse.json({ error: 'Failed to remove fingerprint' }, { status: 500 });
  }
}
