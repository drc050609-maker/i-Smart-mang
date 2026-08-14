/**
 * Applies the monthly_student_summaries migration using DATABASE_URL / SUPABASE_DB_URL.
 *
 * Usage (from ismart-management):
 *   DATABASE_URL='postgresql://postgres:YOUR_DB_PASSWORD@db.onrzxcblokamfrqltuyd.supabase.co:5432/postgres' \
 *     node --env-file=.env.local scripts/apply-monthly-summaries-migration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(
  __dirname,
  '../supabase/migrations/20260808120000_add_monthly_student_summaries.sql',
);

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.error(
    'Missing DATABASE_URL. Get it from Supabase → Project Settings → Database → Connection string (URI).',
  );
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(sql);
await client.end();
console.log('Applied monthly_student_summaries migration.');
