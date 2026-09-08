'use client';
import { useState } from 'react';
import { Download, Check, ArrowRight, Copy, UserRound } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSpace } from '@/lib/ours/store';
import { telegram } from '@/lib/ours/telegram';
import { day, type Preferences } from '@/lib/ours/types';
import { PageHeading } from './primitives';
import { SelectField } from './create';
import { Confirmation } from './detail';
export function Settings({ back }: { back: () => void }) {
  const { space, demo, preferences, couple, profile, request, switchPerson, notify } =
    useSpace();
  const [destructive, setDestructive] = useState('');
  const [p, setP] = useState<Preferences>(space.preferences);
  const [start, setStart] = useState(space.couple?.start_date ?? day());
  const [name, setName] = useState(space.user.first_name);
  const [photoUrl, setPhotoUrl] = useState(space.user.photo_url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      if (start > day())
        throw new Error('Your beginning should be today or earlier');
      await preferences(p);
      await couple({ start_date: start });
      await profile({ first_name: name, photo_url: photoUrl || null });
      notify('Feels a little more like us. Settings saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function writeAccess() {
    const t = telegram();
    if (demo) {
      setP({ ...p, notifications: !p.notifications });
      notify('Demo preference changed. No messages will be sent.');
      return;
    }
    if (!t?.isVersionAtLeast?.('6.9') || !t.requestWriteAccess) {
      setError('Open OURS in a recent Telegram app to allow notifications.');
      return;
    }
    t.requestWriteAccess((ok) => {
      setP((v) => ({ ...v, notifications: ok }));
      if (!ok) notify('No problem. Your space will stay quiet.');
    });
  }
  return (
    <>
      <PageHeading
        label="THE DETAILS THAT MAKE IT OURS"
        title={
          <>
            Make it <em>ours.</em>
          </>
        }
        back={back}
      />
      <div className="settings-layout">
        <section className="settings-card">
          <h3>Твой профиль</h3>
          <div className="profile-edit-preview"><span className="profile-edit-avatar">{photoUrl ? <img src={photoUrl} alt="" /> : <UserRound size={24} />}</span><span><b>{name || 'Your name'}</b><small>Visible to your person</small></span></div>
          <label className="field">Твоё имя<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ян" /></label>
          <label className="field">Ссылка на фото <span className="field-hint">необязательно, только HTTPS</span><input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" /></label>
          <h3>Наше начало</h3>
          <h3>Our beginning</h3>
          <label className="field">
            День, с которого всё началось
            <input
              type="date"
              max={day()}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <h3>Цвет, который похож на нас</h3>
          <div className="theme-options">
            {['MONO', 'SAGE', 'WINE', 'ICE', 'MIDNIGHT'].map((t) => (
              <button
                key={t}
                className={
                  'theme-option theme-' +
                  t +
                  (space.couple?.theme === t ? ' selected' : '')
                }
                onClick={() =>
                  void couple({ theme: t }).catch((e) => setError(e.message))
                }
              >
                <i />
                {t}
                {space.couple?.theme === t && <Check size={12} />}
              </button>
            ))}
          </div>
          <label className="switch-row">
            Мягче анимации
            <Switch
              checked={p.reduced_motion}
              onCheckedChange={(v) => setP({ ...p, reduced_motion: v })}
            />
          </label>
          <label className="switch-row">
            Декоративный уровень нашего пространства
            <Switch
              checked={p.xp_enabled}
              onCheckedChange={(v) => setP({ ...p, xp_enabled: v })}
            />
          </label>
          <p className="muted">
            Интерфейс теперь на русском. Ваши записи могут быть на любом языке.
          </p>
        </section>
        <section className="settings-card">
          <h3>Маленькие напоминания, когда нужно</h3>
          <label className="switch-row">
            Уведомления Telegram
            <Switch
              checked={p.notifications}
              onCheckedChange={(v) => {
                if (v) void writeAccess();
                else setP({ ...p, notifications: false });
              }}
            />
          </label>
          <p className="muted">
            Только общие моменты и короткие записки. В тихие часы — тишина.
          </p>
          <div className="form-columns">
            <label className="field">
              Тишина с
              <input
                type="time"
                value={p.quiet_start.slice(0, 5)}
                onChange={(e) => setP({ ...p, quiet_start: e.target.value })}
              />
            </label>
            <label className="field">
              До
              <input
                type="time"
                value={p.quiet_end.slice(0, 5)}
                onChange={(e) => setP({ ...p, quiet_end: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            Часовой пояс
            <input
              value={p.timezone}
              onChange={(e) => setP({ ...p, timezone: e.target.value })}
              placeholder="Europe/Moscow"
            />
          </label>
          <SelectField
            label="Когда партнёр видит моё настроение?"
            value={p.mood_visibility}
            onChange={(v) => setP({ ...p, mood_visibility: v })}
            items={['after_checkin', 'always', 'private']}
          />
        </section>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary" disabled={busy} onClick={() => void save()}>
        {busy ? 'Сохраняем…' : 'Сохранить настройки'}
        <Check size={17} />
      </button>
      <div className="settings-footer">
        <button
          className="secondary"
          onClick={async () => {
            try {
              const data = await request('export');
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'ours-export.json';
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Download size={16} /> Экспортировать наше пространство
        </button>
        {demo && (
          <button
            className="secondary"
            onClick={() => {
              switchPerson();
              notify('Demo: switched to the other person.');
            }}
          >
            Демо: стать{' '}
            {space.members.find((m) => m.id !== space.user.id)?.first_name ??
              'your person'}
          </button>
        )}
        <button
          className="danger-text"
          onClick={() => setDestructive('disconnect')}
        >
          Отключить наше пространство
        </button>
        <button
          className="danger-text"
          onClick={() => setDestructive('account')}
        >
          Удалить мой аккаунт
        </button>
      </div>
      <Confirmation
        open={Boolean(destructive)}
        onClose={() => setDestructive('')}
        title={
          destructive === 'account'
            ? 'Delete your account?'
            : 'Disconnect your shared space?'
        }
        text={
          destructive === 'account'
            ? 'Your profile and authored records will be permanently removed. Both people will be disconnected. Export anything you want to keep first.'
            : 'Both people will lose access to this shared space. Export anything you want to keep first.'
        }
        onConfirm={async () => {
          await request(
            destructive,
            destructive === 'account' ? 'DELETE' : 'POST',
          );
          if (destructive === 'account' && !demo) location.reload();
        }}
      />
    </>
  );
}
export function Onboarding() {
  const { space, demo, request, notify } = useSpace();
  const [step, setStep] = useState(0);
  const [link, setLink] = useState('');
  const [token, setToken] = useState(
    space.invite_start?.replace(/^invite_/, '') ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('Your person');
  const [preview, setPreview] = useState(false);
  async function invite() {
    setBusy(true);
    try {
      const r = (await request('invite', 'POST')) as { link: string };
      setLink(r.link);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function join() {
    setBusy(true);
    try {
      if (!preview && !demo) {
        const r = (await request('invite-preview', 'POST', { token })) as {
          name: string;
        };
        setName(r.name);
        setPreview(true);
      } else await request('join', 'POST', { token });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding">
      <a className="wordmark" href="/">
        ours<span>●</span>
      </a>
      <div className="onboard-symbol">
        <span />
        <span />
      </div>
      <span className="eyebrow">ONLY TWO. ONLY YOURS.</span>
      <h1>
        {token && preview
          ? `${name} invites you to OURS.`
          : step === 0
            ? 'A little world. Just for two.'
            : step === 1
              ? 'The everyday. The extraordinary.'
              : 'Invite your person.'}
      </h1>
      <p>
        {step === 0
          ? 'Your plans, places, memories, and everything in between.'
          : step === 1
            ? 'Make plans. Say thank you. Save the places you’ll go and the days you never want to forget.'
            : 'It starts with a link. The rest, you’ll make together.'}
      </p>
      {step < 2 && !token ? (
        <button className="primary" onClick={() => setStep((s) => s + 1)}>
          {step === 0 ? 'Make room for us' : 'Find my person'}
          <ArrowRight size={18} />
        </button>
      ) : (
        <>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void invite()}
          >
            {busy
              ? 'One moment…'
              : link
                ? 'Create a fresh invitation'
                : 'Create our space'}
            <ArrowRight size={18} />
          </button>
          {link && (
            <div className="invite-link">
              <input aria-label="Invitation link" readOnly value={link} />
              <button
                aria-label="Copy invitation"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => notify('Invitation copied.'))
                    .catch(() => notify('Select and copy the link above.'))
                }
              >
                <Copy size={18} />
              </button>
              <small>
                {demo
                  ? 'Demo invitation · only this browser'
                  : 'Valid for 48 hours · one person only'}
              </small>
            </div>
          )}
          <div className="join-form">
            <label className="field">
              Already have an invitation?
              <input
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.replace(/^.*[?&]invite=/, '').replace(/^.*invite_/, '').split('&')[0]);
                  setPreview(false);
                }}
                placeholder="Paste an invitation or code"
              />
            </label>
            <button
              className="secondary"
              disabled={!token || busy}
              onClick={() => void join()}
            >
              {preview ? 'Create our shared space' : 'Open invitation'}
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="onboard-progress">
        {[0, 1, 2].map((i) => (
          <i className={i <= step ? 'active' : ''} key={i} />
        ))}
      </div>
    </div>
  );
}
