'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useSpace, api } from '@/lib/ours/store';
export function Photo({
  src,
  alt,
  className = '',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState(
    src?.startsWith('storage:') ? '' : (src ?? ''),
  );
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (!src?.startsWith('storage:')) {
      setUrl(src ?? '');
      return;
    }
    let active = true;
    api<{ url: string }>('photo?path=' + encodeURIComponent(src.slice(8)))
      .then((d) => {
        if (active) setUrl(d.url);
      })
      .catch(() => setBad(true));
    return () => {
      active = false;
    };
  }, [src]);
  return url && !bad ? (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setBad(true)}
    />
  ) : (
    <div className={'photo-fallback ' + className}>
      <span>OUR LITTLE WORLD</span>
    </div>
  );
}
export function Media({
  src,
  alt,
  type = 'photo',
  className = '',
}: {
  src: string | null | undefined;
  alt: string;
  type?: 'photo' | 'video';
  className?: string;
}) {
  const [url, setUrl] = useState(src?.startsWith('storage:') ? '' : (src ?? ''));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (!src?.startsWith('storage:')) {
      setUrl(src ?? '');
      return;
    }
    let active = true;
    api<{ url: string }>('photo?path=' + encodeURIComponent(src.slice(8)))
      .then((d) => { if (active) setUrl(d.url); })
      .catch(() => setBad(true));
    return () => { active = false; };
  }, [src]);
  if (!url || bad) return <div className={'photo-fallback ' + className}><span>{type === 'video' ? 'ВИДЕО' : 'OUR LITTLE WORLD'}</span></div>;
  return type === 'video' ? <video className={className} src={url} controls playsInline preload="metadata" aria-label={alt} onError={() => setBad(true)} /> : <img src={url} alt={alt} className={className} loading="lazy" onError={() => setBad(true)} />;
}
export function PageHeading({
  label,
  title,
  subtitle,
  action,
  back,
}: {
  label: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  back?: () => void;
}) {
  return (
    <div className="page-heading">
      {back && (
        <button className="back-link" onClick={back}>
          <ArrowLeft size={16} /> Back to us
        </button>
      )}
      <span className="eyebrow">{label}</span>
      <div>
        <h1>{title}</h1>
        {action}
      </div>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
export function FilterTabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const labels: Record<string, string> = { Tasks: 'Задачи', Calendar: 'Календарь', Rituals: 'Ритуалы', Today: 'Сегодня', Upcoming: 'Скоро', Someday: 'Когда-нибудь', Completed: 'Завершённые', 'All places': 'Все места', Coffee: 'Кофе', Restaurants: 'Рестораны', Travel: 'Путешествия', Nature: 'Природа', Visited: 'Посещённые', 'Daily question': 'Вопрос дня', 'Weekly pulse': 'Пульс недели', 'Conversation cards': 'Карточки для разговора', shop: 'Нужно купить', wishes: 'Желания', bought: 'Куплено', all: 'Все', photo: 'Фото', video: 'Видео' };
  return (
    <Tabs value={value} onValueChange={(v) => onChange(String(v))}>
      <TabsList className="filter-tabs" aria-label="View">
        {items.map((i) => (
          <TabsTrigger key={i} value={i}>
            {labels[i] ?? i}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
export function Empty({
  title,
  text,
  onAdd,
  addLabel = 'Make the first one',
}: {
  title: string;
  text: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">◎</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {onAdd && (
        <button className="primary" onClick={onAdd}>
          {addLabel} <Plus size={16} />
        </button>
      )}
    </div>
  );
}
export function Panel({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="bottom" className="ours-sheet">
        <div className="sheet-handle" />
        <SheetTitle className="sheet-title">{title}</SheetTitle>
        <SheetDescription className="sheet-description">
          {description ?? 'A little moment in your shared space.'}
        </SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
export function SectionLink({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button className="section-link" onClick={onClick}>
      <span>
        {children}
        {title}
      </span>
      <ArrowRight size={18} />
    </button>
  );
}
export function Avatar({ id, size = '' }: { id: string; size?: string }) {
  const { space } = useSpace();
  const index = space.members.findIndex((m) => m.id === id);
  const p = space.members[index];
  return (
    <span
      className={'avatar ' + (index === 1 ? 'second ' : '') + size}
      title={p?.first_name ?? 'Both'}
    >
      {p?.photo_url ? (
        <img src={p.photo_url} alt={p.first_name} />
      ) : (
        (p?.first_name.charAt(0) ?? '↔')
      )}
    </span>
  );
}
