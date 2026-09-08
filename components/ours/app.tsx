'use client';
import { Suspense, lazy, useEffect, useState } from 'react';
import {
  Sun,
  ListTodo,
  MapPin,
  Orbit,
  Plus,
  Check,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { SpaceProvider, useSpace } from '@/lib/ours/store';
import { telegram, haptic } from '@/lib/ours/telegram';
import { visibleEntry } from '@/lib/ours/permissions';
import { type Entry, type Kind } from '@/lib/ours/types';
import { Today, type Openers } from './today';
import { Plans } from './plans';
import { Places } from './places';
import { Purchases } from './purchases';
import { Us, Collection, Goals, Achievements, Inbox } from './us';
import { Mood, DateNight, Questions, ThisOrThat } from './experiences';
import { CreateSheet } from './create';
import { DetailSheet } from './detail';
import { Settings, Onboarding } from './settings';
import { Avatar } from './primitives';
const World = lazy(() => import('./world'));
const Wrapped = lazy(() => import('./wrapped'));
export default function App() {
  return (
    <SpaceProvider>
      <Shell />
    </SpaceProvider>
  );
}
function Shell() {
  const { space, loading, error, demo, notice, online, add } = useSpace();
  const [page, setPage] = useState('today');
  const [create, setCreate] = useState<{ kind?: Kind; editing?: Entry } | null>(
    null,
  );
  const [detail, setDetail] = useState<{ kind: Kind; row: Entry } | null>(null);
  const go = (p: string) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openers: Openers = {
    detail: (kind, row) => {
      const visible = visibleEntry(
        kind,
        row,
        space.user.id,
        space.entries[kind],
      );
      if (visible) setDetail({ kind, row: visible });
    },
    create: (kind) => setCreate({ kind }),
    go,
  };
  useRussianInterface();
  useEffect(() => {
    const t = telegram();
    const back = () => {
      if (create) setCreate(null);
      else if (detail) setDetail(null);
      else go('today');
    };
    if (page !== 'today' || create || detail) {
      t?.BackButton?.show();
      t?.BackButton?.onClick(back);
    } else t?.BackButton?.hide();
    return () => t?.BackButton?.offClick(back);
  }, [page, create, detail]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              description: string;
              inputSchema: object;
              annotations: object;
              execute: (i: unknown) => Promise<unknown>;
            },
            options: { signal: AbortSignal },
          ) => void;
        };
      }
    ).modelContext;
    if (!context || loading || error) return;
    const lifecycle = new AbortController();
    try {
      // Some hosts return a promise here even though the browser type is void.
      // Catch its rejection because unmounting the app intentionally aborts the registration.
      void Promise.resolve(context.registerTool(
        {
          name: 'ours_create_task',
          description: 'Create a task in the active shared space.',
          inputSchema: {
            type: 'object',
            properties: { title: { type: 'string', maxLength: 200 } },
            required: ['title'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute: async (input) => {
            if (
              !input ||
              typeof input !== 'object' ||
              !('title' in input) ||
              typeof input.title !== 'string' ||
              !input.title.trim()
            )
              throw new Error('A title is required');
            const r = await add('tasks', { title: input.title });
            go('plans');
            return { id: r.id, title: r.title };
          },
        },
        { signal: lifecycle.signal },
      )).catch(() => {
        /* Optional browser capability or an intentional abort. */
      });
    } catch {
      /* Optional browser capability. */
    }
    return () => lifecycle.abort('registration-disposed');
  }, [loading, error, add]);
  if (loading)
    return (
      <div className="launch">
        <div className="joining-dots">
          <i />
          <i />
        </div>
        <span className="wordmark">ours</span>
      </div>
    );
  if (error)
    return (
      <div className="setup-state">
        <span className="wordmark">
          ours<span>●</span>
        </span>
        <h1>
          A little space,
          <br />
          almost ready.
        </h1>
        <p>{error}</p>
        <button className="primary" onClick={() => location.reload()}>
          Try again <ArrowRight size={17} />
        </button>
      </div>
    );
  if (!space.couple || space.members.length < 2)
    return (
      <>
        <Onboarding />
        {notice && (
          <div className="ours-toast" role="status">
            {notice}
          </div>
        )}
      </>
    );
  const active = ['today', 'plans', 'places', 'purchases'].includes(page) ? page : 'us';
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="wordmark"
          onClick={() => go('today')}
          aria-label="OURS home"
        >
          ours<span>●</span>
        </button>
        <div className="top-note">A LITTLE WORLD. JUST FOR TWO.</div>
        <button className="pair" onClick={() => go('us')}>
          {space.members.map((m) => (
            <Avatar key={m.id} id={m.id} />
          ))}
          <span>{space.members.map((m) => m.first_name).join(' & ')}</span>
        </button>
      </header>
      {demo && (
        <div className="demo-label">
          ДЕМО-ПРОСТРАНСТВО <span>·</span> вид {space.user.first_name}
          <button onClick={() => go('settings')}>Настроить под себя ↗</button>
        </div>
      )}
      <main className={'main page-enter page-' + page} key={page}>
        {page === 'today' ? (
          <Today {...openers} />
        ) : page === 'plans' ? (
          <Plans {...openers} />
        ) : page === 'places' ? (
          <Places {...openers} />
        ) : page === 'purchases' ? (
          <Purchases />
        ) : page === 'us' ? (
          <Us {...openers} />
        ) : page === 'mood' ? (
          <Mood back={() => go('today')} />
        ) : page === 'date' ? (
          <DateNight back={() => go('today')} />
        ) : page === 'questions' ? (
          <Questions back={() => go('us')} />
        ) : page === 'game' ? (
          <ThisOrThat back={() => go('us')} />
        ) : page === 'settings' ? (
          <Settings back={() => go('us')} />
        ) : page === 'goals' ? (
          <Goals back={() => go('us')} />
        ) : page === 'achievements' ? (
          <Achievements back={() => go('us')} />
        ) : page === 'inbox' ? (
          <Inbox back={() => go('us')} />
        ) : page === 'world' ? (
          <Suspense
            fallback={
              <div className="scene-loading">
                A little universe is coming into focus…
              </div>
            }
          >
            <World {...openers} />
          </Suspense>
        ) : page === 'wrapped' ? (
          <Suspense
            fallback={
              <div className="scene-loading">Gathering our little moments…</div>
            }
          >
            <Wrapped back={() => go('us')} />
          </Suspense>
        ) : (
          <Collection {...openers} page={page} />
        )}
        <footer className="page-end">
          OUR ORDINARY, EXTRAORDINARY LIFE.
          {!online && (
            <span className="connection-note">
              Reconnecting. Your next save will retry.
            </span>
          )}
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {[
          { icon: Sun, label: 'TODAY', id: 'today' },
          { icon: ListTodo, label: 'PLANS', id: 'plans' },
          { icon: MapPin, label: 'PLACES', id: 'places' },
          { icon: ShoppingBag, label: 'PURCHASES', id: 'purchases' },
          { icon: Orbit, label: 'US', id: 'us' },
        ].map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            className={active === id ? 'active' : ''}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => go(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button
          className="create-button"
          aria-label="Add something to our space"
          onClick={() => {
            setCreate({});
            haptic('light');
          }}
        >
          <Plus />
        </button>
      </nav>
      {create && (
        <CreateSheet
          key={(create.kind ?? 'all') + (create.editing?.id ?? '')}
          open
          onClose={() => setCreate(null)}
          initial={create.kind}
          editing={create.editing}
        />
      )}{' '}
      {detail && !create && (
        <DetailSheet
          key={detail.row.id}
          {...detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setCreate({ kind: detail.kind, editing: detail.row });
            setDetail(null);
          }}
        />
      )}
      {notice && (
        <div className="ours-toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}

function useRussianInterface() {
  useEffect(() => {
    const map: Record<string, string> = {
      'TODAY': 'СЕГОДНЯ', 'PLANS': 'ПЛАНЫ', 'PLACES': 'МЕСТА', 'US': 'МЫ',
      'OUR NEXT CHAPTER': 'НАША СЛЕДУЮЩАЯ ГЛАВА', 'DAYS TO GO': 'ДНЕЙ ОСТАЛОСЬ',
      'JUST YOU, ME & A WINDOW SEAT': 'ТОЛЬКО ТЫ, Я И МЕСТО У ОКНА', 'OUR FREQUENCY': 'НАША ВОЛНА',
      'Pretty calm': 'Почти спокойно', 'A little tired': 'Немного устала', 'Check in': 'Отметиться',
      'LEAVE IT TO CHANCE': 'ДОВЕРИМСЯ СЛУЧАЙНОСТИ', 'Tonight, we...': 'Сегодня мы…',
      'A good plan starts with a little surprise.': 'Хороший план начинается с маленького сюрприза.',
      'A few little things': 'Несколько маленьких дел', 'All plans': 'Все планы',
      'ON THIS DAY': 'В ЭТОТ ДЕНЬ', 'FROM OUR CAMERA ROLL': 'ИЗ НАШЕЙ ФОТОПЛЁНКИ',
      'Our memories': 'Наши воспоминания', 'ONE QUESTION. TWO ANSWERS.': 'ОДИН ВОПРОС. ДВА ОТВЕТА.',
      'Add a plan': 'Добавить план', 'Save a place': 'Сохранить место', 'Where next?': 'Куда дальше?',
      'Back to us': 'Назад к нам', 'Save changes': 'Сохранить изменения', 'Add to our space': 'Добавить в наше пространство',
      'Saving…': 'Сохраняем…', 'One moment…': 'Один момент…', 'Keep it': 'Оставить', 'Yes, continue': 'Да, продолжить',
      'OPEN IN': 'ОТКРОЕТСЯ ЧЕРЕЗ', 'DAYS': 'ДНЕЙ', 'JUST FOR YOU': 'ТОЛЬКО ДЛЯ ТЕБЯ', 'Go on. Open it.': 'Открывай.',
      'Thank you': 'Спасибо', 'Made my day': 'Сделало мой день', 'We’ve been here': 'Мы здесь были',
      'We got this done': 'Мы это сделали', 'We did this. Make it a memory.': 'Мы сделали это. Пусть станет воспоминанием.',
      'All places': 'Все места', 'Visited': 'Посещённые', 'Coffee': 'Кофе', 'Restaurants': 'Рестораны', 'Travel': 'Путешествия', 'Nature': 'Природа',
      'Tasks': 'Задачи', 'Calendar': 'Календарь', 'Rituals': 'Ритуалы', 'Today': 'Сегодня', 'Upcoming': 'Скоро', 'Someday': 'Когда-нибудь', 'Completed': 'Завершённые',
      'Daily question': 'Вопрос дня', 'Weekly pulse': 'Пульс недели', 'Conversation cards': 'Карточки для разговора',
      'A little world. Just for two.': 'Маленький мир. Только для двоих.', 'Make room for us': 'Оставить место для нас',
      'Find my person': 'Найти своего человека', 'Invite your person.': 'Пригласи своего человека.', 'Create our space': 'Создать наше пространство',
      'Your profile': 'Твой профиль', 'Our beginning': 'Наше начало', 'Save our preferences': 'Сохранить настройки',
      'Export our space': 'Экспортировать наше пространство', 'Disconnect our space': 'Отключить наше пространство', 'Delete my account': 'Удалить мой аккаунт',
      'How’s your inner weather?': 'Какая погода внутри?', 'SOCIAL BATTERY': 'СОЦИАЛЬНАЯ БАТАРЕЙКА', 'This is where I’m at': 'Вот как я себя чувствую',
      'A LITTLE SERENDIPITY': 'НЕМНОГО СЛУЧАЙНОСТИ', 'Plan our night': 'Спланировать наш вечер', 'Make this our plan': 'Сделать это нашим планом',
      'NO PERFECT PLANS. JUST GOOD COMPANY.': 'ИДЕАЛЬНЫХ ПЛАНОВ НЕТ. ЕСТЬ ХОРОШАЯ КОМПАНИЯ.',
      'Still getting to know you.': 'Мы всё ещё узнаём друг друга.', 'Look what we made.': 'Посмотри, что мы создали.',
      'Thinking of you.': 'Думаю о тебе.', 'Proud of you.': 'Горжусь тобой.', 'You look beautiful.': 'Ты прекрасна.',
      'Send a little feeling': 'Отправить маленькое чувство', 'Our little universe.': 'Наша маленькая вселенная.',
      'Reset view': 'Сбросить вид', 'Drag to drift. Tap a light to remember.': 'Потяни, чтобы повернуть. Нажми на свет, чтобы вспомнить.',
      'Our kind of places.': 'Наши места.', 'SOMEWHERE WE’LL GO, SOMEDAY': 'МЕСТА, КУДА МЫ КОГДА-НИБУДЬ ПОЕДЕМ',
      'Room for us.': 'Место для нас.', 'A LITTLE PLANNING GOES A LONG WAY': 'МАЛЕНЬКИЕ ПЛАНЫ ВЕДУТ ДАЛЕКО',
      'ON THE HORIZON': 'НА ГОРИЗОНТЕ', 'A LITTLE THING WE COME BACK TO': 'МАЛЕНЬКАЯ ТРАДИЦИЯ, К КОТОРОЙ МЫ ВОЗВРАЩАЕМСЯ',
      'Out of ideas?': 'Закончились идеи?', 'Let’s make a night of it.': 'Давайте устроим вечер.', 'Plan our night ↗': 'Спланировать вечер ↗',
      'Our ordinary, extraordinary life.': 'Наша обычная, необыкновенная жизнь.', 'OUR ORDINARY, EXTRAORDINARY LIFE.': 'НАША ОБЫЧНАЯ, НЕОБЫКНОВЕННАЯ ЖИЗНЬ.',
      'ONLY TWO. ONLY YOURS.': 'ТОЛЬКО ДВОЕ. ТОЛЬКО ВАШЕ.', 'The everyday. The extraordinary.': 'Обычное. Необыкновенное.',
      'Your plans, places, memories, and everything in between.': 'Ваши планы, места, воспоминания и всё между ними.',
      'Make plans. Say thank you. Save the places you’ll go and the days you never want to forget.': 'Стройте планы. Говорите спасибо. Сохраняйте места и дни, которые не хочется забывать.',
      'It starts with a link. The rest, you’ll make together.': 'Всё начинается со ссылки. Остальное вы создадите вместе.',
      'Open invitation': 'Открыть приглашение', 'Create a fresh invitation': 'Создать новую ссылку',
      'Invitation copied.': 'Ссылка скопирована.', 'Valid for 48 hours · one person only': 'Действует 48 часов · только для одного человека',
      'A little closer, one question at a time': 'Становимся ближе, один вопрос за раз',
      'A small message. A big feeling.': 'Маленькое сообщение. Большое чувство.', 'Give a someday a little direction.': 'Дадим желанию направление.',
      'Make it our goal': 'Сделать это нашей целью', 'Little things add up': 'Маленькие вещи складываются в большое',
      'Memory keepers': 'Хранители воспоминаний', 'Little explorers': 'Маленькие исследователи', 'Made time for us': 'Нашли время для нас',
      'Our first chapter': 'Наша первая глава', 'The everyday team': 'Команда обычных дней', 'For another day.': 'Для другого дня.',
      'One day, together.': 'Однажды, вместе.', 'The story of us.': 'Наша история.', 'The things we notice.': 'То, что мы замечаем.',
      'The days that stay with us': 'Дни, которые остаются с нами', 'One little moment at a time': 'По одному маленькому моменту',
      'Our little archive of thank-yous': 'Наш архив благодарностей', 'Let time do its thing': 'Пусть время делает своё дело',
      'Things we want to do together': 'То, что мы хотим сделать вместе', 'The things that catch our eye': 'То, что привлекает наш взгляд',
      'PURCHASES': 'ПОКУПКИ', 'Нужно купить': 'Нужно купить', 'Желания': 'Желания', 'Список без шума.': 'Список без шума.',
      'Добавить': 'Добавить', 'Куплено': 'Куплено', 'Список пока пуст.': 'Список пока пуст.', 'Желаний пока нет.': 'Желаний пока нет.'
    };
    const translate = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = []; let node: Node | null;
      while ((node = walker.nextNode())) nodes.push(node as Text);
      for (const text of nodes) { const key = text.nodeValue?.trim(); if (key && map[key]) text.nodeValue = text.nodeValue!.replace(key, map[key]); }
    };
    translate(); const observer = new MutationObserver(translate); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect();
  }, []);
}
