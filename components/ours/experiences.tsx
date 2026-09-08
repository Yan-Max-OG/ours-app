'use client';
import { useState } from 'react';
import {
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Heart,
  RotateCw,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useSpace } from '@/lib/ours/store';
import { day } from '@/lib/ours/types';
import { haptic } from '@/lib/ours/telegram';
import {
  dailyQuestion,
  makeNight,
  pairs,
  questions,
} from '@/lib/ours/experiences';
import { PageHeading, FilterTabs } from './primitives';
import { SelectField } from './create';
const moods = [
  'happy',
  'calm',
  'tired',
  'stressed',
  'sad',
  'excited',
  'need space',
  'want attention',
];
export function Mood({ back }: { back: () => void }) {
  const { space, add, update, notify } = useSpace();
  const old = space.entries.mood_entries.find(
    (e) => e.creator_id === space.user.id && e.date === day(),
  );
  const [mood, setMood] = useState(old?.title ?? 'calm');
  const [battery, setBattery] = useState(Number(old?.details.battery ?? 60));
  const [note, setNote] = useState(String(old?.details.note ?? ''));
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        label="OUR FREQUENCY"
        title={
          <>
            How’s your <em>inner weather?</em>
          </>
        }
        subtitle="No fixing. No judging. Just knowing."
        back={back}
      />
      <div className="mood-experience">
        <span
          className={'mood-orb huge mood-' + mood.replaceAll(' ', '-')}
          style={{ filter: `hue-rotate(${moods.indexOf(mood) * 21}deg)` }}
        />
        <h2>{mood}</h2>
        <div className="mood-options">
          {moods.map((m) => (
            <button
              key={m}
              className={mood === m ? 'selected' : ''}
              onClick={() => {
                setMood(m);
                haptic();
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="battery-label">
          <span className="eyebrow">SOCIAL BATTERY</span>
          <strong>{battery}%</strong>
        </div>
        <Slider
          aria-label="Social battery"
          value={[battery]}
          onValueChange={(v) => setBattery(Array.isArray(v) ? v[0] : v)}
          min={0}
          max={100}
        />
        <label className="field">
          Anything you want them to know?
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A tiny note, if you feel like it."
            rows={2}
          />
        </label>
        <button
          className="primary full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const value = {
                title: mood,
                date: day(),
                details: {
                  battery,
                  note,
                  visibility: space.preferences.mood_visibility,
                },
              };
              if (old) await update('mood_entries', old.id, value);
              else await add('mood_entries', value);
              notify('Thanks for letting your person in.');
              back();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Saving…' : 'This is where I’m at'}
          <Check size={17} />
        </button>
        <p className="muted center">
          Your mood is shared according to your privacy settings.
        </p>
      </div>
    </>
  );
}
export function DateNight({ back }: { back: () => void }) {
  const { add, notify } = useSpace();
  const [budget, setBudget] = useState('₽');
  const [time, setTime] = useState('evening');
  const [energy, setEnergy] = useState('quiet');
  const [weather, setWeather] = useState('any');
  const [plan, setPlan] = useState<string[][] | null>(null);
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(day());
  return (
    <>
      <PageHeading
        label="A LITTLE SERENDIPITY"
        title={
          <>
            Tonight, <em>we...</em>
          </>
        }
        subtitle="You bring each other. We’ll bring the idea."
        back={back}
      />
      <div className="date-generator">
        <section className="generator-controls">
          <SelectField
            label="A little or a lot?"
            value={budget}
            onChange={setBudget}
            items={['free', '₽', '₽₽', '₽₽₽']}
          />
          <SelectField
            label="How much time is ours?"
            value={time}
            onChange={setTime}
            items={['1h', '3h', 'evening', 'whole day']}
          />
          <SelectField
            label="What’s the energy?"
            value={energy}
            onChange={setEnergy}
            items={['stay in', 'quiet', 'normal', 'adventure']}
          />
          <SelectField
            label="Outside looks like…"
            value={weather}
            onChange={setWeather}
            items={['any', 'sun', 'rain']}
          />
          <button
            className="primary full"
            disabled={reveal}
            onClick={() => {
              setReveal(true);
              setTimeout(() => {
                setPlan(makeNight(budget, time, energy, weather));
                setReveal(false);
                haptic('medium');
              }, 650);
            }}
          >
            <Sparkles size={18} />
            {reveal
              ? 'A little magic…'
              : plan
                ? 'Another kind of evening'
                : 'Plan our night'}
          </button>
        </section>
        <section className={'night-reveal ' + (reveal ? 'dreaming' : '')}>
          <span className="eyebrow">NO PERFECT PLANS. JUST GOOD COMPANY.</span>
          {plan ? (
            <>
              <h2>
                A little time.
                <br />
                <em>All ours.</em>
              </h2>
              <div className="night-stops">
                {plan.map(([time, title, desc], i) => (
                  <div key={title} style={{ animationDelay: `${i * 140}ms` }}>
                    <span>{time}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <label className="field">
                Make a date of it
                <input
                  type="date"
                  min={day()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <button
                className="light-button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await add('events', {
                      title: 'A little time, all ours',
                      date,
                      category: 'date',
                      body: plan.map((s) => s.join(' · ')).join('\n\n'),
                      details: { time: plan[0][0], budget, energy },
                    });
                    notify('Your night is in the calendar.');
                    back();
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Saving…' : 'Make this our plan'}
                <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <div className="unplanned">
              <span>✳</span>
              <h2>
                The best part
                <br />
                is <em>you two.</em>
              </h2>
              <p>Let’s figure out the rest.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function Questions({ back }: { back: () => void }) {
  const { space, add, notify } = useSpace();
  const [tab, setTab] = useState('Daily question');
  const [answer, setAnswer] = useState('');
  const [weekly, setWeekly] = useState(['', '', '']);
  const [busy, setBusy] = useState(false);
  const stamp =
    tab === 'Weekly pulse'
      ? (() => {
          const d = new Date(day() + 'T12:00:00');
          d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
          return d.toISOString().slice(0, 10);
        })()
      : day();
  const kind = tab === 'Weekly pulse' ? 'weekly_pulses' : 'question_answers';
  const current = space.entries[kind].filter((e) => e.date === stamp);
  const mine = current.find((e) => e.creator_id === space.user.id);
  const partner = current.find((e) => e.creator_id !== space.user.id);
  const prompt = dailyQuestion(day());
  const revealed =
    mine &&
    partner &&
    mine.status === 'completed' &&
    partner.status === 'completed';
  return (
    <>
      <PageHeading
        label="A LITTLE CLOSER, ONE QUESTION AT A TIME"
        title={
          <>
            Still getting to <em>know you.</em>
          </>
        }
        back={back}
      />
      <FilterTabs
        items={['Daily question', 'Weekly pulse', 'Conversation cards']}
        value={tab}
        onChange={setTab}
      />
      {tab === 'Conversation cards' ? (
        <ConversationCards />
      ) : (
        <div className="question-experience">
          <span className="eyebrow">
            {tab === 'Daily question'
              ? 'TODAY’S QUESTION'
              : 'OUR WEEK, TOGETHER'}
          </span>
          <h2>
            {tab === 'Daily question' ? prompt : 'A little room to talk.'}
          </h2>
          {revealed ? (
            <div className="answer-reveal">
              {current.map((a) => (
                <article key={a.id}>
                  <span className="eyebrow">
                    {
                      space.members.find((m) => m.id === a.creator_id)
                        ?.first_name
                    }
                  </span>
                  <p>{a.body}</p>
                </article>
              ))}
            </div>
          ) : mine ? (
            <div className="waiting-answer">
              <Lock size={25} />
              <h3>Your words are safe here.</h3>
              <p>Both answers open when your person finishes too.</p>
              <blockquote>{mine.body}</blockquote>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await add(kind, {
                    title:
                      tab === 'Daily question' ? prompt : 'Our weekly pulse',
                    body:
                      tab === 'Daily question'
                        ? answer
                        : weekly
                            .map(
                              (a, i) =>
                                [
                                  'What made you happiest with us this week?',
                                  'What would you like more of next week?',
                                  'Anything we should talk about?',
                                ][i] +
                                '\n' +
                                a,
                            )
                            .join('\n\n'),
                    date: stamp,
                    category: tab === 'Daily question' ? 'daily' : 'weekly',
                    status: 'completed',
                  });
                  notify('Your answer is tucked away.');
                  setAnswer('');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {tab === 'Daily question' ? (
                <label className="field">
                  Your answer
                  <textarea
                    required
                    maxLength={3000}
                    rows={4}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="The first thing that comes to mind…"
                  />
                </label>
              ) : (
                [
                  'What made you happiest with us this week?',
                  'What would you like more of next week?',
                  'Anything we should talk about?',
                ].map((q, i) => (
                  <label className="field" key={q}>
                    {q}
                    <textarea
                      required
                      maxLength={1500}
                      rows={2}
                      value={weekly[i]}
                      onChange={(e) =>
                        setWeekly((a) =>
                          a.map((v, j) => (i === j ? e.target.value : v)),
                        )
                      }
                    />
                  </label>
                ))
              )}
              <button className="primary full" disabled={busy}>
                {busy ? 'Tucking it away…' : 'Seal my answer'}
                <Lock size={16} />
              </button>
            </form>
          )}
          <p className="muted center">Two honest answers. No right ones.</p>
        </div>
      )}
    </>
  );
}
function ConversationCards() {
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState(false);
  return (
    <div className="conversation-stack">
      <button
        className={'conversation-card ' + (flip ? 'flipped' : '')}
        onClick={() => setFlip(!flip)}
        onTouchStart={(e) =>
          (e.currentTarget.dataset.start = String(e.touches[0].clientX))
        }
        onTouchEnd={(e) => {
          if (
            Math.abs(
              e.changedTouches[0].clientX -
                Number(e.currentTarget.dataset.start),
            ) > 70
          ) {
            setIndex((i) => (i + 1) % questions.length);
            setFlip(false);
          }
        }}
      >
        <span className="eyebrow">
          OURS · CONVERSATION NO. {String(index + 1).padStart(2, '0')}
        </span>
        {flip ? (
          <h2>{questions[index]}</h2>
        ) : (
          <>
            <span className="card-symbol">✳</span>
            <h2>
              A good question
              <br />
              changes <em>an evening.</em>
            </h2>
          </>
        )}
        <span className="eyebrow">
          {flip ? 'TAKE YOUR TIME.' : 'TAP TO TURN IT OVER'}
        </span>
      </button>
      <button
        className="secondary"
        onClick={() => {
          setIndex((i) => (i + 1) % questions.length);
          setFlip(false);
        }}
      >
        <RotateCw size={16} /> Another little question
      </button>
    </div>
  );
}
export function ThisOrThat({ back }: { back: () => void }) {
  const { space, add } = useSpace();
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const mine = space.entries.this_or_that_answers.find(
    (e) => e.creator_id === space.user.id && e.date === day(),
  );
  const partner = space.entries.this_or_that_answers.find(
    (e) => e.creator_id !== space.user.id && e.date === day(),
  );
  const their = partner?.details.answers as string[] | undefined;
  const ours = mine?.details.answers as string[] | undefined;
  const match =
    ours && their
      ? Math.round(
          (ours.filter((a, i) => a === their[i]).length / pairs.length) * 100,
        )
      : 0;
  async function choose(v: string) {
    const next = [...answers, v];
    setAnswers(next);
    haptic();
    if (next.length === pairs.length) {
      setBusy(true);
      try {
        await add('this_or_that_answers', {
          title: 'This or that',
          body: next.join(' · '),
          date: day(),
          category: 'daily',
          status: 'completed',
          details: { answers: next },
        });
      } catch {
        setAnswers(answers);
      } finally {
        setBusy(false);
      }
    }
  }
  return (
    <>
      <PageHeading
        label="TWO MINDS. ONE LITTLE GAME."
        title={
          <>
            This <em>or</em> that?
          </>
        }
        back={back}
      />
      <div className="match-experience">
        {mine ? (
          partner && their ? (
            <div className="match-result">
              <Heart size={30} />
              <strong>{match}%</strong>
              <span className="eyebrow">SAME WAVELENGTH</span>
              <p>The differences are part of the good stuff, too.</p>
              {pairs.map((p, i) => (
                <div className="match-row" key={i}>
                  <span>{ours?.[i]}</span>
                  <span>{ours?.[i] === their[i] ? '↔' : '·'}</span>
                  <span>{their[i]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="waiting-answer">
              <Lock size={30} />
              <h2>Your half is here.</h2>
              <p>Your match appears after your person plays.</p>
            </div>
          )
        ) : (
          <>
            <span className="eyebrow">
              {Math.min(answers.length + 1, pairs.length)} / {pairs.length}
            </span>
            {pairs[answers.length] && (
              <div className="choice-halves">
                {pairs[answers.length].map((v, i) => (
                  <button
                    disabled={busy}
                    key={v}
                    onClick={() => void choose(v)}
                  >
                    <span>{i === 0 ? '01' : '02'}</span>
                    <h2>{v}</h2>
                    <ArrowRight />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
