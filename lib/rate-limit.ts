type Bucket = number[];
type RateLimitCounter = {
  key: string;
  allowed: number;
  blocked: number;
  lastSeenAt: number;
};

const globalRateLimitStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, Bucket>;
  __rateLimitCounter?: Map<string, RateLimitCounter>;
};

function getStore() {
  if (!globalRateLimitStore.__rateLimitStore) {
    globalRateLimitStore.__rateLimitStore = new Map<string, Bucket>();
  }
  return globalRateLimitStore.__rateLimitStore;
}

function getCounterStore() {
  if (!globalRateLimitStore.__rateLimitCounter) {
    globalRateLimitStore.__rateLimitCounter = new Map<string, RateLimitCounter>();
  }
  return globalRateLimitStore.__rateLimitCounter;
}

function statKey(raw: string) {
  const idx = raw.indexOf(":");
  return idx === -1 ? raw : raw.slice(0, idx);
}

export function consumeRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const store = getStore();
  const counters = getCounterStore();
  const key = statKey(params.key);
  const currentCounter = counters.get(key) ?? {
    key,
    allowed: 0,
    blocked: 0,
    lastSeenAt: now,
  };

  const bucket = store.get(params.key) ?? [];
  const filtered = bucket.filter((ts) => now - ts < params.windowMs);

  if (filtered.length >= params.limit) {
    const oldest = filtered[0] ?? now;
    const retryAfterMs = params.windowMs - (now - oldest);
    store.set(params.key, filtered);
    counters.set(key, {
      ...currentCounter,
      blocked: currentCounter.blocked + 1,
      lastSeenAt: now,
    });
    return {
      allowed: false,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  filtered.push(now);
  store.set(params.key, filtered);
  counters.set(key, {
    ...currentCounter,
    allowed: currentCounter.allowed + 1,
    lastSeenAt: now,
  });
  return { allowed: true, retryAfterMs: 0 };
}

export function getRateLimitStats() {
  const counters = getCounterStore();
  return Array.from(counters.values()).sort((a, b) => {
    if (b.blocked !== a.blocked) return b.blocked - a.blocked;
    return b.lastSeenAt - a.lastSeenAt;
  });
}
