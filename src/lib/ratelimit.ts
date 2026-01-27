// Simple in-memory rate limiter for static builds
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(ip: string): Promise<{ success: boolean }> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 50;

  const record = rateLimitStore.get(ip);

  if (!record || record.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (record.count >= maxRequests) {
    return { success: false };
  }

  record.count++;
  return { success: true };
}
