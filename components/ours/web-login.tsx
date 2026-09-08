'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/ours/store';
import type { Space } from '@/lib/ours/types';

const authUrl = 'https://kytslltcnuywdcuayphj.supabase.co/auth/v1';
// Public application key. Database service credentials stay on the server.
const publishableKey = 'sb_publishable_T8upWsuhL_hZWqb6cStIiQ_C7or4EvK';

export function WebLogin({ onSignedIn }: { onSignedIn: (space: Space) => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const endpoint = signup ? 'signup' : 'token?grant_type=password';
      const response = await fetch(`${authUrl}/${endpoint}`, {
        method: 'POST', headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json() as {
        access_token?: string;
        error_code?: string;
        error?: string;
        msg?: string;
        error_description?: string;
      };
      if (!response.ok) {
        if (data.error_code === 'email_not_confirmed') throw new Error('Подтвердите почту по ссылке в письме, затем войдите.');
        if (response.status === 429) throw new Error('Слишком много попыток. Подождите немного.');
        throw new Error(
          data.error_description ?? data.msg ?? data.error ??
            (signup ? 'Не удалось зарегистрироваться.' : 'Не удалось войти.'),
        );
      }
      if (!data.access_token) {
        setMessage('Подтвердите почту по ссылке в письме, затем вернитесь сюда и войдите.');
        setSignup(false); setPassword(''); return;
      }
      const space = await api<Space>('web-auth', 'POST', { access_token: data.access_token });
      setPassword(''); onSignedIn(space);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось подключиться. Попробуйте ещё раз.');
    } finally { setBusy(false); }
  }
  return <main style={{ maxWidth: 440, margin: '8vh auto', padding: 24 }}>
    <h1>Наше пространство</h1>
    <p>Войдите, чтобы сохранять планы и покупки и делиться ими друг с другом.</p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
      <label>Почта<input style={{ display: 'block', width: '100%', padding: 12 }} required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Пароль<input style={{ display: 'block', width: '100%', padding: 12 }} required minLength={8} type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
      {message && <p role="status">{message}</p>}
      <button type="submit" disabled={busy} style={{ padding: 16, borderRadius: 20, background: '#252a23', color: 'white' }}>{busy ? 'Подождите…' : signup ? 'Зарегистрироваться' : 'Войти'}</button>
      <button type="button" disabled={busy} onClick={() => { setSignup(!signup); setMessage(''); }}>{signup ? 'Уже есть аккаунт? Войти' : 'Первый раз? Создать аккаунт'}</button>
    </form>
    <p style={{ marginTop: 24 }}>У каждого свой аккаунт. После входа один из вас создаёт пространство и отправляет приглашение другому.</p>
  </main>;
}
