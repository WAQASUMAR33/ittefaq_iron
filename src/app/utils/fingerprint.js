// WebAuthn / Fingerprint utility functions

export function isFingerprintSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function isFingerprintAvailable() {
  if (!isFingerprintSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isFingerprintRegistered() {
  return !!localStorage.getItem('ib_fp_cred');
}

export async function registerFingerprint() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Itefaq Builders', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode('itefaq-user'),
        name: 'user@itefaqbuilders',
        displayName: 'Itefaq User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  });

  const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
  localStorage.setItem('ib_fp_cred', credId);
  return true;
}

export async function verifyFingerprint() {
  const credIdB64 = localStorage.getItem('ib_fp_cred');
  const options = {
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      userVerification: 'required',
      timeout: 60000,
    },
  };

  if (credIdB64) {
    const credIdBytes = Uint8Array.from(atob(credIdB64), (c) => c.charCodeAt(0));
    options.publicKey.allowCredentials = [
      { type: 'public-key', id: credIdBytes, transports: ['internal'] },
    ];
  }

  const result = await navigator.credentials.get(options);
  return !!result;
}
