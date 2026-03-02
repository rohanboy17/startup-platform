type Bucket = number[];

const globalRateLimitStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, Bucket>;
};

function getStore() {
  if (!globalRateLimitStore.__rateLimitStore) {
    globalRateLimitStore.__rateLimitStore = new Map<string, Bucket>();
  }
  return globalRateLimitStore.__rateLimitStore;
}

export function consumeRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const store = getStore();
  const bucket = store.get(params.key) ?? [];
  const filtered = bucket.filter((ts) => now - ts < params.windowMs);

  if (filtered.length >= params.limit) {
    const oldest = filtered[0] ?? now;
    const retryAfterMs = params.windowMs - (now - oldest);
    store.set(params.key, filtered);
    return {
      allowed: false,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  filtered.push(now);
  store.set(params.key, filtered);
  return { allowed: true, retryAfterMs: 0 };
}
