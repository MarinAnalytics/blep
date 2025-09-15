import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import { createRateLimiter } from './rateLimiter.js';

dotenv.config();

export const app = express();
app.use(express.json());

const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
if (corsOrigins.length) {
  app.use(cors({ origin: corsOrigins }));
} else {
  app.use(cors());
}

// GET leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { rows } = await query('SELECT country_code, country_name, bleps FROM country_bleps ORDER BY bleps DESC LIMIT 50');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Rate limiter (IP-based) for blep endpoint
let blepRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_BLEPS || '120', 10)
});

// Test helper to override limiter config without reloading module
export function _setBlepRateLimiterForTests(opts) {
  blepRateLimiter = createRateLimiter(opts);
}

// POST increment (with rate limiting)
app.post('/api/blep', (req, res, next) => blepRateLimiter(req, res, next), async (req, res) => {
  const { country_code, country_name } = req.body || {};
  let { count } = req.body || {};
  if (!country_code || !country_name) {
    return res.status(400).json({ error: 'missing_country' });
  }
  // Basic validation / bounding of batch size (prevent abusive large increments)
  count = parseInt(count, 10);
  if (Number.isNaN(count) || count < 1) count = 1;
  if (count > 50) count = 50; // arbitrary safety cap
  try {
    const upsert = `INSERT INTO country_bleps (country_code, country_name, bleps)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (country_code)
                    DO UPDATE SET bleps = country_bleps.bleps + EXCLUDED.bleps
                    RETURNING country_code, country_name, bleps`;
    const { rows } = await query(upsert, [country_code.toUpperCase(), country_name, count]);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Health
app.get('/healthz', (req, res) => res.json({ ok: true }));

export function start(portOverride) {
  const port = portOverride || process.env.PORT || 4000;
  const server = app.listen(port, () => {
    console.log(`Backend listening on :${server.address().port}`);
  });
  return server;
}

// Start only if this file is the entrypoint (node src/server.js) and not under Vitest
if (import.meta.url === `file://${process.argv[1]}` && !process.env.VITEST_WORKER_ID) {
  start();
}
