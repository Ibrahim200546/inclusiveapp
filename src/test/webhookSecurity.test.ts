// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createHandler } from '../../supabase/functions/send-telegram-message/handler';

const secret = 'test-only-private-secret-32-characters';
const row = { id: '10000000-0000-0000-0000-000000000001', thread_key: 'thread-from-db', name: 'Stored', email: 'stored@example.invalid', message: 'Stored message' };
const event = { type: 'INSERT', schema: 'public', table: 'contact_messages', record: { id: row.id, message: 'Forged message' } };
function setup(env: Record<string, string> = {}, record: any = row) {
  const db = { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: record, error: null }) };
  const send = vi.fn().mockResolvedValue(new Response('{"result":{"message_id":1}}'));
  const settings = { CONTACT_WEBHOOK_SECRET: secret, TELEGRAM_WEBHOOK_SECRET: secret,
    SUPABASE_ANON_KEY: 'public-anon', SUPABASE_SERVICE_ROLE_KEY: 'service-role', TELEGRAM_CHAT_ID: '42', TELEGRAM_BOT_TOKEN: 'test-bot', ...env };
  return { db, send, handler: createHandler({ supabaseAdmin: db as any, fetch: send,
    env: (key) => settings[key as keyof typeof settings] }) };
}
function request(payload: unknown, headers = {}) {
  return new Request('https://test.invalid/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) });
}
describe('contact notification authentication', () => {
  it.each(['public-anon', 'service-role', 'user-session', ''])('rejects bearer %s with no DB or Telegram access', async (token) => {
    const { handler, db, send } = setup();
    expect((await handler(request(event, { Authorization: `Bearer ${token}` }))).status).toBe(401);
    expect(db.from).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
  it.each(['', 'short', 'public-anon'])('fails closed on missing or unsafe configuration', async (value) => {
    const { handler, send } = setup({ CONTACT_WEBHOOK_SECRET: value });
    expect((await handler(request(event, { 'x-webhook-secret': value }))).status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });
  it('loads the authoritative row and ignores forged notification content', async () => {
    const { handler, db, send } = setup();
    expect((await handler(request(event, { 'x-webhook-secret': secret }))).status).toBe(200);
    expect(db.eq).toHaveBeenCalledWith('id', row.id);
    const payload = JSON.parse(send.mock.calls[0][1].body);
    expect(payload.text).toContain('Stored message'); expect(payload.text).not.toContain('Forged');
    expect(payload.reply_markup.inline_keyboard[0][0].callback_data).toBe('reply_site:thread-from-db');
  });
  it.each([{ ...event, type: 'UPDATE' }, { ...event, schema: 'private' }, { ...event, table: 'profiles' }, { ...event, record: { id: 'invalid' } }])('rejects an invalid event', async (payload) => {
    const { handler, db, send } = setup();
    expect((await handler(request(payload, { Authorization: `Bearer ${secret}` }))).status).toBe(400);
    expect(db.from).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
  it('does not send a missing or unreadable row', async () => {
    const { handler, db, send } = setup({}, null);
    expect((await handler(request(event, { 'x-contact-webhook-secret': secret }))).status).toBe(404);
    db.maybeSingle.mockResolvedValue({ data: null, error: new Error('private details') });
    const result = await handler(request(event, { 'x-webhook-secret': secret }));
    expect(result.status).toBe(500); expect(await result.text()).not.toContain('private details');
    expect(send).not.toHaveBeenCalled();
  });
});
describe('Telegram webhook authentication', () => {
  const update = { update_id: 1, message: { chat: { id: 42 }, text: '/start' } };
  it('fails closed when the secret is missing', async () => {
    const { handler, send } = setup({ TELEGRAM_WEBHOOK_SECRET: '' });
    expect((await handler(request(update))).status).toBe(503); expect(send).not.toHaveBeenCalled();
  });
  it('rejects forged admin updates without the secret', async () => {
    const { handler, send, db } = setup();
    expect((await handler(request(update))).status).toBe(401);
    expect(db.from).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
  it('preserves authenticated admin messages and ignores other chats', async () => {
    const { handler, send } = setup();
    expect((await handler(request(update, { 'x-telegram-bot-api-secret-token': secret }))).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1); send.mockClear();
    await handler(request({ ...update, message: { chat: { id: 99 }, text: '/start' } }, { 'x-telegram-bot-api-secret-token': secret }));
    expect(send).not.toHaveBeenCalled();
  });
  it('rejects oversized and invalid JSON before side effects', async () => {
    const { handler, send } = setup();
    expect((await handler(request({ text: 'x'.repeat(65537) }))).status).toBe(413);
    expect((await handler(new Request('https://test.invalid', { method: 'POST', body: '{' }))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
