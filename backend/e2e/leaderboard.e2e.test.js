import { beforeAll, afterAll, test, expect } from 'vitest';
import { start } from '../src/server.js';
import { closePool } from '../src/db.js';

if (!process.env.DATABASE_URL) {
  test.skip('leaderboard e2e skipped (no DATABASE_URL set)', () => {});
} else {
  let server; let baseUrl;

  beforeAll(async () => {
    // Use random port; ensure PORT env not forcing 4000
    delete process.env.PORT;
    server = start(0);
    await new Promise(res => server.on('listening', res));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise(res => server.close(res));
    await closePool();
  });

  test('leaderboard seeded data present', async () => {
    const r = await fetch(`${baseUrl}/api/leaderboard`);
    expect(r.status).toBe(200);
    const data = await r.json();
    const us = data.find(d => d.country_code === 'US');
    expect(us).toBeTruthy();
    expect(us.bleps).toBeGreaterThanOrEqual(5);
  });

  test('increment updates leaderboard', async () => {
    const pre = await (await fetch(`${baseUrl}/api/leaderboard`)).json();
    const usBefore = pre.find(d => d.country_code === 'US').bleps;
    const inc = await fetch(`${baseUrl}/api/blep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country_code: 'US', country_name: 'United States' })
    });
    expect(inc.status).toBe(200);
    const incJson = await inc.json();
    expect(incJson.bleps).toBe(usBefore + 1);
    const post = await (await fetch(`${baseUrl}/api/leaderboard`)).json();
    const usAfter = post.find(d => d.country_code === 'US').bleps;
    expect(usAfter).toBe(usBefore + 1);
  });
}