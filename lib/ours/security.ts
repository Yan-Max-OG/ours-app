const enc = new TextEncoder();
export async function hmac(key: Uint8Array, message: string) {
  const k = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', k, enc.encode(message)),
  );
}
export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export async function digest(value: string) {
  return hex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))),
  );
}
export function equal(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export async function validateTelegram(
  raw: string,
  botToken: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (!raw || raw.length > 16000)
    throw new Error('Missing Telegram authorization');
  const params = new URLSearchParams(raw);
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (seen.has(key)) throw new Error('Duplicate field');
    seen.add(key);
  }
  const hash = params.get('hash') ?? '';
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid signature');
  params.delete('hash');
  const data = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = await hmac(enc.encode('WebAppData'), botToken);
  const expected = hex(await hmac(secret, data));
  if (!equal(hash, expected)) throw new Error('Invalid signature');
  const date = Number(params.get('auth_date'));
  if (!Number.isInteger(date) || date > now + 30 || now - date > 3600)
    throw new Error('Expired Telegram authorization');
  const u: unknown = JSON.parse(params.get('user') ?? 'null');
  if (
    !u ||
    typeof u !== 'object' ||
    !('id' in u) ||
    !Number.isSafeInteger(u.id) ||
    Number(u.id) <= 0 ||
    !('first_name' in u) ||
    typeof u.first_name !== 'string'
  )
    throw new Error('Invalid Telegram user');
  return {
    id: String(u.id),
    first_name: u.first_name.slice(0, 100),
    photo_url:
      'photo_url' in u && typeof u.photo_url === 'string'
        ? u.photo_url
        : undefined,
    start_param: params.get('start_param') ?? undefined,
  };
}
function encode(value: string) {
  return btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function decode(value: string) {
  return atob(value.replace(/-/g, '+').replace(/_/g, '/'));
}
export async function makeSession(
  id: string,
  secret: string,
  now = Date.now(),
) {
  const payload = encode(
    JSON.stringify({ sub: id, exp: Math.floor(now / 1000) + 43200 }),
  );
  return `${payload}.${hex(await hmac(enc.encode(secret), payload))}`;
}
export async function readSession(
  value: string,
  secret: string,
  now = Date.now(),
) {
  const [payload, signature, ...rest] = value.split('.');
  if (
    !payload ||
    !signature ||
    rest.length ||
    !equal(signature, hex(await hmac(enc.encode(secret), payload)))
  )
    throw new Error('Please reopen OURS from Telegram');
  const data: unknown = JSON.parse(decode(payload));
  if (
    !data ||
    typeof data !== 'object' ||
    !('sub' in data) ||
    typeof data.sub !== 'string' ||
    !('exp' in data) ||
    typeof data.exp !== 'number' ||
    data.exp <= now / 1000
  )
    throw new Error('Session expired');
  return data.sub;
}
export const randomToken = () =>
  hex(crypto.getRandomValues(new Uint8Array(24)));
