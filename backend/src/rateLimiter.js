// Simple in-memory IP-based fixed-window rate limiter
// Not suitable for multi-instance production without shared store.
// Options: { windowMs, max }
export function createRateLimiter({ windowMs = 60000, max = 120 } = {}) {
  const hits = new Map(); // ip -> { count, start }
  let lastPrune = Date.now();

  function prune(now) {
    for (const [ip, data] of hits.entries()) {
      if (now - data.start >= windowMs) hits.delete(ip);
    }
    lastPrune = now;
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    if (now - lastPrune > windowMs) prune(now);
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    let bucket = hits.get(ip);
    if (!bucket) {
      bucket = { count: 0, start: now };
      hits.set(ip, bucket);
    }
    // Reset window
    if (now - bucket.start >= windowMs) {
      bucket.count = 0;
      bucket.start = now;
    }
    bucket.count++;
    if (bucket.count > max) {
      const retryAfterMs = bucket.start + windowMs - now;
      res.set('Retry-After', Math.ceil(retryAfterMs / 1000));
      return res.status(429).json({ error: 'rate_limited', retry_after_ms: retryAfterMs });
    }
    next();
  };
}
