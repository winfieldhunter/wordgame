/**
 * In-memory rate limit by sessionId. Sliding window per minute.
 */

const windows = new Map<
  string,
  { count: number; windowStart: number }
>();

export function checkRateLimit(
  sessionId: string,
  limitPerMinute: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowMs = 60_000;
  let w = windows.get(sessionId);
  if (!w) {
    windows.set(sessionId, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (now - w.windowStart >= windowMs) {
    w = { count: 1, windowStart: now };
    windows.set(sessionId, w);
    return { allowed: true };
  }
  if (w.count >= limitPerMinute) {
    const retryAfter = Math.ceil((w.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  w.count++;
  return { allowed: true };
}
