import type { Entry, Kind } from './types';
export function visibleEntry(
  kind: Kind,
  row: Entry,
  user: string,
  all: Entry[],
  now = Date.now(),
): Entry | null {
  if (row.private && row.creator_id !== user) return null;
  if (
    kind === 'mood_entries' &&
    row.creator_id !== user &&
    row.details.visibility === 'private'
  )
    return null;
  if (
    kind === 'mood_entries' &&
    row.creator_id !== user &&
    row.details.visibility !== 'always' &&
    !all.some((e) => e.creator_id === user && e.date === row.date)
  )
    return null;
  const paired = [
    'question_answers',
    'weekly_pulses',
    'this_or_that_answers',
  ].includes(kind);
  const answerHidden =
    paired &&
    row.creator_id !== user &&
    !all.some(
      (e) =>
        e.creator_id === user &&
        e.category === row.category &&
        e.date === row.date &&
        e.status === 'completed',
    );
  const locked = Boolean(
    row.unlock_at && new Date(row.unlock_at).getTime() > now,
  );
  if (
    answerHidden ||
    ((kind === 'time_capsules' || kind === 'gratitudes' || kind === 'events') &&
      locked &&
      row.creator_id !== user)
  ) {
    return {
      ...row,
      title:
        kind === 'events'
          ? 'Surprise'
          : kind === 'time_capsules'
            ? 'For your future self'
            : 'A little something for you',
      body: '',
      image: null,
      details: { locked: true },
      private: false,
    };
  }
  return row;
}
export function mayEdit(kind: Kind, row: Entry, user: string) {
  return (
    row.creator_id === user ||
    (['tasks', 'places', 'events', 'bucket_items', 'goals', 'rituals'].includes(
      kind,
    ) &&
      !row.private &&
      !(row.unlock_at && new Date(row.unlock_at).getTime() > Date.now()))
  );
}
export function validateEntry(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid entry');
  const v = input as Record<string, unknown>;
  if (typeof v.title !== 'string' || !v.title.trim() || v.title.length > 200)
    throw new Error('Add a title, up to 200 characters');
  if (
    v.body !== undefined &&
    (typeof v.body !== 'string' || v.body.length > 10000)
  )
    throw new Error('Note is too long');
  if (v.unlock_at && !Number.isFinite(Date.parse(String(v.unlock_at))))
    throw new Error('Choose a valid unlock date');
  if (v.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(v.date)))
    throw new Error('Choose a valid date');
  if (v.details && JSON.stringify(v.details).length > 20000)
    throw new Error('Too much detail');
  return {
    title: v.title.trim(),
    body: typeof v.body === 'string' ? v.body : '',
    category:
      typeof v.category === 'string' ? v.category.slice(0, 60) : 'for us',
    status: v.status === 'completed' ? 'completed' : 'open',
    assigned_to: typeof v.assigned_to === 'string' ? v.assigned_to : null,
    date: v.date || null,
    unlock_at: v.unlock_at || null,
    image:
      typeof v.image === 'string' && /^(https:\/\/|storage:)/.test(v.image)
        ? v.image
        : null,
    private: v.private === true,
    details:
      v.details && typeof v.details === 'object' && !Array.isArray(v.details)
        ? v.details
        : {},
  };
}
