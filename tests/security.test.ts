import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hmac,
  hex,
  validateTelegram,
  makeSession,
  readSession,
  randomToken,
  digest,
} from '../lib/ours/security.ts';
const token = '123456789:test_bot_token_for_tests';
const now = 1800000000;
async function signed(fields: Record<string, string>) {
  const data = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = await hmac(new TextEncoder().encode('WebAppData'), token);
  return new URLSearchParams({
    ...fields,
    hash: hex(await hmac(secret, data)),
  }).toString();
}
const user = JSON.stringify({ id: 1234567890123, first_name: 'Yan' });
test('valid Telegram signature maps the verified user and start parameter', async () => {
  const raw = await signed({
    auth_date: String(now),
    user,
    start_param: 'invite_test',
  });
  assert.deepEqual(await validateTelegram(raw, token, now), {
    id: '1234567890123',
    first_name: 'Yan',
    photo_url: undefined,
    start_param: 'invite_test',
  });
});
test('HMAC rejects tampered identity', async () => {
  const raw = await signed({ auth_date: String(now), user });
  await assert.rejects(
    () => validateTelegram(raw.replace('Yan', 'Sofia'), token, now),
    /signature/,
  );
});
test('auth_date freshness rejects expired and future credentials', async () => {
  for (const date of [now - 3601, now + 31]) {
    const raw = await signed({ auth_date: String(date), user });
    await assert.rejects(() => validateTelegram(raw, token, now), /Expired/);
  }
});
test('duplicate fields are rejected before auth parsing', async () => {
  const raw = await signed({ auth_date: String(now), user });
  await assert.rejects(
    () =>
      validateTelegram(raw + '&user=' + encodeURIComponent(user), token, now),
    /Duplicate/,
  );
});
test('untrusted unsigned data never authenticates', async () => {
  await assert.rejects(
    () =>
      validateTelegram(
        new URLSearchParams({ user, auth_date: String(now) }).toString(),
        token,
        now,
      ),
    /signature/,
  );
});
test('Telegram IDs must be safe positive integers', async () => {
  for (const bad of [-1, 0, 1.2, '123']) {
    await assert.rejects(
      () =>
        signed({
          auth_date: String(now),
          user: JSON.stringify({ id: bad, first_name: 'Yan' }),
        }).then((raw) => validateTelegram(raw, token, now)),
      /user/,
    );
  }
});
test('session is authenticated, expiring and cannot be changed', async () => {
  const s = await makeSession('user-a', 'test-long-secret', now * 1000);
  assert.equal(await readSession(s, 'test-long-secret', now * 1000), 'user-a');
  await assert.rejects(() => readSession(s, 'different', now * 1000));
  await assert.rejects(() =>
    readSession(s, 'test-long-secret', (now + 43201) * 1000),
  );
  await assert.rejects(() =>
    readSession(s + '0', 'test-long-secret', now * 1000),
  );
});
test('invite tokens contain 192 bits of randomness; only digests need persistence', async () => {
  const a = randomToken(),
    b = randomToken();
  assert.match(a, /^[a-f0-9]{48}$/);
  assert.notEqual(a, b);
  assert.equal((await digest(a)).length, 64);
  assert.notEqual(await digest(a), a);
});
