import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST { sid: "<windows SID hex string>" }
// Looks up the user whose fingerprint_template matches the Windows SID returned
// by WinBioIdentify, then issues a session login.
export async function POST(request) {
  try {
    const { sid, userId } = await request.json();

    let user;

    if (sid) {
      // New: SID-based lookup (WinBio identify flow)
      user = await prisma.users.findFirst({
        where: {
          fingerprint_enrolled: true,
          fingerprint_template: sid,
        },
        select: {
          user_id: true,
          full_name: true,
          email: true,
          role: true,
          status: true,
          fingerprint_enrolled: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'No account mapped to this fingerprint. Ask admin to map your fingerprint in Settings → Biometric Settings.' },
          { status: 401 },
        );
      }
    } else if (userId) {
      // Legacy path (kept for compatibility)
      user = await prisma.users.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          full_name: true,
          email: true,
          role: true,
          status: true,
          fingerprint_enrolled: true,
        },
      });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (!user.fingerprint_enrolled) return NextResponse.json({ error: 'Fingerprint not enrolled' }, { status: 401 });
    } else {
      return NextResponse.json({ error: 'sid or userId required' }, { status: 400 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 401 });
    }

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { last_logged_in: new Date() },
    });

    const { fingerprint_enrolled, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('fingerprint-login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
