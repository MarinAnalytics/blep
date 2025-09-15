import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { query } from '../src/db.js';

// Use a transaction per test to isolate, or recreate schema quickly. Simplest: clean table before each run.

beforeAll(async () => {
  await query('DELETE FROM country_bleps');
});

// Pool closed in global teardown (omitted here to avoid race with other tests)

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('blep increment + leaderboard', () => {
  it('rejects missing country', async () => {
    const res = await request(app).post('/api/blep').send({});
    expect(res.status).toBe(400);
  });

  it('increments and returns updated row', async () => {
    const res1 = await request(app).post('/api/blep').send({ country_code: 'us', country_name: 'United States' });
    expect(res1.status).toBe(200);
    expect(res1.body.bleps).toBe(1);
    const res2 = await request(app).post('/api/blep').send({ country_code: 'US', country_name: 'United States' });
    expect(res2.body.bleps).toBe(2);
  });

  it('leaderboard returns inserted country', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('country_code');
  });

  it('supports batched count increments with cap + validation', async () => {
    // Start fresh for deterministic assertion (ignore errors if unsupported query in in-memory)
    try { await query('DELETE FROM country_bleps'); } catch {}
    const single = await request(app).post('/api/blep').send({ country_code: 'CA', country_name: 'Canada' });
    expect(single.status).toBe(200);
    expect(single.body.bleps).toBe(1);
    const batch = await request(app).post('/api/blep').send({ country_code: 'CA', country_name: 'Canada', count: 5 });
    expect(batch.status).toBe(200);
    expect(batch.body.bleps).toBe(6); // 1 + 5
    // Oversized batch should be capped at 50
    const big = await request(app).post('/api/blep').send({ country_code: 'CA', country_name: 'Canada', count: 500 });
    expect(big.status).toBe(200);
    expect(big.body.bleps).toBe(56); // 6 + 50 (cap)
  });
});
