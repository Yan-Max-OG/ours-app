import {
  day,
  defaults,
  emptyEntries,
  photos,
  type Entry,
  type Kind,
  type Space,
} from './types';
export function seed(): Space {
  const s: Space = {
    user: { id: 'yan', first_name: 'Yan' },
    members: [
      { id: 'yan', first_name: 'Yan' },
      { id: 'sofia', first_name: 'Sofia' },
    ],
    couple: {
      id: 'demo',
      name: 'Yan & Sofia',
      start_date: day(-827),
      theme: 'SAGE',
    },
    preferences: { ...defaults },
    entries: emptyEntries(),
  };
  let n = 0;
  const add = (k: Kind, title: string, extra: Partial<Entry> = {}) =>
    s.entries[k].push({
      id: `seed-${++n}`,
      couple_id: 'demo',
      creator_id: 'yan',
      title,
      body: '',
      category: 'for us',
      status: 'open',
      assigned_to: null,
      date: null,
      unlock_at: null,
      image: null,
      private: false,
      details: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...extra,
    });
  add('events', 'Paris', {
    date: day(18),
    image: photos.paris,
    category: 'travel',
    body: 'You, me, and a window seat. A week with no wrong turns.',
    details: { time: '10:30', end_date: day(24) },
  });
  add('events', 'Our anniversary', {
    date: day(43),
    category: 'anniversary',
    body: 'Another year of choosing us.',
  });
  add('events', 'Friday, just us', {
    date: day(3),
    category: 'date',
    details: { time: '20:00' },
  });
  add('tasks', 'Book that little restaurant', {
    date: day(),
    assigned_to: 'yan',
    category: 'date night',
    body: 'A table by the window, if we can.',
    details: {
      priority: 'normal',
      checklist: [
        { text: 'Choose a restaurant', done: true },
        { text: 'Book for two', done: false },
      ],
    },
  });
  add('tasks', 'Pick up something for dinner', {
    date: day(),
    assigned_to: 'sofia',
    category: 'home',
  });
  add('tasks', 'Make our Paris playlist', {
    date: day(3),
    category: 'travel',
    assigned_to: 'both',
  });
  add('tasks', 'Find a film for a rainy Sunday', { category: 'someday' });
  add('tasks', 'Order the photo prints', {
    status: 'completed',
    date: day(-1),
    category: 'memories',
    details: { completed_at: new Date().toISOString() },
  });
  add('gratitudes', 'The ordinary days', {
    creator_id: 'sofia',
    body: 'Thank you for making ordinary days feel like this. For the coffee you leave on my desk, and knowing when I need a long walk. I notice all of it.',
    details: { reaction: '' },
  });
  add('places', 'A slow morning here', {
    image: photos.cafe,
    category: 'coffee',
    body: 'Two flat whites. Absolutely no rush.',
    details: {
      budget: '₽',
      time: '1h',
      energy: 'quiet',
      address: 'Our neighbourhood',
    },
  });
  add('places', 'Somewhere in Cinque Terre', {
    image: photos.coast,
    category: 'travel',
    body: 'That summer we keep talking about.',
    details: { budget: '₽₽₽', time: 'whole day', energy: 'adventure' },
  });
  add('places', 'Paris, with you', {
    image: photos.paris,
    category: 'travel',
    details: { budget: '₽₽₽', time: 'whole day', energy: 'adventure' },
  });
  add('memories', 'Salt in our hair', {
    image: photos.coast,
    date: day(-365),
    body: 'We missed the last train. Stayed for the sunset. Would do it all again.',
    details: { location: 'Manarola, Italy' },
  });
  add('memories', 'Our favourite kind of nothing', {
    image: photos.cafe,
    date: day(-24),
    body: 'Sunday coffee turned into a four-hour conversation.',
    details: { location: 'Around the corner' },
  });
  add('mood_entries', 'calm', {
    date: day(),
    details: { battery: 78, note: 'Happy to be home.' },
  });
  add('mood_entries', 'tired', {
    creator_id: 'sofia',
    date: day(),
    details: { battery: 32, note: 'A quiet evening would be lovely.' },
  });
  add('rituals', 'Sunday breakfast', {
    category: 'weekly',
    details: { weekday: 0, completed_dates: [day(-7), day(-14)] },
  });
  add('rituals', 'No phones, just us', {
    category: 'weekly',
    details: { weekday: 5, completed_dates: [] },
  });
  add('bucket_items', 'Get a little lost in Japan', {
    image: photos.paris,
    category: 'travel',
  });
  add('bucket_items', 'Learn to make proper pasta', { category: 'together' });
  add('bucket_items', 'A road trip with no itinerary', {
    image: photos.coast,
    category: 'travel',
  });
  add('goals', 'Japan, 2027', {
    category: 'money',
    details: { current: 64000, target: 100000, unit: '₽' },
  });
  add('goals', 'Read twelve books together', {
    category: 'numeric',
    details: { current: 4, target: 12, unit: 'books' },
  });
  add('time_capsules', 'For our future selves', {
    unlock_at: new Date(Date.now() + 103 * 86400000).toISOString(),
    body: 'Remember how excited we were about everything still ahead of us?',
    assigned_to: 'sofia',
  });
  add('wishlist_items', 'A weekend by the sea', {
    image: photos.coast,
    body: 'A little place with a balcony.',
  });
  add('shopping_items', 'Молоко и хлеб', { category: 'магазин', assigned_to: 'both' });
  add('shopping_items', 'Новые свечи для дома', { category: 'желания', image: photos.cafe });
  return s;
}
