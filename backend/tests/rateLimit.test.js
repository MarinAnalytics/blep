import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock DB layer so we don't need a real Postgres instance for this middleware-focused test
const counters = new Map();
vi.mock('../src/db.js', () => ({
  query: vi.fn(async (sql, params) => {
    if (/INSERT INTO country_bleps/i.test(sql)) {
      const code = params[0];
      const name = params[1];
      const current = (counters.get(code) || 0) + 1;
      counters.set(code, current);
      return { rows: [{ country_code: code, country_name: name, bleps: current }] };
    }
    if (/SELECT country_code, country_name, bleps FROM country_bleps/i.test(sql)) {
      return { rows: Array.from(counters.entries()).map(([code, bleps]) => ({ country_code: code, country_name: 'Name', bleps })) };
    }
    if (/DELETE FROM country_bleps/i.test(sql)) {
      counters.clear();
      return { rows: [] };
    }
    return { rows: [] };
  })
}));

import { app, _setBlepRateLimiterForTests } from '../src/server.js';

// Configure very small window / limit for test
_setBlepRateLimiterForTests({ windowMs: 150, max: 2 });

describe('rate limiting /api/blep', () => {
  it('allows up to max requests then 429 within window, then recovers next window', async () => {
    const payload = { country_code: 'US', country_name: 'United States' };
    const r1 = await request(app).post('/api/blep').send(payload);
    expect(r1.status).toBe(200);
    const r2 = await request(app).post('/api/blep').send(payload);
    expect(r2.status).toBe(200);
    const r3 = await request(app).post('/api/blep').send(payload);
    expect(r3.status).toBe(429);
    expect(r3.body.error).toBe('rate_limited');
    // Wait for window to reset
    await new Promise(r => setTimeout(r, 170));
    const r4 = await request(app).post('/api/blep').send(payload);
    expect(r4.status).toBe(200);
  });
});
