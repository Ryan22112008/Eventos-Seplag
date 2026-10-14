type Bucket = { count: number; resetAt: number };
type RateLimitRule = { limit: number; windowMs: number };

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()) {
  if (buckets.size > 2_000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
    while (buckets.size > 2_000) buckets.delete(buckets.keys().next().value as string);
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, resetAt: now + rule.windowMs };
  }
  if (current.count >= rule.limit) return { allowed: false, remaining: 0, resetAt: current.resetAt };
  current.count += 1;
  return { allowed: true, remaining: rule.limit - current.count, resetAt: current.resetAt };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function clearRateLimitsForTests() {
  buckets.clear();
}
