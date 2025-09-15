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
});
