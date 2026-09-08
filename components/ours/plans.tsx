'use client';
import { useRef, useState, type FormEvent } from 'react';
import {
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { useSpace } from '@/lib/ours/store';
import { day, type Entry } from '@/lib/ours/types';
import { Avatar, Empty, PageHeading } from './primitives';
import type { Openers } from './today';
export function TaskRow({ row, onOpen }: { row: Entry; onOpen: () => void }) {
  const { update, add, notify, demo } = useSpace();
  const [burst, setBurst] = useState(false);
  const start = useRef(0);
  const done = row.status === 'completed';
  async function complete() {
    setBurst(true);
    try {
      await update('tasks', row.id, {
        status: done ? 'open' : 'completed',
        details: {
          ...row.details,
          completed_at: done ? null : new Date().toISOString(),
        },
      });
      if (
        demo &&
        !done &&
        ['daily', 'weekly', 'monthly'].includes(String(row.details.recurring))
      ) {
        const d = new Date((row.date ?? day()) + 'T12:00:00');
        if (row.details.recurring === 'monthly') d.setMonth(d.getMonth() + 1);
        else
          d.setDate(d.getDate() + (row.details.recurring === 'weekly' ? 7 : 1));
        await add('tasks', {
          title: row.title,
          body: row.body,
          category: row.category,
          assigned_to: row.assigned_to,
          date: d.toISOString().slice(0, 10),
          details: { ...row.details, completed_at: null },
        });
      }
      notify(
        done
          ? 'Снова в списке.'
          : 'Одним делом меньше. Больше места для нас.',
      );
    } catch {
      /* Store restores the previous row. */
    } finally {
      setTimeout(() => setBurst(false), 550);
    }
  }
  return (
    <div
      className={
        'task-row ' + (done ? 'is-complete ' : '') + (burst ? 'task-burst' : '')
      }
      onTouchStart={(e) => (start.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - start.current;
        if (dx > 80) void complete();
        if (dx < -80) onOpen();
      }}
    >
      <button
        className="task-check"
        aria-label={done ? 'Вернуть ' + row.title : 'Завершить ' + row.title}
        onClick={() => void complete()}
      >
        {done && <Check size={14} />}
      </button>
      <button className="task-text" onClick={onOpen}>
        <b>{row.title}</b>
        <small>
          {row.category.toUpperCase()} ·{' '}
              {row.date === day() ? 'СЕГОДНЯ' : (row.date ?? 'КОГДА-НИБУДЬ')}
          {row.details.priority === 'high' ? ' · IMPORTANT' : ''}
        </small>
      </button>
      <Avatar id={row.assigned_to ?? 'both'} size="small" />
      <button
        className="icon-button subtle"
        aria-label={'Действия для ' + row.title}
        onClick={onOpen}
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}
export function Plans({ detail }: Openers) {
  const { space, add, notify } = useSpace();
  const [planner, setPlanner] = useState<'him' | 'her' | 'both'>('both');
  const [month, setMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState(day());
  const [eventOpen, setEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('19:00');
  const [saving, setSaving] = useState(false);
  const monthDays = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const prefix = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const plannerPerson = planner === 'him' ? space.members[0]?.id : planner === 'her' ? space.members[1]?.id : null;
  const selectedEvents = space.entries.events.filter((e) => {
    if (e.date !== selected) return false;
    if (planner === 'both') return !e.assigned_to || e.assigned_to === 'both';
    return e.assigned_to === plannerPerson;
  });
  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    setSaving(true);
    try {
      await add('events', {
        title: eventTitle.trim(),
        date: selected,
        category: 'date',
        assigned_to: planner === 'both' ? 'both' : plannerPerson,
        details: { time: eventTime },
      });
      setEventTitle('');
      setEventOpen(false);
      notify('Событие добавлено в календарь.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        label="НАШ КАЛЕНДАРЬ"
        title={
          <>
            Планы для <em>нас.</em>
          </>
        }
        subtitle="Выберите день, время и событие."
      />
      <div className="planner-switch" role="tablist" aria-label="Чей ежедневник">
        {([['him', 'Он'], ['her', 'Она'], ['both', 'Мы']] as const).map(([value, label]) => (
          <button key={value} role="tab" aria-selected={planner === value} className={planner === value ? 'active' : ''} onClick={() => setPlanner(value)}>{label}</button>
        ))}
      </div>
      <div className="calendar-legend"><span><i className="him" /> Он</span><span><i className="her" /> Она</span><span><i className="both" /> Мы</span></div>
      <div className="calendar-layout simple-calendar-layout">
          <section className="calendar-card">
            <div className="section-heading">
              <h3>
                {month.toLocaleDateString('ru-RU', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous month"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next month"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((v, i) => (
                <span key={i} className="weekday">
                  {v}
                </span>
              ))}
              {Array.from({ length: prefix }, (_, i) => (
                <span key={'blank' + i} />
              ))}
              {Array.from({ length: monthDays }, (_, i) => {
                const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                const dateEvents = space.entries.events.filter((e) => e.date === date);
                const hasHim = dateEvents.some((e) => e.assigned_to === space.members[0]?.id);
                const hasHer = dateEvents.some((e) => e.assigned_to === space.members[1]?.id);
                const hasBoth = dateEvents.some((e) => !e.assigned_to || e.assigned_to === 'both');
                return (
                  <button
                    key={date}
                    className={
                      (date === selected ? 'selected ' : '') +
                      (date === day() ? 'today ' : '')
                    }
                    aria-label={date}
                    onClick={() => setSelected(date)}
                  >
                    {i + 1}
                    {dateEvents.length > 0 && <span className="calendar-dots" aria-label="Есть планы"><i className={hasHim ? 'him' : ''} />{hasHer && <i className="her" />}{hasBoth && <i className="both" />}</span>}
                  </button>
                );
              })}
            </div>
          </section>
          <section>
            <h3 className="serif-title">{new Date(selected + 'T12:00:00').toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}</h3>
            {selectedEvents.map((e) => (
              <button
                className="event-list-card"
                key={e.id}
                onClick={() => detail('events', e)}
              >
                <span className="eyebrow">
                  {String(e.details.time ?? 'ALL DAY')}
                </span>
                <h3>{e.title}</h3>
                <p>{e.category}</p>
              </button>
            ))}
            {!selectedEvents.length && <Empty title="Пока ничего нет" text="Добавьте событие на этот день." addLabel="Добавить" onAdd={() => setEventOpen(true)} />}
            {eventOpen && <form className="calendar-add-form" onSubmit={(e) => void saveEvent(e)}><label className="field">Событие<input autoFocus required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Ужин, кино, поездка…" /></label><label className="field">Время<input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} /></label><div className="calendar-form-actions"><button type="button" className="secondary" onClick={() => setEventOpen(false)}>Отмена</button><button className="primary" disabled={saving}><Plus size={16} /> Сохранить</button></div></form>}
            {!eventOpen && selectedEvents.length > 0 && <button className="primary full calendar-add-button" onClick={() => setEventOpen(true)}><Plus size={17} /> Добавить событие</button>}
          </section>
      </div>
    </>
  );
}
