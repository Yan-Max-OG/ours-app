import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  visibleEntry,
  mayEdit,
  validateEntry,
} from '../lib/ours/permissions.ts';
import { makeNight, dailyQuestion } from '../lib/ours/experiences.ts';
import { quietNow } from '../lib/ours/notifications.ts';
import type { Entry } from '../lib/ours/types.ts';
const row: Entry = {
  id: 'entry',
  couple_id: 'couple-a',
  creator_id: 'yan',
  title: 'A secret',
  body: 'Secret body',
  category: 'daily',
  status: 'completed',
  assigned_to: 'sofia',
  date: '2026-09-08',
  unlock_at: null,
  image: 'https://example.com/private.jpg',
  private: false,
  details: { answers: ['Sea'], secret: 'hidden' },
  created_at: '',
  updated_at: '',
};
test('sealed capsule hides every payload channel from recipient', () => {
  const capsule = { ...row, unlock_at: '2099-01-01T00:00:00Z' };
  const v = visibleEntry('time_capsules', capsule, 'sofia', [capsule])!;
  assert.equal(v.body, '');
  assert.equal(v.image, null);
  assert.deepEqual(v.details, { locked: true });
  assert.notEqual(v.title, row.title);
});
test('capsule unlock uses server clock at exact boundary', () => {
  const unlock = Date.parse('2026-09-08T10:00:00Z');
  const capsule = { ...row, unlock_at: new Date(unlock).toISOString() };
  assert.equal(
    visibleEntry('time_capsules', capsule, 'sofia', [capsule], unlock - 1)
      ?.body,
    '',
  );
  assert.equal(
    visibleEntry('time_capsules', capsule, 'sofia', [capsule], unlock)?.body,
    row.body,
  );
});
test('private wishes cannot be read by partner', () => {
  assert.equal(
    visibleEntry('wishlist_items', { ...row, private: true }, 'sofia', [row]),
    null,
  );
  assert.ok(
    visibleEntry('wishlist_items', { ...row, private: true }, 'yan', [row]),
  );
});
test('surprises hide name, image, details and body until unlock', () => {
  const v = visibleEntry(
    'events',
    { ...row, unlock_at: '2099-01-01T00:00:00Z' },
    'sofia',
    [row],
  )!;
  assert.equal(v.title, 'Surprise');
  assert.equal(v.body, '');
  assert.equal(v.image, null);
  assert.deepEqual(v.details, { locked: true });
});
test('question answers reveal only for same question/day after own completed answer', () => {
  assert.equal(visibleEntry('question_answers', row, 'sofia', [row])?.body, '');
  const own = { ...row, id: 'own', creator_id: 'sofia' };
  assert.equal(
    visibleEntry('question_answers', row, 'sofia', [row, own])?.body,
    row.body,
  );
  for (const wrong of [
    { ...own, date: '2026-09-07' },
    { ...own, category: 'other' },
    { ...own, status: 'open' },
  ])
    assert.equal(
      visibleEntry('question_answers', row, 'sofia', [row, wrong])?.body,
      '',
    );
});
test('mood privacy handles always, private, and mutual daily checkin', () => {
  assert.equal(visibleEntry('mood_entries', row, 'sofia', [row]), null);
  assert.ok(
    visibleEntry(
      'mood_entries',
      { ...row, details: { visibility: 'always' } },
      'sofia',
      [row],
    ),
  );
  assert.equal(
    visibleEntry(
      'mood_entries',
      { ...row, details: { visibility: 'private' } },
      'sofia',
      [row, { ...row, creator_id: 'sofia' }],
    ),
    null,
  );
  assert.ok(
    visibleEntry('mood_entries', row, 'sofia', [
      row,
      { ...row, creator_id: 'sofia' },
    ]),
  );
});
test('partner may complete shared task but never edit gratitude or private wishes', () => {
  assert.equal(mayEdit('tasks', row, 'sofia'), true);
  assert.equal(mayEdit('gratitudes', row, 'sofia'), false);
  assert.equal(mayEdit('tasks', { ...row, private: true }, 'sofia'), false);
});
test('task writes strip caller identity and couple overrides', () => {
  const v = validateEntry({
    ...row,
    couple_id: 'victim',
    creator_id: 'victim',
    id: 'victim',
  });
  assert.equal('couple_id' in v, false);
  assert.equal('creator_id' in v, false);
  assert.equal('id' in v, false);
  assert.equal(v.title, row.title);
});
test('task validation rejects empty titles, excessive notes, invalid dates', () => {
  for (const v of [
    { title: '' },
    { title: 'A', body: 'x'.repeat(10001) },
    { title: 'A', unlock_at: 'never' },
    { title: 'A', date: 'no' },
  ])
    assert.throws(() => validateEntry(v));
});
test('generator honours stay-in, rain, time and free budget', () => {
  assert.equal(makeNight('free', '1h', 'stay in', 'any').length, 1);
  assert.equal(
    makeNight('free', '3h', 'adventure', 'rain')[0][1],
    'Set the scene',
  );
  assert.match(makeNight('free', 'evening', 'quiet', 'sun')[0][1], /picnic/);
  assert.equal(dailyQuestion('2026-09-08'), dailyQuestion('2026-09-08'));
});
test('quiet hours handle overnight, daytime and disabled interval', () => {
  const now = new Date('2026-09-08T20:30:00Z');
  assert.equal(quietNow('22:00', '08:00', 'Europe/Moscow', now), true);
  assert.equal(quietNow('22:00', '08:00', 'UTC', now), false);
  assert.equal(quietNow('09:00', '21:00', 'UTC', now), true);
  assert.equal(quietNow('00:00', '00:00', 'UTC', now), false);
});
