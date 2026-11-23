// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const id = '10000000-0000-0000-0000-000000000001';
const other = '20000000-0000-0000-0000-000000000002';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  // Supabase's auth schema and API roles, isolated from all external services.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
  `);
  for (const file of ['20260423_core_schema.sql', '20260424_contact_reply_flow.sql', '20260425_contact_message_rls.sql', '20260510_allow_admin_profile_role.sql', '20261029_api_and_profile_security.sql']) {
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8').replace(/create extension if not exists pgcrypto;/g, '');
    await db.exec(sql);
  }
  await db.exec(`
    grant select, insert, update, delete on public.profiles to anon, authenticated, service_role;
    insert into auth.users values ('${id}', 'test@example.invalid', '{"role":"admin"}'), ('${other}', 'other@example.invalid', '{}');
  `);
}, 30000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate public.ai_request_quotas; update public.profiles set role = 'user';
    set request.jwt.claim.sub = '${id}';`);
});
async function asUser() { await db.exec('set role authenticated'); }
async function consume(endpoint = 'ai-chat') {
  return db.query('select public.consume_ai_quota($1, $2) as result', [id, endpoint]);
}
describe('profile role protection in PostgreSQL', () => {
  it('does not trust signup metadata', async () => {
    const result = await db.query<{ role: string }>('select role from public.profiles where id = $1', [id]);
    expect(result.rows[0].role).toBe('user');
  });
  it.each(['admin', 'teacher', 'parent', 'student', null])('blocks user role change to %s', async (role) => {
    await asUser();
    await expect(db.query('update public.profiles set role = $1 where id = $2', [role, id])).rejects.toMatchObject({ code: '42501' });
  });
  it('preserves ordinary profile updates, including profiles with an existing admin role', async () => {
    await db.exec(`set role service_role; update public.profiles set role = 'admin' where id = '${id}'`);
    await asUser();
    await db.query('update public.profiles set full_name = $1, avatar_url = $2 where id = $3', ['Updated', 'avatar.png', id]);
    const result = await db.query<{ role: string; full_name: string }>('select role, full_name from public.profiles where id = $1', [id]);
    expect(result.rows[0]).toEqual({ role: 'admin', full_name: 'Updated' });
  });
  it('blocks privileged inserts and upserts, but permits normal profile creation', async () => {
    await db.query('delete from public.profiles where id = $1', [id]);
    await asUser();
    await expect(db.query("insert into public.profiles (id, role) values ($1, 'admin')", [id])).rejects.toMatchObject({ code: '42501' });
    await db.query('insert into public.profiles (id, full_name) values ($1, $2)', [id, 'Normal']);
    await expect(db.query("insert into public.profiles (id, role) values ($1, 'admin') on conflict (id) do update set role = excluded.role", [id])).rejects.toMatchObject({ code: '42501' });
  });
  it('retains ownership RLS and does not trust a spoofed role claim', async () => {
    await asUser();
    await db.exec("set request.jwt.claim.role = 'service_role'");
    await expect(db.query("update public.profiles set role = 'admin' where id = $1", [id])).rejects.toMatchObject({ code: '42501' });
    const result = await db.query('update public.profiles set full_name = $1 where id = $2 returning id', ['Stolen', other]);
    expect(result.rows).toHaveLength(0);
  });
});
describe('durable AI quotas in PostgreSQL', () => {
  it('only allows the private service role to call the RPC or access counters', async () => {
    await asUser();
    await expect(consume()).rejects.toMatchObject({ code: '42501' });
    await expect(db.exec('select * from public.ai_request_quotas')).rejects.toMatchObject({ code: '42501' });
    await db.exec('set role anon');
    await expect(consume()).rejects.toMatchObject({ code: '42501' });
  });
  it('allows exactly the per-minute budget and rolls back rejected global increments', async () => {
    await db.exec('set role service_role');
    const requests = await Promise.allSettled(Array.from({ length: 25 }, () => consume()));
    expect(requests.filter((result) => result.status === 'fulfilled')).toHaveLength(20);
    for (const result of requests.filter((result) => result.status === 'rejected')) {
      expect((result as PromiseRejectedResult).reason.code).toBe('PT429');
    }
    await db.exec('reset role');
    const counters = await db.query<{ day_count: number }>('select day_count from public.ai_request_quotas');
    expect(counters.rows.map((row) => row.day_count)).toEqual([20, 20]);
  });
  it('enforces a daily budget across minute resets and resets the next day', async () => {
    await db.exec('set role service_role'); await consume(); await db.exec('reset role');
    await db.query("update public.ai_request_quotas set minute_start = now() - interval '1 hour', day_count = 200 where subject = $1", [id]);
    await db.exec('set role service_role');
    await expect(consume()).rejects.toMatchObject({ code: 'PT429' });
    await db.exec("reset role; update public.ai_request_quotas set day_start = now() - interval '2 days'; set role service_role");
    await expect(consume()).resolves.toBeDefined();
  });
  it('enforces the global budget across accounts and endpoints', async () => {
    await db.exec('set role service_role'); await consume(); await db.exec('reset role');
    await db.exec("update public.ai_request_quotas set day_count = 10000 where subject = 'global'; set role service_role");
    await expect(db.query("select public.consume_ai_quota($1, 'tts')", [other])).rejects.toMatchObject({ code: 'PT429' });
  });
  it('separates endpoint quotas and rejects unknown endpoints/accounts', async () => {
    await db.exec('set role service_role');
    await consume('tts'); await consume('ai-evaluate');
    await expect(consume('unknown')).rejects.toMatchObject({ code: '22023' });
    await expect(db.query("select public.consume_ai_quota(null, 'tts')")).rejects.toMatchObject({ code: '22023' });
  });
});
