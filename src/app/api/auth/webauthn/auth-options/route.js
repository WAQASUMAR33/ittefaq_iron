import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import { setChallenge } from '@/lib/webauthn-challenges';

const prisma = new PrismaClient();

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';

export async function POST(req) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await prisma.users.findUnique({ where: { user_id: Number(userId) } });
    if (!user || !user.fingerprint_enrolled || !user.fingerprint_template) {
      return NextResponse.json({ error: 'No fingerprint enrolled for this user.' }, { status: 404 });
    }

    const stored = JSON.parse(user.fingerprint_template);

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'required',
      allowCredentials: [{ id: stored.id, type: 'public-key', transports: stored.transports }],
      timeout: 60000,
    });

    setChallenge(userId, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('webauthn auth-options:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
