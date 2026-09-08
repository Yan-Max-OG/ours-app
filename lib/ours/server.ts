import { notificationsJob } from './notifications';
import {
  defaults,
  emptyEntries,
  kinds,
  type Entry,
  type Kind,
  type Space,
  safeUrl,
} from './types';
import {
  digest,
  makeSession,
  randomToken,
  readSession,
  validateTelegram,
} from './security';
import { mayEdit, validateEntry, visibleEntry } from './permissions';
function env() {
  const e = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bot: process.env.TELEGRAM_BOT_TOKEN,
    secret: process.env.SESSION_SECRET,
    username: process.env.TELEGRAM_BOT_USERNAME,
    origin: process.env.APP_ORIGIN,
  };
  if (!e.url || !e.key || !e.secret || !e.origin)
    throw new Error('SETUP_REQUIRED');
  return e as {
    url: string;
    key: string;
    bot: string;
    secret: string;
    username?: string;
    origin: string;
  };
}
async function db<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const e = env();
  const r = await fetch(`${e.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: e.key,
      Authorization: `Bearer ${e.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const raw = (await r
      .json()
      .catch(() => ({ message: 'Database unavailable' }))) as {
      message?: string;
    };
    throw new Error(raw.message ?? 'Database unavailable');
  }
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T);
}
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
async function rate(key: string, max = 90) {
  if (
    !(await db<boolean>('rpc/check_rate', 'POST', {
      rate_key: key,
      max_requests: max,
      window_seconds: 60,
    }))
  )
    throw new Error('Too many requests. Take a moment and try again.');
}
async function member(user: string) {
  const m = await db<{ couple_id: string }[]>(
    `couple_members?user_id=eq.${user}&active=eq.true&select=couple_id`,
  );
  return m[0]?.couple_id;
}
async function snapshot(user: string): Promise<Space> {
  const [people, prefs, cid] = await Promise.all([
    db<Space['members']>(`users?id=eq.${user}&select=id,first_name,photo_url`),
    db<Space['preferences'][]>(`notification_preferences?user_id=eq.${user}`),
    member(user),
  ]);
  if (!people[0]) throw new Error('Session expired');
  const s: Space = {
    user: people[0],
    members: people,
    couple: null,
    entries: emptyEntries(),
    preferences: { ...defaults, ...prefs[0] },
  };
  if (!cid) return s;
  const [couples, members] = await Promise.all([
    db<NonNullable<Space['couple']>[]>(`couples?id=eq.${cid}`),
    db<{ users: Space['user'] }[]>(
      `couple_members?couple_id=eq.${cid}&active=eq.true&select=users(id,first_name,photo_url)`,
    ),
  ]);
  s.couple = couples[0];
  s.members = members.map((m) => m.users);
  await Promise.all(
    kinds.map(async (k) => {
      const rows = await db<Entry[]>(
        `${k}?couple_id=eq.${cid}&order=created_at.desc&limit=2000`,
      );
      s.entries[k] = rows
        .map((r) => visibleEntry(k, r, user, rows))
        .filter((r): r is Entry => r !== null);
    }),
  );
  return s;
}
async function requireUser(req: Request) {
  const bearer = req.headers.get('authorization');
  const token =
    (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined) ??
    req.headers
      .get('cookie')
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('ours_session='))
      ?.slice(13);
  if (!token) throw new Error('Session expired. Please sign in again.');
  return readSession(token, env().secret);
}
function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
function metaTag(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return '';
}
function placeMetadata(html: string, source: string) {
  const title = metaTag(html, 'og:title') || metaTag(html, 'twitter:title') || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = metaTag(html, 'og:description') || metaTag(html, 'twitter:description') || metaTag(html, 'description');
  let image = metaTag(html, 'og:image') || metaTag(html, 'twitter:image');
  let address = '';
  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const value = node as Record<string, unknown>;
    const type = Array.isArray(value['@type']) ? value['@type'].join(' ') : String(value['@type'] ?? '');
    if (/Place|Restaurant|Museum|CafeOrCoffeeShop|LocalBusiness/i.test(type)) {
      if (!image && typeof value.image === 'string') image = value.image;
      const a = value.address;
      if (a && typeof a === 'object') {
        const addressObject = a as Record<string, unknown>;
        address = [addressObject.streetAddress, addressObject.addressLocality, addressObject.addressRegion]
          .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
          .join(', ');
      }
    }
    Object.values(value).forEach(visit);
  };
  for (const match of jsonLd) {
    try {
      visit(JSON.parse(match[1]));
    } catch {
      /* Some pages embed invalid or multiple JSON-LD fragments. */
    }
  }
  if (image) {
    try {
      image = new URL(image, source).href;
    } catch {
      image = '';
    }
  }
  return { title: title.slice(0, 200), description: description.slice(0, 1000), address: address.slice(0, 300), image: image.slice(0, 1000), source };
}
async function fetchPlaceMetadata(value: unknown) {
  const source = safeUrl(value);
  if (!source) throw new Error('Нужна корректная ссылка на сайт места');
  const parsed = new URL(source);
  if (/^(localhost|127\.|0\.0\.0\.0|::1$)/i.test(parsed.hostname) || parsed.hostname.endsWith('.local'))
    throw new Error('Эта ссылка недоступна для предпросмотра');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(source, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'OURS place preview/1.0' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Сайт не ответил. Проверьте ссылку.');
    const html = (await response.text()).slice(0, 1_500_000);
    return placeMetadata(html, source);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Сайт не ответил')) throw error;
    throw new Error('Не удалось прочитать страницу по этой ссылке');
  } finally {
    clearTimeout(timeout);
  }
}
function feedText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}
async function fetchNews() {
  const response = await fetch('https://news.google.com/rss?hl=ru&gl=RU&ceid=RU:ru', {
    headers: { Accept: 'application/rss+xml, application/xml', 'User-Agent': 'OURS news/1.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Новости временно недоступны');
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 6).map((match) => {
    const item = match[1];
    const value = (tag: string) => feedText(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] ?? '');
    return { title: value('title'), link: value('link'), source: value('source') || 'Google Новости', published_at: value('pubDate') };
  }).filter((item) => item.title && item.link);
}
function id(value: string) {
  if (!/^[0-9a-f-]{36}$/.test(value)) throw new Error('Invalid item');
  return value;
}
export async function handle(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/^\/api\/ours\/?/, '');
    if (action === 'cron' && req.method === 'POST')
      return notificationsJob(req);
    if (action === 'config')
      return json({
        configured: Boolean(
          process.env.SUPABASE_URL &&
          process.env.SESSION_SECRET &&
          process.env.SUPABASE_SERVICE_ROLE_KEY &&
          process.env.APP_ORIGIN,
        ),
      });
    const e = env();
    if (req.method !== 'GET' && req.headers.get('origin') !== e.origin)
      return json({ error: 'Request origin is not allowed' }, 403);
    if (action === 'web-auth' && req.method === 'POST') {
      await rate('web-auth:' + await digest(req.headers.get('cf-connecting-ip') ?? 'unknown'), 30);
      const body = await req.json() as { access_token?: string };
      if (typeof body.access_token !== 'string' || body.access_token.length > 16000)
        return json({ error: 'Войдите заново.' }, 401);
      const verified = await fetch(`${e.url}/auth/v1/user`, {
        headers: { apikey: e.key, Authorization: `Bearer ${body.access_token}` },
      });
      if (!verified.ok) return json({ error: 'Войдите заново.' }, 401);
      const identity = await verified.json() as { id?: string; email?: string };
      if (!identity.id || !identity.email) return json({ error: 'Не удалось проверить аккаунт.' }, 401);
      const externalId = 'web:' + id(identity.id);
      // The identity comes only from Supabase's verified /user response.
      const created = await fetch(`${e.url}/rest/v1/users?on_conflict=telegram_id`, {
        method: 'POST',
        headers: { apikey: e.key, Authorization: `Bearer ${e.key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ telegram_id: externalId, first_name: identity.email.split('@')[0].slice(0, 80) }),
      });
      if (!created.ok) throw new Error('Не удалось создать профиль.');
      const users = await db<Space['members']>(`users?telegram_id=eq.${encodeURIComponent(externalId)}&select=*`);
      if (!users[0]) throw new Error('Профиль не найден.');
      const token = await makeSession(users[0].id, e.secret);
      return json(await snapshot(users[0].id), 200, {
        'Set-Cookie': `ours_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`,
      });
    }
    if (action === 'logout' && req.method === 'POST') {
      return json({ ok: true }, 200, { 'Set-Cookie': 'ours_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
    }
    if (action === 'auth' && req.method === 'POST') {
      if (!e.bot) throw new Error('Войдите на сайте по почте.');
      await rate(
        'auth:' +
          (await digest(req.headers.get('cf-connecting-ip') ?? 'unknown')),
        30,
      );
      const b = (await req.json()) as { initData?: string };
      const tg = await validateTelegram(b.initData ?? '', e.bot);
      // Explicit upsert uses a conflict-aware REST request; never accept a client user ID.
      const r = await fetch(`${e.url}/rest/v1/users?on_conflict=telegram_id`, {
        method: 'POST',
        headers: {
          apikey: e.key,
          Authorization: `Bearer ${e.key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          telegram_id: tg.id,
          first_name: tg.first_name,
          photo_url: tg.photo_url,
        }),
      });
      if (!r.ok) throw new Error('Could not sign in');
      const u = (await r.json()) as Space['members'];
      const token = await makeSession(u[0].id, e.secret);
      const s = await snapshot(u[0].id);
      s.invite_start = tg.start_param;
      return json({ ...s, session_token: token }, 200, {
        'Set-Cookie': `ours_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`,
      });
    }
    const user = await requireUser(req);
    await rate(`user:${user}`);
    if (action === 'state' && req.method === 'GET')
      return json(await snapshot(user));
    if (action === 'export' && req.method === 'GET')
      return json(await snapshot(user), 200, {
        'Content-Disposition': 'attachment; filename="ours-export.json"',
      });
    if (action === 'invite' && req.method === 'POST') {
      await rate(`invite:${user}`, 5);
      const token = randomToken();
      await db('rpc/create_space', 'POST', {
        actor: user,
        token_hash: await digest(token),
      });
      return json({
        token,
        link: `${e.origin}/?invite=${token}`,
        expires_in: '48 hours',
      });
    }
    if (action === 'invite-preview' && req.method === 'POST') {
      const b = (await req.json()) as { token: string };
      const inv = await db<{ creator_id: string }[]>(
        `invites?token_hash=eq.${await digest(b.token)}&used_at=is.null&expires_at=gt.${new Date().toISOString()}&select=creator_id`,
      );
      if (!inv[0]) throw new Error('Invitation expired or already used');
      const u = await db<Space['members']>(
        `users?id=eq.${inv[0].creator_id}&select=first_name`,
      );
      return json({ name: u[0]?.first_name ?? 'Your person' });
    }
    if (action === 'join' && req.method === 'POST') {
      await rate(`join:${user}`, 5);
      const b = (await req.json()) as { token: string };
      if (!/^[a-f0-9]{48}$/.test(b.token))
        throw new Error('Invalid invitation');
      await db('rpc/accept_invite', 'POST', {
        actor: user,
        hashed_token: await digest(b.token),
      });
      return json(await snapshot(user));
    }
    if (action === 'preferences' && req.method === 'PATCH') {
      const b = (await req.json()) as Record<string, unknown>;
      const p = {
        user_id: user,
        notifications: b.notifications === true,
        quiet_start: /^\d{2}:\d{2}/.test(String(b.quiet_start))
          ? b.quiet_start
          : '22:00',
        quiet_end: /^\d{2}:\d{2}/.test(String(b.quiet_end))
          ? b.quiet_end
          : '08:00',
        timezone: typeof b.timezone === 'string' ? b.timezone : 'Europe/Moscow',
        mood_visibility: ['private', 'always', 'after_checkin'].includes(
          String(b.mood_visibility),
        )
          ? b.mood_visibility
          : 'after_checkin',
        reduced_motion: b.reduced_motion === true,
        xp_enabled: b.xp_enabled !== false,
        language: b.language === 'ru' ? 'ru' : 'en',
      };
      try {
        new Intl.DateTimeFormat('en', { timeZone: String(p.timezone) });
      } catch {
        throw new Error('Unknown time zone');
      }
      const r = await fetch(
        `${e.url}/rest/v1/notification_preferences?on_conflict=user_id`,
        {
          method: 'POST',
          headers: {
            apikey: e.key,
            Authorization: `Bearer ${e.key}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(p),
        },
      );
      if (!r.ok) throw new Error('Could not save preferences');
      return json({ ok: true });
    }
    if (action === 'profile' && req.method === 'PATCH') {
      const b = (await req.json()) as Record<string, unknown>;
      const first_name = typeof b.first_name === 'string' ? b.first_name.trim() : undefined;
      if (first_name !== undefined && (first_name.length < 1 || first_name.length > 80))
        throw new Error('Use a name between 1 and 80 characters');
      const photo_url = b.photo_url === null ? null : typeof b.photo_url === 'string' && /^https:\/\//.test(b.photo_url) ? b.photo_url.slice(0, 1000) : undefined;
      if (first_name === undefined && photo_url === undefined) throw new Error('Nothing to update');
      const patch: Record<string, string | null> = {};
      if (first_name !== undefined) patch.first_name = first_name;
      if (photo_url !== undefined) patch.photo_url = photo_url;
      await db(`users?id=eq.${user}`, 'PATCH', patch);
      return json({ ok: true });
    }
    if (action === 'news' && req.method === 'GET') {
      await rate(`news:${user}`, 20);
      return json({ items: await fetchNews() }, 200, { 'Cache-Control': 'public, max-age=300' });
    }
    if (action === 'place-preview' && req.method === 'POST') {
      await rate(`place-preview:${user}`, 20);
      const b = (await req.json()) as { url?: unknown };
      return json(await fetchPlaceMetadata(b.url));
    }
    if (action === 'disconnect' && req.method === 'POST') {
      await db('rpc/disconnect_space', 'POST', { actor: user });
      return json(await snapshot(user));
    }
    if (action === 'account' && req.method === 'DELETE') {
      await db('rpc/disconnect_space', 'POST', { actor: user });
      await db(`users?id=eq.${user}`, 'DELETE');
      return json({ ok: true }, 200, {
        'Set-Cookie':
          'ours_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
      });
    }
    const cid = await member(user);
    if (!cid)
      return json({ error: 'Create or join your shared space first' }, 403);
    if (action === 'couple' && req.method === 'PATCH') {
      const b = (await req.json()) as Record<string, unknown>;
      const change: Record<string, string> = {};
      if (
        typeof b.start_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(b.start_date)
      )
        change.start_date = b.start_date;
      if (['MONO', 'SAGE', 'WINE', 'ICE', 'MIDNIGHT'].includes(String(b.theme)))
        change.theme = String(b.theme);
      await db(`couples?id=eq.${cid}`, 'PATCH', change);
      return json({ ok: true });
    }
    if (action === 'upload' && req.method === 'POST') {
      await rate(`upload:${user}`, 10);
      if (Number(req.headers.get('content-length')) > 8388608)
        throw new Error('Выберите файл размером до 8 MB');
      const form = await req.formData();
      const file = form.get('file');
      if (
        !(file instanceof File) ||
        file.size > 8388608 ||
        !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type)
      )
        throw new Error('Выберите JPG, PNG, WebP, MP4 или WebM размером до 8 MB');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let good = false;
      if (file.type === 'image/jpeg') good = bytes[0] === 255 && bytes[1] === 216;
      else if (file.type === 'image/png') good = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78;
      else if (file.type === 'image/webp') good = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      else if (file.type === 'video/mp4') good = String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
      else good = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
      if (!good) throw new Error('Этот файл не поддерживается');
      const path = `${cid}/${user}/${crypto.randomUUID()}`;
      const r = await fetch(`${e.url}/storage/v1/object/ours-photos/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${e.key}`,
          apikey: e.key,
          'Content-Type': file.type,
        },
        body: bytes,
      });
      if (!r.ok) throw new Error('Photo could not be uploaded');
      return json({ path: 'storage:' + path });
    }
    if (action === 'photo' && req.method === 'GET') {
      const path = url.searchParams.get('path') ?? '';
      const available = await snapshot(user);
      const referenced = Object.values(available.entries)
        .flat()
        .some((r) => r.image === 'storage:' + path);
      if (!path.startsWith(cid + '/') || path.includes('..') || !referenced)
        return json({ error: 'Photo is private' }, 403);
      const r = await fetch(
        `${e.url}/storage/v1/object/sign/ours-photos/${path}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${e.key}`,
            apikey: e.key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: 120 }),
        },
      );
      const data = (await r.json()) as { signedURL?: string };
      if (!r.ok || !data.signedURL) throw new Error('Photo unavailable');
      return json({ url: e.url + '/storage/v1' + data.signedURL });
    }
    const [kind, itemId] = action.split('/');
    if (!kinds.includes(kind as Kind)) return json({ error: 'Not found' }, 404);
    const k = kind as Kind;
    if (req.method === 'POST' && !itemId) {
      const value = validateEntry(await req.json());
      if (k === 'mood_entries')
        value.details = {
          ...value.details,
          visibility: (await snapshot(user)).preferences.mood_visibility,
        };
      const rows = await db<Entry[]>(k, 'POST', {
        ...value,
        couple_id: cid,
        creator_id: user,
      });
      return json(rows[0], 201);
    }
    if (itemId) {
      id(itemId);
      const rows = await db<Entry[]>(
        `${k}?id=eq.${itemId}&couple_id=eq.${cid}`,
      );
      const row = rows[0];
      if (!row || (row.private && row.creator_id !== user))
        return json({ error: 'This item is not available' }, 404);
      if (req.method === 'PATCH') {
        const patch = (await req.json()) as Record<string, unknown>;
        if (
          k === 'gratitudes' &&
          row.creator_id !== user &&
          Object.keys(patch).length === 1 &&
          typeof patch.reaction === 'string'
        ) {
          if (row.unlock_at && Date.parse(row.unlock_at) > Date.now())
            return json({ error: 'Your note is still sealed' }, 403);
          await db(`${k}?id=eq.${itemId}&couple_id=eq.${cid}`, 'PATCH', {
            details: { ...row.details, reaction: patch.reaction.slice(0, 12) },
          });
        } else {
          if (!mayEdit(k, row, user))
            return json({ error: 'Only the author can change this' }, 403);
          await db(
            `${k}?id=eq.${itemId}&couple_id=eq.${cid}`,
            'PATCH',
            validateEntry({ ...row, ...patch }),
          );
        }
        return json({ ok: true });
      }
      if (req.method === 'DELETE') {
        if (row.creator_id !== user)
          return json({ error: 'Only the author can delete this' }, 403);
        await db(`${k}?id=eq.${itemId}&couple_id=eq.${cid}`, 'DELETE');
        return json({ ok: true });
      }
    }
    return json({ error: 'Not found' }, 404);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong';
    const setup = message === 'SETUP_REQUIRED';
    const auth = /signature|authorization|reopen|Session/.test(message);
    return json(
      {
        error: setup
          ? 'Общая база ещё не подключена. Завершите настройку Cloudflare.'
          : message,
      },
      setup ? 503 : auth ? 401 : /Too many/.test(message) ? 429 : 400,
    );
  }
}
