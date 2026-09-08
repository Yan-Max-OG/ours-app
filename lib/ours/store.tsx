'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { seed } from './demo';
import {
  kinds,
  type Couple,
  type Entry,
  type Kind,
  type Preferences,
  type Space,
} from './types';
import { haptic, initTelegram, telegram } from './telegram';
import { visibleEntry, validateEntry } from './permissions';
interface Store {
  space: Space;
  demo: boolean;
  loading: boolean;
  error: string;
  notice: string;
  online: boolean;
  add: (kind: Kind, value: Partial<Entry>) => Promise<Entry>;
  update: (
    kind: Kind,
    id: string,
    patch: Partial<Entry> & { reaction?: string },
  ) => Promise<void>;
  remove: (kind: Kind, id: string) => Promise<void>;
  refresh: () => Promise<void>;
  preferences: (value: Partial<Preferences>) => Promise<void>;
  couple: (value: Partial<Couple>) => Promise<void>;
  profile: (value: { first_name?: string; photo_url?: string | null }) => Promise<void>;
  switchPerson: () => void;
  notify: (text: string) => void;
  request: (path: string, method?: string, value?: unknown) => Promise<unknown>;
  upload: (file: File) => Promise<string>;
}
const Context = createContext<Store | null>(null);
export const useSpace = () => {
  const c = useContext(Context);
  if (!c) throw new Error('Space provider is missing');
  return c;
};
let sessionToken = '';
export async function api<T>(
  path: string,
  method = 'GET',
  value?: unknown,
): Promise<T> {
  const r = await fetch('/api/ours/' + path, {
    method,
    headers: {
      ...(value instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(sessionToken ? { Authorization: 'Bearer ' + sessionToken } : {}),
    },
    body:
      value === undefined
        ? undefined
        : value instanceof FormData
          ? value
          : JSON.stringify(value),
  });
  const body = (await r.json()) as T & {
    error?: string;
    session_token?: string;
  };
  if (body.session_token) {
    sessionToken = body.session_token;
    delete body.session_token;
  }
  if (!r.ok) throw new Error(body.error ?? 'Could not save. Please try again.');
  return body;
}
export function SpaceProvider({ children }: { children: ReactNode }) {
  const [space, setSpace] = useState(seed);
  const state = useRef(space);
  state.current = space;
  const [demo, setDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(true);
  const busy = useRef(new Set<string>());
  const initialized = useRef(false);
  const notify = (s: string) => setNotice(s);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4200);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    let alive = true;
    const clean = initTelegram();
    const start = async () => {
      if (location.hash.includes('tgWebAppData') && !telegram()?.initData) {
        for (let i = 0; i < 80 && !telegram()?.initData; i++)
          await new Promise((r) => setTimeout(r, 50));
      }
      const raw = telegram()?.initData;
      if (!raw && location.hash.includes('tgWebAppData')) {
        setDemo(false);
        setError(
          'Telegram could not finish opening OURS. Please reopen the Mini App.',
        );
        setLoading(false);
        return;
      }
      if (raw) {
        setDemo(false);
        try {
          const s = await api<Space>('auth', 'POST', { initData: raw });
          if (alive) setSpace(s);
        } catch (e) {
          if (alive) setError(String((e as Error).message));
        }
      } else {
        try {
          const saved = localStorage.getItem('ours-demo-v1');
          if (saved) {
            const s = JSON.parse(saved) as Space;
            if (
              s.couple &&
              s.entries &&
              kinds.every((k) => Array.isArray(s.entries[k]))
            )
              setSpace(s);
          }
        } catch {
          notify('Your demo could not be restored. A fresh space is ready.');
        }
      }
      if (alive) {
        initialized.current = true;
        setLoading(false);
      }
    };
    void start();
    return () => {
      alive = false;
      clean();
    };
  }, []);
  useEffect(() => {
    if (demo && initialized.current && !loading) {
      try {
        localStorage.setItem('ours-demo-v1', JSON.stringify(space));
      } catch {
        notify('Storage is full. Export your space before closing this tab.');
      }
    }
  }, [space, demo, loading]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = space.couple?.theme ?? 'SAGE';
    root.dataset.reduced = space.preferences.reduced_motion ? 'true' : 'false';
    const low = navigator.hardwareConcurrency <= 2;
    root.dataset.lowPower = String(low);
  }, [space.couple?.theme, space.preferences.reduced_motion]);
  const refresh = async () => {
    if (demo) return;
    const next = await api<Space>('state');
    if (busy.current.size === 0) setSpace(next);
  };
  useEffect(() => {
    if (demo || loading || error) return;
    const timer = setInterval(() => {
      if (document.hidden || busy.current.size) return;
      api<Space>('state')
        .then((next) => {
          setOnline(true);
          if (busy.current.size) return;
          const previous = state.current;
          const changed = kinds.some((k) =>
            next.entries[k].some(
              (r) =>
                r.creator_id !== next.user.id &&
                !previous.entries[k].some(
                  (o) => o.id === r.id && o.updated_at === r.updated_at,
                ),
            ),
          );
          if (changed) setNotice('A little update from your person. Just now.');
          setSpace(next);
        })
        .catch(() => setOnline(false));
    }, 8000);
    return () => clearInterval(timer);
  }, [demo, loading, error]);
  const add = async (k: Kind, value: Partial<Entry>) => {
    validateEntry(value);
    const row: Entry = {
      id: crypto.randomUUID(),
      couple_id: state.current.couple?.id ?? 'demo',
      creator_id: state.current.user.id,
      title: '',
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
      ...value,
    };
    busy.current.add(row.id);
    setSpace((s) => ({
      ...s,
      entries: { ...s.entries, [k]: [row, ...s.entries[k]] },
    }));
    try {
      const saved = demo ? row : await api<Entry>(k, 'POST', value);
      if (!demo)
        setSpace((s) => ({
          ...s,
          entries: {
            ...s.entries,
            [k]: s.entries[k].map((r) => (r.id === row.id ? saved : r)),
          },
        }));
      haptic('success');
      return saved;
    } catch (e) {
      setSpace((s) => ({
        ...s,
        entries: {
          ...s.entries,
          [k]: s.entries[k].filter((r) => r.id !== row.id),
        },
      }));
      notify((e as Error).message);
      throw e;
    } finally {
      busy.current.delete(row.id);
    }
  };
  const update = async (
    k: Kind,
    id: string,
    patch: Partial<Entry> & { reaction?: string },
  ) => {
    if (busy.current.has(id)) return;
    const before = state.current.entries[k].find((r) => r.id === id);
    if (!before) return;
    busy.current.add(id);
    const actual = patch.reaction
      ? { details: { ...before.details, reaction: patch.reaction } }
      : patch;
    setSpace((s) => ({
      ...s,
      entries: {
        ...s.entries,
        [k]: s.entries[k].map((r) =>
          r.id === id
            ? { ...r, ...actual, updated_at: new Date().toISOString() }
            : r,
        ),
      },
    }));
    try {
      if (!demo) await api(`${k}/${id}`, 'PATCH', patch);
      haptic(patch.status === 'completed' ? 'success' : 'light');
    } catch (e) {
      setSpace((s) => ({
        ...s,
        entries: {
          ...s.entries,
          [k]: s.entries[k].map((r) => (r.id === id ? before : r)),
        },
      }));
      notify((e as Error).message);
      throw e;
    } finally {
      busy.current.delete(id);
    }
  };
  const remove = async (k: Kind, id: string) => {
    const before = state.current.entries[k].find((r) => r.id === id);
    if (!before) return;
    if (!demo) await api(`${k}/${id}`, 'DELETE');
    setSpace((s) => ({
      ...s,
      entries: { ...s.entries, [k]: s.entries[k].filter((r) => r.id !== id) },
    }));
    notify('Removed from your space.');
  };
  const preferences = async (p: Partial<Preferences>) => {
    const next = { ...state.current.preferences, ...p };
    if (!demo) await api('preferences', 'PATCH', next);
    setSpace((s) => ({ ...s, preferences: next }));
  };
  const couple = async (p: Partial<Couple>) => {
    if (!demo) await api('couple', 'PATCH', p);
    setSpace((s) => ({
      ...s,
      couple: s.couple ? { ...s.couple, ...p } : null,
    }));
  };
  const profile = async (p: { first_name?: string; photo_url?: string | null }) => {
    const first_name = p.first_name?.trim();
    if (first_name !== undefined && (first_name.length < 1 || first_name.length > 80))
      throw new Error('Use a name between 1 and 80 characters');
    if (!demo) await api('profile', 'PATCH', { ...p, first_name });
    setSpace((s) => ({
      ...s,
      user: { ...s.user, ...(first_name === undefined ? {} : { first_name }), ...(p.photo_url === undefined ? {} : { photo_url: p.photo_url ?? undefined }) },
      members: s.members.map((m) => m.id === s.user.id ? { ...m, ...(first_name === undefined ? {} : { first_name }), ...(p.photo_url === undefined ? {} : { photo_url: p.photo_url ?? undefined }) } : m),
    }));
  };
  const request = async (path: string, method = 'GET', value?: unknown) => {
    if (!demo) {
      const r = await api(path, method, value);
      if (['join', 'disconnect', 'invite'].includes(path)) await refresh();
      return r;
    }
    if (path === 'invite')
      return {
        link: location.origin + '/?demo=onboarding',
        token: 'demo',
        expires_in: 'Demo invitation · this device only',
      };
    if (path === 'disconnect') {
      setSpace((s) => ({ ...s, couple: null, members: [s.user] }));
      return {};
    }
    if (path === 'join') {
      setSpace(seed());
      return {};
    }
    if (path === 'account') {
      localStorage.removeItem('ours-demo-v1');
      setSpace(seed());
      return {};
    }
    if (path === 'export')
      return {
        ...state.current,
        entries: Object.fromEntries(
          kinds.map((k) => [
            k,
            state.current.entries[k]
              .map((r) =>
                visibleEntry(
                  k,
                  r,
                  state.current.user.id,
                  state.current.entries[k],
                ),
              )
              .filter(Boolean),
          ]),
        ),
      };
    return {};
  };
  const upload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024)
      throw new Error('Choose a photo smaller than 8 MB');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      throw new Error('Choose JPG, PNG or WebP');
    if (demo) {
      if (file.size > 2 * 1024 * 1024)
        throw new Error(
          'For this local demo, choose a photo smaller than 2 MB',
        );
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    const f = new FormData();
    f.append('file', file);
    return (await api<{ path: string }>('upload', 'POST', f)).path;
  };
  const exposed: Space = demo
    ? {
        ...space,
        entries: Object.fromEntries(
          kinds.map((k) => [
            k,
            space.entries[k]
              .map((r) => visibleEntry(k, r, space.user.id, space.entries[k]))
              .filter((r): r is Entry => r !== null),
          ]),
        ) as Space['entries'],
      }
    : space;
  return (
    <Context.Provider
      value={{
        space: exposed,
        demo,
        loading,
        error,
        notice,
        online,
        add,
        update,
        remove,
        refresh,
    preferences,
    couple,
    profile,
        switchPerson: () =>
          setSpace((s) => ({
            ...s,
            user: s.members.find((m) => m.id !== s.user.id) ?? s.user,
          })),
        notify,
        request,
        upload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
