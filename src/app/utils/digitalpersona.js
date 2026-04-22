'use client';

// Fingerprint capture using official @digitalpersona/devices SDK.
// Requires DigitalPersona Lite Client to be installed and running on the PC.
// Download: https://www.hidglobal.com/drivers

let _reader = null;

export async function createReader() {
  if (typeof window === 'undefined') throw new Error('Browser only');
  // Variable-based import prevents Turbopack from statically bundling this on the server
  const pkg = '@digitalpersona/devices';
  const { FingerprintReader, SampleFormat } = await import(/* webpackIgnore: true */ pkg);
  return { reader: new FingerprintReader(), SampleFormat };
}

// ── Enrollment: capture one sample from the scanner ───────────────────────────
// Returns a base64 sample string to store as the fingerprint template.
export function captureSample(reader, SampleFormat) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reader.stopAcquisition().catch(() => {});
      reject(new Error('Fingerprint scan timed out. Try again.'));
    }, 30000);

    reader.on('SamplesAcquired', (event) => {
      clearTimeout(timeout);
      reader.stopAcquisition().catch(() => {});
      const sample = event.samples?.[0];
      if (!sample) return reject(new Error('No sample captured. Try again.'));
      // sample may be an object with a .data field or a plain string
      const data = typeof sample === 'string' ? sample : (sample.Data || sample.data || JSON.stringify(sample));
      resolve(data);
    });

    reader.on('ErrorOccurred', (event) => {
      clearTimeout(timeout);
      reader.stopAcquisition().catch(() => {});
      reject(new Error(event.error?.message || 'Scanner error. Try again.'));
    });

    reader.startAcquisition(SampleFormat.Intermediate).catch((err) => {
      clearTimeout(timeout);
      reject(new Error(err?.message || 'Could not start scanner. Is the DigitalPersona service running?'));
    });
  });
}

// ── Verification: capture + compare against stored template ──────────────────
// Returns { matched: boolean }
export async function captureAndVerify(reader, SampleFormat, storedTemplate) {
  const liveSample = await captureSample(reader, SampleFormat);

  const res = await fetch('/api/auth/fp-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ liveSample, storedTemplate }),
  });

  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error || 'Verification failed');
  }

  const { matched } = await res.json();
  return { matched, liveSample };
}
