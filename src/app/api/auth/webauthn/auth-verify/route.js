import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import { popChallenge } from '@/lib/webauthn-challenges';

const prisma = new PrismaClient();

const RP_ID  = process.env.WEBAUTHN_RP_ID  || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

export async function POST(req) {
  try {
    const { userId, credential } = await req.json();
    if (!userId || !credential) return NextResponse.json({ error: 'userId and credential required' }, { status: 400 });

    const user = await prisma.users.findUnique({ where: { user_id: Number(userId) } });
    if (!user || !user.fingerprint_enrolled || !user.fingerprint_template) {
      return NextResponse.json({ error: 'No fingerprint enrolled.' }, { status: 404 });
    }

    const expectedChallenge = popChallenge(userId);
    if (!expectedChallenge) return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });

    const stored = JSON.parse(user.fingerprint_template);
    const publicKeyBytes = Buffer.from(stored.publicKey, 'base64url');

    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id:         stored.id,
        publicKey:  publicKeyBytes,
        counter:    stored.counter,
        transports: stored.transports,
      },
      requireUserVerification: true,
    });

    if (!verified) return NextResponse.json({ error: 'Fingerprint not recognized.' }, { status: 401 });

    // Update counter to prevent replay attacks
    stored.counter = authenticationInfo.newCounter;
    await prisma.users.update({
      where: { user_id: Number(userId) },
      data: { fingerprint_template: JSON.stringify(stored) },
    });

    return NextResponse.json({ success: true, userId: user.user_id, name: user.full_name });
  } catch (err) {
    console.error('webauthn auth-verify:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
