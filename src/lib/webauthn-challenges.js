// In-memory challenge store with 5-minute TTL (one-time use per userId)
const store = new Map();

export function setChallenge(userId, challenge) {
  store.set(String(userId), { challenge, expiresAt: Date.now() + 300_000 });
}

export function popChallenge(userId) {
  const key = String(userId);
  const entry = store.get(key);
  if (!entry) return null;
  store.delete(key);
  if (Date.now() > entry.expiresAt) return null;
  return entry.challenge;
}
