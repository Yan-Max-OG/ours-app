export const kinds = [
  'tasks',
  'rituals',
  'gratitudes',
  'love_notes',
  'places',
  'events',
  'memories',
  'time_capsules',
  'bucket_items',
  'goals',
  'mood_entries',
  'weekly_pulses',
  'question_answers',
  'this_or_that_answers',
  'wishlist_items',
  'shopping_items',
] as const;
export type Kind = (typeof kinds)[number];
export interface Entry {
  id: string;
  couple_id: string;
  creator_id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  assigned_to: string | null;
  date: string | null;
  unlock_at: string | null;
  image: string | null;
  private: boolean;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
export interface Person {
  id: string;
  first_name: string;
  photo_url?: string;
  telegram_id?: string;
}
export interface Couple {
  id: string;
  name: string;
  start_date: string;
  theme: string;
}
export interface Preferences {
  notifications: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
  mood_visibility: string;
  reduced_motion: boolean;
  xp_enabled: boolean;
  language: string;
}
export interface Space {
  user: Person;
  members: Person[];
  couple: Couple | null;
  entries: Record<Kind, Entry[]>;
  preferences: Preferences;
  invite_start?: string;
}
export const emptyEntries = (): Record<Kind, Entry[]> =>
  Object.fromEntries(kinds.map((k) => [k, [] as Entry[]])) as Record<
    Kind,
    Entry[]
  >;
export const defaults: Preferences = {
  notifications: false,
  quiet_start: '22:00',
  quiet_end: '08:00',
  timezone: 'Europe/Moscow',
  mood_visibility: 'after_checkin',
  reduced_motion: false,
  xp_enabled: true,
  language: 'en',
};
export const photos = {
  paris:
    'https://images.unsplash.com/photo-1772413814305-281c9942aef6?auto=format&fit=crop&w=1600&q=85',
  coast:
    'https://images.unsplash.com/photo-1548671074-349a73ad5733?auto=format&fit=crop&w=1200&q=85',
  cafe: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1000&q=85',
};
export function day(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
export function daysUntil(date: string) {
  return Math.ceil(
    (new Date(date + 'T00:00:00').getTime() -
      new Date(day() + 'T00:00:00').getTime()) /
      86400000,
  );
}
export function safeUrl(value: unknown) {
  if (typeof value !== 'string') return undefined;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:'
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
