const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 5;

interface RateRecord {
  count: number;
  expiresAt: number;
}

const rateStore = new Map<string, RateRecord>();

export function checkRateLimit(ip: string, options?: { limit?: number; windowMs?: number }): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const limit = options?.limit ?? MAX_REQUESTS;
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const entry = rateStore.get(ip);

  if (!entry || entry.expiresAt <= now) {
    rateStore.set(ip, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.expiresAt };
  }

  entry.count += 1;
  rateStore.set(ip, entry);

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.expiresAt };
}
