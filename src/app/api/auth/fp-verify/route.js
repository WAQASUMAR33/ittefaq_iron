import { NextResponse } from 'next/server';

// Computes byte-level Jaccard similarity between two Base64 strings.
// DigitalPersona Intermediate samples are normalized feature vectors —
// two scans of the same finger on the same reader produce highly similar
// binary representations, making byte-similarity a practical matcher.
function similarity(a, b) {
  try {
    const ba = Buffer.from(a, 'base64');
    const bb = Buffer.from(b, 'base64');
    const len = Math.max(ba.length, bb.length);
    if (len === 0) return 0;

    let matching = 0;
    const shorter = ba.length <= bb.length ? ba : bb;
    const longer  = ba.length <= bb.length ? bb : ba;

    for (let i = 0; i < shorter.length; i++) {
      // Count bytes within ±10 tolerance (accounts for minor scanner variation)
      if (Math.abs(shorter[i] - longer[i]) <= 10) matching++;
    }

    return matching / len;
  } catch {
    return 0;
  }
}

const MATCH_THRESHOLD = 0.72;

export async function POST(req) {
  try {
    const { liveSample, storedTemplate } = await req.json();

    if (!liveSample || !storedTemplate) {
      return NextResponse.json({ error: 'liveSample and storedTemplate required' }, { status: 400 });
    }

    // storedTemplate may be a JSON array (multiple enrollment samples) or a single sample string
    let templates = [];
    try {
      const parsed = JSON.parse(storedTemplate);
      templates = Array.isArray(parsed) ? parsed : [storedTemplate];
    } catch {
      templates = [storedTemplate];
    }

    // Match against any stored sample — highest score wins
    let bestScore = 0;
    for (const tmpl of templates) {
      const score = similarity(liveSample, tmpl);
      if (score > bestScore) bestScore = score;
    }

    return NextResponse.json({ matched: bestScore >= MATCH_THRESHOLD, score: bestScore });
  } catch (err) {
    console.error('fp-verify error:', err);
    return NextResponse.json({ error: 'Verification error' }, { status: 500 });
  }
}
