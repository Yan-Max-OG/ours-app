export const questions = [
  'What’s one ordinary moment with us you’d relive?',
  'Where should we disappear to for a weekend?',
  'What little thing made you smile this week?',
  'What would you like us to learn together?',
  'What’s a memory you never want to forget?',
  'What’s your idea of a perfectly unplanned day?',
  'What did you first notice about me?',
  'Which version of our future makes you smile?',
  'What should we make more time for?',
  'What silly thing is completely our thing?',
  'If we had a whole day off tomorrow, what would we do?',
  'What makes you feel most at home with me?',
];
export const pairs = [
  ['Mountains', 'Sea'],
  ['Morning', 'Night'],
  ['Restaurant', 'Delivery'],
  ['City', 'Nature'],
  ['A plan', 'A surprise'],
  ['Movie', 'Long walk'],
];
export function dailyQuestion(date: string) {
  const index = Math.floor(Date.parse(date) / 86400000) % questions.length;
  return questions[index];
}
export function makeNight(
  budget: string,
  time: string,
  energy: string,
  weather: string,
) {
  const stay = energy === 'stay in' || weather === 'rain';
  const free = budget === 'free';
  const quiet = energy === 'quiet';
  const pool = stay
    ? [
        [
          '18:30',
          'Set the scene',
          'Phones away. Pick an album. Make something warm.',
        ],
        [
          '19:30',
          'Cook something new',
          free
            ? 'A pantry challenge: only what’s already at home.'
            : 'Choose a recipe neither of you has made.',
        ],
        [
          '21:00',
          'A film, picked together',
          'One favourite from each of you. Flip a coin.',
        ],
      ]
    : [
        [
          '18:30',
          free ? 'A homemade picnic' : 'A coffee, no rush',
          free
            ? 'Pack something simple and find a favourite bench.'
            : 'Try a place from your shared wishlist.',
        ],
        [
          '20:00',
          quiet
            ? 'The scenic route'
            : energy === 'adventure'
              ? 'Take a turn you’ve never taken'
              : 'A walk with no destination',
          'Take one photo each. See what the other noticed.',
        ],
        [
          '21:00',
          free ? 'Stars & a conversation' : 'One last little stop',
          free
            ? 'Ask each other the question of the day.'
            : budget === '₽₽₽'
              ? 'Finish with dinner somewhere special.'
              : 'Find dessert. Share two spoons.',
        ],
      ];
  return time === '1h'
    ? pool.slice(0, 1)
    : time === '3h'
      ? pool.slice(0, 2)
      : time === 'whole day'
        ? [
            [
              '11:00',
              'A very slow start',
              'Breakfast together, without a schedule.',
            ],
            ...pool,
          ]
        : pool;
}
