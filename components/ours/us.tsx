'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  Orbit,
  Award,
  Heart,
  Settings,
  Lock,
  Sparkles,
  Plus,
  Check,
  Send,
} from 'lucide-react';
import { useSpace } from '@/lib/ours/store';
import { day, daysUntil, type Kind } from '@/lib/ours/types';
import { Avatar, Empty, FilterTabs, Media, PageHeading, Photo } from './primitives';
import type { Openers } from './today';
export function Us({ go }: Openers) {
  const { space } = useSpace();
  const xp = Object.values(space.entries).flat().length * 10;
  return (
    <>
      <PageHeading
        label="НАША ОБЫЧНАЯ, НЕОБЫКНОВЕННАЯ ЖИЗНЬ"
        title={
          <>
            Только <em>мы.</em>
          </>
        }
      />
      <section className="us-profile">
        <div className="big-avatars">
          {space.members.map((m) => (
            <Avatar key={m.id} id={m.id} />
          ))}
        </div>
        <h2>{space.members.map((m) => m.first_name).join(' & ')}</h2>
        <p>
          {Math.max(0, -daysUntil(space.couple?.start_date ?? day()))} дней,
          когда мы выбираем друг друга.
        </p>
        {space.preferences.xp_enabled && (
          <span className="level-pill">
            НАШЕ ПРОСТРАНСТВО · УРОВЕНЬ {Math.floor(xp / 100) + 1}
          </span>
        )}
      </section>
      <div className="us-primary-links">
        <button onClick={() => go('places')}>
          <span className="us-primary-icon"><MapPinIcon /></span>
          <span><b>Места</b><small>Куда хочется сходить вместе</small></span><ArrowUpRight />
        </button>
        <button onClick={() => go('memories')}>
          <span className="us-primary-icon"><Camera size={23} /></span>
          <span><b>Воспоминания</b><small>Моменты, которые хочется сохранить</small></span><ArrowUpRight />
        </button>
        <button onClick={() => go('settings')}>
          <span className="us-primary-icon"><Settings size={23} /></span>
          <span><b>Настройки</b><small>Профиль, тема и приватность</small></span><ArrowUpRight />
        </button>
      </div>
    </>
  );
}
function MapPinIcon() { return <span className="pin-icon">⌖</span>; }
export function Collection({
  page,
  detail,
  create,
  go,
}: Openers & { page: string }) {
  const { space } = useSpace();
  const [memoryFilter, setMemoryFilter] = useState('all');
  const map: Record<string, { kind: Kind; title: string; label: string }> = {
    memories: {
      kind: 'memories',
      title: 'Remember this feeling.',
      label: 'THE DAYS THAT STAY WITH US',
    },
    timeline: {
      kind: 'memories',
      title: 'The story of us.',
      label: 'ONE LITTLE MOMENT AT A TIME',
    },
    gratitudes: {
      kind: 'gratitudes',
      title: 'The things we notice.',
      label: 'OUR LITTLE ARCHIVE OF THANK-YOUS',
    },
    capsules: {
      kind: 'time_capsules',
      title: 'For another day.',
      label: 'LET TIME DO ITS THING',
    },
    bucket: {
      kind: 'bucket_items',
      title: 'One day, together.',
      label: 'THINGS WE WANT TO DO TOGETHER',
    },
    wishlist: {
      kind: 'wishlist_items',
      title: 'A little wish.',
      label: 'THE THINGS THAT CATCH OUR EYE',
    },
  };
  const meta = map[page] ?? map.memories;
  const items = space.entries[meta.kind].filter(
    (e) => !e.private || e.creator_id === space.user.id,
  ).filter((e) => page !== 'memories' || memoryFilter === 'all' || String(e.details.media_type ?? 'photo') === memoryFilter);
  return (
    <>
      <PageHeading
        label={meta.label}
        title={meta.title}
        back={() => go('us')}
        action={
          <button className="primary" onClick={() => create(meta.kind)}>
            <Plus size={17} /> Add a little piece
          </button>
        }
      />
      {page === 'timeline' ? (
        <div className="relationship-timeline">
          <article>
            <time>{space.couple?.start_date}</time>
            <h2>The beginning of us.</h2>
            <span className="timeline-dot" />
          </article>
          {[
            ...space.entries.memories,
            ...space.entries.events.filter((e) => e.date && e.date <= day()),
          ]
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
            .map((e) => (
              <article key={e.id}>
                <span className="timeline-dot" />
                <time>{e.date}</time>
                <button
                  onClick={() =>
                    detail(
                      space.entries.memories.some((m) => m.id === e.id)
                        ? 'memories'
                        : 'events',
                      e,
                    )
                  }
                >
                  {e.image && <Photo src={e.image} alt={e.title} />}
                  <h2>{e.title}</h2>
                  <p>{e.body}</p>
                </button>
              </article>
            ))}
        </div>
      ) : (
        <>
        {page === 'memories' && <FilterTabs items={['all', 'photo', 'video']} value={memoryFilter} onChange={setMemoryFilter} />}
        <div
          className={
            'collection-grid ' + (page === 'memories' ? 'memories-grid' : '')
          }
        >
          {items.map((e) => (
            <button
              className={
                'collection-card ' +
                (meta.kind === 'gratitudes' ? 'note-card ' : '') +
                (meta.kind === 'time_capsules' ? 'capsule-card' : '')
              }
              key={e.id}
              onClick={() => detail(meta.kind, e)}
            >
              {e.image && <Media src={e.image} alt={e.title} type={String(e.details.media_type ?? 'photo') === 'video' ? 'video' : 'photo'} />}
              <div>
                {meta.kind === 'time_capsules' ? (
                  <>
                    <Lock size={26} />
                    <span className="eyebrow">OPEN IN</span>
                    <strong>
                      {e.unlock_at
                        ? Math.max(
                            0,
                            Math.ceil(
                              (Date.parse(e.unlock_at) - Date.now()) / 86400000,
                            ),
                          )
                        : 0}
                    </strong>
                    <span className="eyebrow">DAYS</span>
                  </>
                ) : (
                  <span className="eyebrow">
                    {e.date ?? e.category}
                    {e.private ? ' · ONLY ME' : ''}
                  </span>
                )}
                <h3>{e.title}</h3>
                {meta.kind !== 'time_capsules' && (
                  <p>{e.body?.slice(0, 150)}</p>
                )}
                <span className="collection-foot">
                  {e.status === 'completed' ? (
                    <>
                      <Check size={14} /> A someday, made real
                    </>
                  ) : (
                    'A little piece of us'
                  )}
                  <ArrowUpRight size={17} />
                </span>
              </div>
            </button>
          ))}
        </div>
        </>
      )}
      {!items.length && (
        <Empty
          title="The first little piece is yours."
          text="A memory, a someday, a thing worth keeping. There’s room for it here."
          onAdd={() => create(meta.kind)}
        />
      )}
    </>
  );
}
export function Goals({ back }: { back: () => void }) {
  const { space, add, update } = useSpace();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(100);
  const [kind, setKind] = useState('percentage');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        label="GROWING IN THE SAME DIRECTION"
        title={
          <>
            Something to <em>grow toward.</em>
          </>
        }
        back={back}
      />
      <div className="goals-grid">
        {space.entries.goals.map((g) => {
          const current = Number(g.details.current ?? 0),
            total = Number(g.details.target ?? 100),
            progress = Math.min(100, Math.round((current / total) * 100));
          return (
            <article className="goal-card" key={g.id}>
              <span className="eyebrow">{g.category.toUpperCase()}</span>
              <h2>{g.title}</h2>
              <strong>
                {progress}
                <small>%</small>
              </strong>
              <div className="goal-track">
                <span style={{ width: progress + '%' }} />
              </div>
              <p>
                {current.toLocaleString()} of {total.toLocaleString()}{' '}
                {String(g.details.unit ?? '')}
              </p>
              <form
                className="goal-update"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const n = Number(amounts[g.id]);
                  if (Number.isFinite(n) && n >= 0)
                    await update('goals', g.id, {
                      details: { ...g.details, current: Math.min(n, total) },
                    });
                }}
              >
                <input
                  aria-label={'New progress for ' + g.title}
                  type="number"
                  min="0"
                  max={total}
                  placeholder="Update progress"
                  value={amounts[g.id] ?? ''}
                  onChange={(e) =>
                    setAmounts({ ...amounts, [g.id]: e.target.value })
                  }
                />
                <button className="secondary">Save</button>
              </form>
            </article>
          );
        })}
      </div>
      <form
        className="new-goal"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await add('goals', {
              title,
              category: kind,
              details: {
                current: 0,
                target,
                unit:
                  kind === 'money'
                    ? '₽'
                    : kind === 'checklist'
                      ? 'steps'
                      : kind === 'percentage'
                        ? '%'
                        : 'moments',
              },
            });
            setTitle('');
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Give a someday a little direction.</h3>
        <label className="field">
          Our goal
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Japan, 2027"
          />
        </label>
        <div className="form-columns">
          <label className="field">
            Measure
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option>percentage</option>
              <option>numeric</option>
              <option>money</option>
              <option>checklist</option>
            </select>
          </label>
          <label className="field">
            Target
            <input
              required
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </label>
        </div>
        <button disabled={busy} className="primary">
          {busy ? 'Saving…' : 'Make it our goal'}
          <Plus size={16} />
        </button>
      </form>
    </>
  );
}
export function Achievements({ back }: { back: () => void }) {
  const { space } = useSpace();
  const badges = [
    {
      name: 'Memory keepers',
      count: space.entries.memories.length,
      target: 10,
      icon: Camera,
    },
    {
      name: 'Little explorers',
      count: space.entries.places.filter((p) => p.status === 'completed')
        .length,
      target: 10,
      icon: Orbit,
    },
    {
      name: 'Made time for us',
      count: space.entries.events.filter((e) => e.category === 'date').length,
      target: 1,
      icon: Heart,
    },
    {
      name: 'A hundred thank-yous',
      count: space.entries.gratitudes.length,
      target: 100,
      icon: Sparkles,
    },
    {
      name: 'Our first chapter',
      count: -daysUntil(space.couple?.start_date ?? day()),
      target: 365,
      icon: Award,
    },
    {
      name: 'The everyday team',
      count: space.entries.tasks.filter((t) => t.status === 'completed').length,
      target: 10,
      icon: Check,
    },
  ];
  return (
    <>
      <PageHeading
        label="LITTLE THINGS ADD UP"
        title={
          <>
            Look what <em>we made.</em>
          </>
        }
        subtitle="A few quiet reminders of a life being lived together."
        back={back}
      />
      <div className="achievement-grid">
        {badges.map(({ name, count, target, icon: Icon }, i) => (
          <article
            className={'achievement ' + (count >= target ? 'earned' : '')}
            key={name}
          >
            <div className="metal-badge">
              <Icon size={42} strokeWidth={1} />
              <span>{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3>{name}</h3>
            <p>
              {count >= target
                ? 'A little milestone, yours.'
                : `${Math.max(0, count)} / ${target} · all in good time`}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
export function Inbox({ back }: { back: () => void }) {
  const { space, add } = useSpace();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        label="A SMALL MESSAGE. A BIG FEELING."
        title={
          <>
            Thinking of <em>you.</em>
          </>
        }
        back={back}
      />
      <div className="love-inbox">
        <div className="note-chips">
          {[
            'I miss you.',
            'Thank you.',
            'Proud of you.',
            'You look beautiful.',
            'Thinking of you.',
          ].map((s) => (
            <button key={s} onClick={() => setText(s)}>
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await add('love_notes', { title: text, body: text });
              setText('');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            A few words for your person
            <textarea
              required
              maxLength={300}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Just wanted you to know…"
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send a little feeling'}
            <Send size={17} />
          </button>
        </form>
        <div className="little-notes">
          {space.entries.love_notes.map((n) => (
            <article key={n.id}>
              <span className="eyebrow">
                {space.members.find((m) => m.id === n.creator_id)?.first_name}
              </span>
              <p>{n.body}</p>
              <Heart size={16} />
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
