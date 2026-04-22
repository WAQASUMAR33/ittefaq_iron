'use client';

// Fingerprint capture using official @digitalpersona/devices SDK.
// Requires DigitalPersona Lite Client to be installed and running on the PC.
// Download: https://www.hidglobal.com/drivers

let _reader = null;
let _dpScriptPromise = null;

const DP_UMD_URLS = [
  'https://cdn.jsdelivr.net/npm/@digitalpersona/devices@0.2.6/dist/es5.bundles/index.umd.js',
  'https://unpkg.com/@digitalpersona/devices@0.2.6/dist/es5.bundles/index.umd.js',
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-dp-devices="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.dpDevices = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadDigitalPersonaFromUmd() {
  if (_dpScriptPromise) return _dpScriptPromise;

  _dpScriptPromise = (async () => {
    let lastError = null;
    for (const url of DP_UMD_URLS) {
      try {
        await loadScript(url);
        const devices = window?.dp?.devices;
        if (devices?.FingerprintReader && devices?.SampleFormat) return devices;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Could not load DigitalPersona browser SDK.');
  })();

  return _dpScriptPromise;
}

export async function createReader() {
  if (typeof window === 'undefined') throw new Error('Browser only');
  let FingerprintReader;
  let SampleFormat;

  try {
    ({ FingerprintReader, SampleFormat } = await import('@digitalpersona/devices'));
  } catch {
    ({ FingerprintReader, SampleFormat } = await loadDigitalPersonaFromUmd());
  }

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
