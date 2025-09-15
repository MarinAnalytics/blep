import dotenv from 'dotenv';
import { query, closePool } from '../src/db.js';

dotenv.config();

async function seed() {
  const countries = [
    ['US', 'United States', 5],
    ['CA', 'Canada', 3],
    ['GB', 'United Kingdom', 2],
    ['DE', 'Germany', 1]
  ];
  for (const [code, name, count] of countries) {
    await query(
      `INSERT INTO country_bleps (country_code, country_name, bleps)
       VALUES ($1,$2,$3)
       ON CONFLICT (country_code) DO UPDATE SET bleps = EXCLUDED.bleps`,
      [code, name, count]
    );
  }
  console.log('Seed complete');
}

seed().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => closePool());