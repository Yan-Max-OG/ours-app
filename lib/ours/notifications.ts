import { equal } from './security.ts';
export function quietNow(
  start: string,
  end: string,
  timezone: string,
  now = new Date(),
) {
  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  const s = start.slice(0, 5),
    e = end.slice(0, 5);
  return s === e ? false : s < e ? hm >= s && hm < e : hm >= s || hm < e;
}
export async function notificationsJob(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    !equal(req.headers.get('authorization') ?? '', `Bearer ${secret}`)
  )
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const base = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY,
    bot = process.env.TELEGRAM_BOT_TOKEN;
  if (!base || !key || !bot)
    return Response.json({ error: 'Setup required' }, { status: 503 });
  async function db<T>(path: string, method = 'GET', body?: unknown) {
    const r = await fetch(`${base}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error('Queue unavailable');
    return (r.status === 204 ? null : await r.json()) as T;
  }
  const rows = await db<
    {
      id: string;
      user_id: string;
      couple_id: string;
      body: string;
      attempts: number;
    }[]
  >('rpc/claim_notifications', 'POST', {});
  let sent = 0;
  for (const n of rows) {
    try {
      const [prefs, members, users, recent] = await Promise.all([
        db<
          {
            notifications: boolean;
            quiet_start: string;
            quiet_end: string;
            timezone: string;
          }[]
        >(`notification_preferences?user_id=eq.${n.user_id}`),
        db<{ id: string }[]>(
          `couple_members?user_id=eq.${n.user_id}&couple_id=eq.${n.couple_id}&active=eq.true`,
        ),
        db<{ telegram_id: string }[]>(
          `users?id=eq.${n.user_id}&select=telegram_id`,
        ),
        db<{ id: string }[]>(
          `notifications?user_id=eq.${n.user_id}&sent_at=gt.${new Date(Date.now() - 1800000).toISOString()}&limit=1`,
        ),
      ]);
      const p = prefs[0];
      if (!p?.notifications || !members.length || !users[0]) {
        await db(`notifications?id=eq.${n.id}`, 'PATCH', {
          sent_at: new Date().toISOString(),
        });
        continue;
      }
      if (quietNow(p.quiet_start, p.quiet_end, p.timezone) || recent.length) {
        await db(`notifications?id=eq.${n.id}`, 'PATCH', {
          due_at: new Date(Date.now() + 1800000).toISOString(),
          locked_until: null,
          attempts: Math.max(0, n.attempts - 1),
        });
        continue;
      }
      const r = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: users[0].telegram_id,
          text: n.body,
          disable_notification: false,
        }),
      });
      const response = (await r.json()) as { ok: boolean; error_code?: number };
      if (response.ok) {
        await db(`notifications?id=eq.${n.id}`, 'PATCH', {
          sent_at: new Date().toISOString(),
          locked_until: null,
        });
        sent++;
      } else if (response.error_code === 403) {
        await db(`notification_preferences?user_id=eq.${n.user_id}`, 'PATCH', {
          notifications: false,
        });
      } else {
        await db(`notifications?id=eq.${n.id}`, 'PATCH', {
          locked_until: null,
          due_at: new Date(
            Date.now() + Math.min(3600000, 60000 * 2 ** n.attempts),
          ).toISOString(),
        });
      }
    } catch {
      /* Claim expires for safe retry; no sensitive payloads enter logs. */
    }
  }
  return Response.json({ processed: rows.length, sent });
}
