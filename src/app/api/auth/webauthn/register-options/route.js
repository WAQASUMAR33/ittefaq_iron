import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import { setChallenge } from '@/lib/webauthn-challenges';

const prisma = new PrismaClient();

const RP_ID   = process.env.WEBAUTHN_RP_ID   || 'localhost';
const RP_NAME = process.env.WEBAUTHN_RP_NAME  || 'Itefaq Builders';

export async function POST(req) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await prisma.users.findUnique({ where: { user_id: Number(userId) } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // If already enrolled, exclude that credential so browser offers a fresh registration
    let excludeCredentials = [];
    if (user.fingerprint_template) {
      try {
        const stored = JSON.parse(user.fingerprint_template);
        if (stored.id) excludeCredentials = [{ id: stored.id, type: 'public-key' }];
      } catch { /* ignore */ }
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(String(user.user_id)),
      userName: user.email,
      userDisplayName: user.full_name,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      excludeCredentials,
    });

    setChallenge(userId, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('webauthn register-options:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
