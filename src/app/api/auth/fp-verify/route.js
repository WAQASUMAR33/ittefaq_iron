import { NextResponse } from 'next/server';

function extractSampleString(input) {
  let value = input;

  // Unwrap JSON-encoded samples, e.g. "{\"Data\":\"...\"}" or "\"base64...\""
  for (let i = 0; i < 3; i++) {
    if (typeof value !== 'string') break;
    const trimmed = value.trim();
    if (!trimmed) break;
    const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"');
    if (!looksJson) break;

    try {
      value = JSON.parse(trimmed);
    } catch {
      break;
    }
  }

  if (typeof value === 'object' && value !== null) {
    value = value.Data || value.data || value.sample || value.Sample || value.text || '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

function toBase64(input) {
  const raw = extractSampleString(input);
  if (!raw) return '';

  // Convert base64url to base64 if needed
  const cleaned = raw.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = cleaned.length % 4;
  return pad ? `${cleaned}${'='.repeat(4 - pad)}` : cleaned;
}

// Computes byte-level Jaccard similarity between two Base64 strings.
// DigitalPersona Intermediate samples are normalized feature vectors —
// two scans of the same finger on the same reader produce highly similar
// binary representations, making byte-similarity a practical matcher.
function overlapScore(bufA, bufB) {
  const minLen = Math.min(bufA.length, bufB.length);
  if (!minLen) return 0;

  let matching = 0;
  for (let i = 0; i < minLen; i++) {
    // Count bytes within ±12 tolerance (stricter to reduce false accepts)
    if (Math.abs(bufA[i] - bufB[i]) <= 12) matching++;
  }

  return matching / minLen;
}

function bestShiftedOverlap(bufA, bufB) {
  if (!bufA.length || !bufB.length) return 0;
  const maxShift = 48;
  let best = 0;

  // Positive shift compares A[i] with B[i + shift], negative does opposite.
  for (let shift = -maxShift; shift <= maxShift; shift += 8) {
    const startA = shift < 0 ? -shift : 0;
    const startB = shift > 0 ? shift : 0;
    const len = Math.min(bufA.length - startA, bufB.length - startB);
    if (len <= 0) continue;

    let matching = 0;
    for (let i = 0; i < len; i++) {
      if (Math.abs(bufA[startA + i] - bufB[startB + i]) <= 12) matching++;
    }

    const score = matching / len;
    if (score > best) best = score;
  }

  return best;
}

function similarity(a, b) {
  try {
    const rawA = Buffer.from(toBase64(a), 'base64');
    const rawB = Buffer.from(toBase64(b), 'base64');
    if (!rawA.length || !rawB.length) return 0;

    // Some DP sample encodings can vary in short headers between captures.
    const viewsA = [rawA, rawA.subarray(Math.min(16, rawA.length))];
    const viewsB = [rawB, rawB.subarray(Math.min(16, rawB.length))];

    let best = 0;
    for (const va of viewsA) {
      for (const vb of viewsB) {
        const directScore = overlapScore(va, vb);
        const shiftedScore = bestShiftedOverlap(va, vb);
        const score = Math.max(directScore, shiftedScore);
        if (score > best) best = score;
      }
    }

    return best;
  } catch {
    return 0;
  }
}

const HIGH_CONFIDENCE_THRESHOLD = 0.30;
const BEST_THRESHOLD = 0.26;
const SECONDARY_THRESHOLD = 0.22;

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
      templates = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      templates = [storedTemplate];
    }

    // Match against all stored samples and use top-2 scores.
    // This makes verification more stable when one capture is noisy.
    const scores = [];
    for (const tmpl of templates) {
      const score = similarity(liveSample, tmpl);
      scores.push(score);
    }

    scores.sort((a, b) => b - a);
    const bestScore = scores[0] || 0;
    const secondScore = scores[1] || 0;
    const templateCount = scores.length;

    const matched =
      bestScore >= HIGH_CONFIDENCE_THRESHOLD ||
      (bestScore >= BEST_THRESHOLD && secondScore >= SECONDARY_THRESHOLD && templateCount >= 2);

    return NextResponse.json({ matched, score: bestScore, secondScore, templateCount });
  } catch (err) {
    console.error('fp-verify error:', err);
    return NextResponse.json({ error: 'Verification error' }, { status: 500 });
  }
}
