import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Returns the stored fingerprint template for a user (used client-side by DP SDK for comparison)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = parseInt(searchParams.get('userId'));

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { fingerprint_enrolled: true, fingerprint_template: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        enrolled: user.fingerprint_enrolled,
        template: user.fingerprint_enrolled ? user.fingerprint_template : null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      },
    );
  } catch (error) {
    console.error('user-template error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}
