import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('PostgreSQL migration, pairing, replay prevention, task CRUD and cross-couple RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated,service_role;`,
    );
    const sql = await readFile(
      new URL('../supabase/migrations/001_ours.sql', import.meta.url),
      'utf8',
    );
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
    const tables = await db.query<{ count: number }>(
      "select count(*)::int from pg_tables where schemaname='public' and rowsecurity",
    );
    assert.ok(tables.rows[0].count >= 30);
    await db.exec(
      await readFile(
        new URL('./database.integration.sql', import.meta.url),
        'utf8',
      ),
    );
  } finally {
    await db.close();
  }
});
