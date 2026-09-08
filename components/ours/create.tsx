'use client';
import { useState, type FormEvent } from 'react';
import {
  Calendar,
  Heart,
  MapPin,
  ImagePlus,
  ListTodo,
  Lock,
  Sparkles,
  ArrowUpRight,
  Upload,
  Plus,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Panel } from './primitives';
import { api, useSpace } from '@/lib/ours/store';
import { day, type Entry, type Kind } from '@/lib/ours/types';
export const createKinds: {
  kind: Kind;
  name: string;
  hint: string;
  icon: typeof Heart;
}[] = [
  {
    kind: 'tasks',
    name: 'Маленький план',
    hint: 'Дела, которые мы сделаем',
    icon: ListTodo,
  },
  {
    kind: 'gratitudes',
    name: 'Спасибо',
    hint: 'Скажи, что было важно',
    icon: Heart,
  },
  {
    kind: 'places',
    name: 'Место для нас',
    hint: 'Сохрани маленький побег',
    icon: MapPin,
  },
  {
    kind: 'events',
    name: 'Момент вдвоём',
    hint: 'Найдите время друг для друга',
    icon: Calendar,
  },
  {
    kind: 'memories',
    name: 'Воспоминание',
    hint: 'Сохрани это чувство',
    icon: ImagePlus,
  },
  {
    kind: 'wishlist_items',
    name: 'Маленькое желание',
    hint: 'То, на что давно смотришь',
    icon: Sparkles,
  },
  {
    kind: 'time_capsules',
    name: 'Капсула времени',
    hint: 'Записка для будущего дня',
    icon: Lock,
  },
  { kind: 'shopping_items', name: 'Покупка', hint: 'Для магазина или в список желаний', icon: ListTodo },
];
export function SelectField({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: string[];
}) {
  return (
    <label className="field">
      {label}
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ours-select"
      >
        {items.map((i) => (
          <NativeSelectOption key={i} value={i}>
            {i}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}
export function CreateSheet({
  open,
  onClose,
  initial,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Kind;
  editing?: Entry;
}) {
  const [kind, setKind] = useState<Kind | undefined>(initial);
  return (
    <Panel
      open={open}
      onClose={onClose}
      title={
        kind
          ? editing
            ? 'A little edit'
            : (createKinds.find((k) => k.kind === kind)?.name ??
              'Что-то для нас')
          : 'Оставим место для чего-то хорошего.'
      }
      description={
        kind
          ? 'Здесь есть место всему.'
          : 'Большие планы. Маленькие дела. Всё между ними.'
      }
    >
      {kind ? (
        <EntryForm
          key={kind + editing?.id}
          kind={kind}
          editing={editing}
          onDone={onClose}
        />
      ) : (
        <div className="create-options">
          {createKinds.map(({ kind, name, hint, icon: Icon }) => (
            <button key={kind} onClick={() => setKind(kind)}>
              <span className="create-icon">
                <Icon size={22} />
              </span>
              <span>
                <b>{name}</b>
                <small>{hint}</small>
              </span>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
function EntryForm({
  kind,
  editing,
  onDone,
}: {
  kind: Kind;
  editing?: Entry;
  onDone: () => void;
}) {
  const { space, add, update, upload, notify } = useSpace();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [date, setDate] = useState(
    editing?.date ?? (['events', 'memories'].includes(kind) ? day() : ''),
  );
  const [time, setTime] = useState(String(editing?.details.time ?? '20:00'));
  const [category, setCategory] = useState(
    editing?.category ??
      (kind === 'shopping_items' ? 'магазин' : kind === 'places' ? 'coffee' : kind === 'events' ? 'date' : 'for us'),
  );
  const [assigned, setAssigned] = useState(editing?.assigned_to ?? 'both');
  const [priority, setPriority] = useState(
    String(editing?.details.priority ?? 'normal'),
  );
  const [recurring, setRecurring] = useState(
    String(editing?.details.recurring ?? 'never'),
  );
  const [checklist, setChecklist] = useState(
    Array.isArray(editing?.details.checklist)
      ? (editing.details.checklist as { text: string }[])
          .map((c) => c.text)
          .join('\n')
      : '',
  );
  const [url, setUrl] = useState(String(editing?.details.url ?? ''));
  const [location, setLocation] = useState(
    String(editing?.details.address ?? editing?.details.location ?? ''),
  );
  const [budget, setBudget] = useState(String(editing?.details.budget ?? '₽'));
  const [image, setImage] = useState(editing?.image ?? '');
  const [mediaType, setMediaType] = useState(String(editing?.details.media_type ?? 'photo'));
  const [priv, setPriv] = useState(editing?.private ?? false);
  const [later, setLater] = useState(Boolean(editing?.unlock_at));
  const [unlock, setUnlock] = useState(
    editing?.unlock_at?.slice(0, 16) ?? day(1) + 'T20:00',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataStatus, setMetadataStatus] = useState('');
  async function fillPlaceFromLink() {
    if (kind !== 'places' || !url.trim()) return;
    setMetadataLoading(true);
    setMetadataStatus('');
    setError('');
    try {
      const data = await api<{ title?: string; description?: string; address?: string; image?: string }>('place-preview', 'POST', { url: url.trim() });
      if (data.title) setTitle(data.title);
      if (data.description) setBody(data.description);
      if (data.address) setLocation(data.address);
      if (data.image) setImage(data.image);
      setMetadataStatus(data.title ? 'Данные найдены — проверьте их перед сохранением.' : 'На странице не нашли название, заполните его вручную.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMetadataLoading(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (
        (kind === 'time_capsules' || later) &&
        new Date(unlock).getTime() <= Date.now()
      )
        throw new Error('Choose a time in the future');
      const details = {
        ...editing?.details,
        time,
        priority,
        recurring,
        checklist: checklist
          .split('\n')
          .filter(Boolean)
          .map((text) => ({
            text,
            done: Array.isArray(editing?.details.checklist)
              ? Boolean(
                  (
                    editing.details.checklist as {
                      text: string;
                      done: boolean;
                    }[]
                  ).find((c) => c.text === text)?.done,
                )
              : false,
          })),
        url,
        address: location,
        location,
        budget,
        media_type: mediaType,
      };
      const value: Partial<Entry> = {
        title,
        body,
        date: date || null,
        category,
        assigned_to: assigned,
        private: priv,
        image: image || null,
        unlock_at:
          kind === 'time_capsules' || later
            ? new Date(unlock).toISOString()
            : null,
        details,
      };
      if (editing) await update(kind, editing.id, value);
      else await add(kind, value);
      notify(
        editing
          ? 'A little update, saved.'
          : 'Saved. Another little piece of us.',
      );
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="entry-form" onSubmit={submit}>
      <label className="field">
        {kind === 'gratitudes'
          ? 'Give this little thank-you a name'
          : kind === 'places'
            ? 'Название места'
          : 'What shall we call it?'}
        <input
          autoFocus
          required
          maxLength={200}
          placeholder={
            kind === 'tasks'
              ? 'Book that little restaurant'
              : kind === 'places'
                ? 'Somewhere we want to disappear to'
                : 'A little piece of us'
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      {kind !== 'places' && <label className="field">
          {kind === 'gratitudes'
              ? 'What did they do that mattered to you?'
            : 'A little more, if you like'}
          <textarea
            rows={3}
            maxLength={10000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="The details we’ll want to remember…"
          />
        </label>}
      {['tasks', 'events', 'memories', 'rituals'].includes(kind) && (
        <div className="form-columns">
          <label className="field">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {kind !== 'memories' && (
            <label className="field">
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          )}
        </div>
      )}
      {kind === 'tasks' && (
        <>
          <div className="form-columns">
            <SelectField
              label="For whom?"
              value={assigned}
              onChange={setAssigned}
              items={['both', ...space.members.map((m) => m.id)]}
            />
            <SelectField
              label="Priority"
              value={priority}
              onChange={setPriority}
              items={['normal', 'low', 'high']}
            />
          </div>
          <SelectField
            label="Repeat"
            value={recurring}
            onChange={setRecurring}
            items={['never', 'daily', 'weekly', 'monthly']}
          />
          <label className="field">
            Little steps · one per line
            <textarea
              rows={2}
              value={checklist}
              onChange={(e) => setChecklist(e.target.value)}
              placeholder="Choose a place\nBook a table for two"
            />
          </label>
        </>
      )}
      {['tasks', 'places', 'events', 'rituals', 'shopping_items'].includes(kind) && (
        <SelectField
          label="Category"
          value={category}
          onChange={setCategory}
          items={
            kind === 'shopping_items'
              ? ['магазин', 'желания']
              : kind === 'places'
              ? [
                  'coffee',
                  'restaurants',
                  'travel',
                  'hotels',
                  'countries',
                  'cities',
                  'entertainment',
                  'nature',
                  'shopping',
                  'custom',
                ]
              : kind === 'events'
                ? [
                    'date',
                    'travel',
                    'anniversary',
                    'birthday',
                    'booking',
                    'personal',
                    'custom',
                  ]
                : [
                    'for us',
                    'home',
                    'date night',
                    'travel',
                    'shopping',
                    'important',
                    'personal',
                    'custom',
                  ]
          }
        />
      )}
      {['places', 'memories', 'wishlist_items', 'bucket_items'].includes(
        kind,
      ) && (
        <>
          {kind === 'memories' && <SelectField label="Тип воспоминания" value={mediaType} onChange={setMediaType} items={['photo', 'video']} />}
          {kind !== 'places' && <label className="field">
              {kind === 'memories' ? 'Location' : 'Address'}
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where will we find it?"
              />
            </label>}
          {kind !== 'memories' && (
            <div className="place-link-field">
              <label className="field">
                Ссылка на сайт
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ресторан.ru"
                />
              </label>
              {kind === 'places' && <button type="button" className="secondary place-autofill" onClick={() => void fillPlaceFromLink()} disabled={metadataLoading || !url.trim()}>{metadataLoading ? 'Ищем данные…' : 'Заполнить по ссылке'}</button>}
              {metadataStatus && <p className="field-hint place-metadata-status">{metadataStatus}</p>}
            </div>
          )}
          {kind !== 'places' && <label className="upload-field">
            <Upload size={20} />
            <span>
              {image ? 'Файл выбран · выбрать другой' : mediaType === 'video' ? 'Добавить видео' : 'Добавить фото'}
              <small>{mediaType === 'video' ? 'MP4 или WebM' : 'JPG, PNG или WebP'}</small>
            </span>
            <input
              type="file"
              accept={mediaType === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSaving(true);
                  try {
                    setImage(await upload(f));
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }
              }}
            />
            </label>}
          {kind === 'places' && (
            <SelectField
              label="Budget"
              value={budget}
              onChange={setBudget}
              items={['free', '₽', '₽₽', '₽₽₽']}
            />
          )}
        </>
      )}
      {kind === 'wishlist_items' && (
        <label className="switch-row">
          Just for me
          <Switch checked={priv} onCheckedChange={setPriv} />
        </label>
      )}
      {['gratitudes', 'events'].includes(kind) && (
        <label className="switch-row">
          {kind === 'gratitudes'
            ? 'Keep it sealed until later'
            : 'Make it a surprise'}
          <Switch checked={later} onCheckedChange={setLater} />
        </label>
      )}
      {(kind === 'time_capsules' || later) && (
        <label className="field">
          The moment it opens
          <input
            type="datetime-local"
            required
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            value={unlock}
            onChange={(e) => setUnlock(e.target.value)}
          />
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary full" disabled={saving}>
        {saving
          ? 'Сохраняем этот момент…'
          : editing
            ? 'Сохранить изменения'
            : 'Добавить в наше пространство'}
        <Plus size={17} />
      </button>
    </form>
  );
}
