import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import { popChallenge } from '@/lib/webauthn-challenges';

const prisma = new PrismaClient();

const RP_ID  = process.env.WEBAUTHN_RP_ID  || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

export async function POST(req) {
  try {
    const { userId, credential } = await req.json();
    if (!userId || !credential) return NextResponse.json({ error: 'userId and credential required' }, { status: 400 });

    const expectedChallenge = popChallenge(userId);
    if (!expectedChallenge) return NextResponse.json({ error: 'Challenge expired or not found. Please try again.' }, { status: 400 });

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential: cred } = registrationInfo;

    // Store credential — publicKey as base64url for JSON serialisation
    const toBase64url = (buf) => Buffer.from(buf).toString('base64url');

    const template = JSON.stringify({
      id:        cred.id,
      publicKey: toBase64url(cred.publicKey),
      counter:   cred.counter,
      transports: cred.transports ?? [],
    });

    await prisma.users.update({
      where: { user_id: Number(userId) },
      data: { fingerprint_template: template, fingerprint_enrolled: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('webauthn register-verify:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
