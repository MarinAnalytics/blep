import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

let pool = null;
let inMemory = null;

if (connectionString) {
  pool = new Pool({ connectionString, max: 10 });
  console.log('Using real Postgres connection');
} else {
  console.warn('DATABASE_URL not set; using in-memory mock store for country_bleps (non-persistent)');
  // Very small in-memory table substitute
  inMemory = {
    table: new Map(), // code -> { country_code, country_name, bleps }
  };
}

export async function query(text, params = []) {
  if (pool) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log('executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  }
  // In-memory emulation (support limited subset used by app/tests)
  const sql = text.trim();
  // DELETE FROM country_bleps
  if (/^DELETE FROM country_bleps/i.test(sql)) {
    inMemory.table.clear();
    return { rows: [], rowCount: 0 };
  }
  // INSERT INTO country_bleps ... ON CONFLICT (country_code) DO UPDATE SET bleps = country_bleps.bleps + 1 RETURNING ...
  if (/^INSERT INTO country_bleps/i.test(sql)) {
    const code = params[0].toUpperCase();
    const name = params[1];
    const existing = inMemory.table.get(code);
    if (existing) {
      existing.bleps += 1;
      return { rows: [existing], rowCount: 1 };
    } else {
      const row = { country_code: code, country_name: name, bleps: 1 };
      inMemory.table.set(code, row);
      return { rows: [row], rowCount: 1 };
    }
  }
  // SELECT leaderboard
  if (/^SELECT country_code, country_name, bleps FROM country_bleps/i.test(sql)) {
    const rows = Array.from(inMemory.table.values())
      .sort((a,b) => b.bleps - a.bleps)
      .slice(0, 50);
    return { rows, rowCount: rows.length };
  }
  // Any other query not implemented
  throw new Error('In-memory DB mock received unsupported query: ' + sql);
}

export async function closePool() {
  if (pool) await pool.end();
}

export { pool };
