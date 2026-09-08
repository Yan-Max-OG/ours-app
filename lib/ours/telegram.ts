export interface TelegramApp {
  initData: string;
  version: string;
  colorScheme: string;
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  isVersionAtLeast?: (v: string) => boolean;
  setHeaderColor?: (v: string) => void;
  setBackgroundColor?: (v: string) => void;
  viewportStableHeight?: number;
  safeAreaInset?: { top: number; bottom: number };
  contentSafeAreaInset?: { top: number; bottom: number };
  onEvent?: (name: string, cb: () => void) => void;
  offEvent?: (name: string, cb: () => void) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (f: () => void) => void;
    offClick: (f: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium') => void;
    notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
    selectionChanged: () => void;
  };
  openTelegramLink?: (url: string) => void;
  requestWriteAccess?: (cb: (ok: boolean) => void) => void;
  shareToStory?: (url: string, p: { text: string }) => void;
}
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramApp };
  }
}
export const telegram = () =>
  typeof window === 'undefined' ? undefined : window.Telegram?.WebApp;
export function haptic(
  type: 'light' | 'medium' | 'success' | 'warning' = 'light',
) {
  const t = telegram();
  if (!t?.initData || !t.isVersionAtLeast?.('6.1')) return;
  try {
    if (type === 'success' || type === 'warning')
      t.HapticFeedback?.notificationOccurred(type);
    else t.HapticFeedback?.impactOccurred(type);
  } catch {
    /* Older webviews can expose unsupported methods. */
  }
}
export function initTelegram() {
  const t = telegram();
  if (!t) return () => {};
  t.ready();
  if (t.initData) t.expand();
  const update = () => {
    const root = document.documentElement;
    root.style.setProperty(
      '--tg-safe-top',
      `${Math.max(t.safeAreaInset?.top ?? 0, t.contentSafeAreaInset?.top ?? 0)}px`,
    );
    root.style.setProperty(
      '--tg-safe-bottom',
      `${Math.max(t.safeAreaInset?.bottom ?? 0, t.contentSafeAreaInset?.bottom ?? 0)}px`,
    );
    if (t.viewportStableHeight)
      root.style.setProperty('--tg-viewport', `${t.viewportStableHeight}px`);
    if (t.themeParams.link_color)
      root.style.setProperty('--telegram-accent', t.themeParams.link_color);
  };
  update();
  [
    'viewportChanged',
    'safeAreaChanged',
    'contentSafeAreaChanged',
    'themeChanged',
  ].forEach((e) => t.onEvent?.(e, update));
  return () =>
    [
      'viewportChanged',
      'safeAreaChanged',
      'contentSafeAreaChanged',
      'themeChanged',
    ].forEach((e) => t.offEvent?.(e, update));
}
