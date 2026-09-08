'use client';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Check, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { useSpace } from '@/lib/ours/store';
import { type Entry } from '@/lib/ours/types';
import { Empty, FilterTabs, PageHeading } from './primitives';
import { CreateSheet } from './create';

export function Purchases() {
  const { space, add, update, remove, notify } = useSpace();
  const [tab, setTab] = useState('shop');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const items = space.entries.shopping_items.filter((item) =>
    tab === 'bought'
      ? item.status === 'completed'
      : tab === 'shop'
        ? item.category !== 'желания' && item.status !== 'completed'
        : item.category === 'желания' && item.status !== 'completed',
  );
  const open = items.filter((item) => item.status !== 'completed');
  const marked = items.filter((item) => item.status === 'in_cart');
  async function toggle(item: Entry) {
    const nextStatus = item.status === 'completed' ? 'open' : item.status === 'in_cart' ? 'open' : 'in_cart';
    await update('shopping_items', item.id, {
      status: nextStatus,
    });
    notify(nextStatus === 'in_cart' ? 'Отмечено в корзине.' : 'Сняли отметку.');
  }
  async function addLines(value: string) {
    const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    setDraft('');
    for (const title of lines) await add('shopping_items', { title, category: tab === 'shop' ? 'магазин' : 'желания' });
    notify(lines.length === 1 ? 'Добавлено в список.' : `Добавлено пунктов: ${lines.length}.`);
    draftRef.current?.focus();
  }
  async function completeAll() {
    if (!marked.length) return;
    await Promise.all(marked.map((item) => update('shopping_items', item.id, { status: 'completed' })));
    setTab('bought');
    notify(`В «Куплено» перемещено: ${marked.length}.`);
  }
  function onDraftKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addLines(draft); }
  }
  return (
    <>
      <PageHeading label="НАШИ ПОКУПКИ" title={<>Списочек для <em>любимочек.</em></>} subtitle="То, что нужно купить. И то, что просто хочется." />
      <FilterTabs items={['shop', 'wishes', 'bought']} value={tab} onChange={setTab} />
      {tab !== 'bought' && <div className="purchase-composer">
        <span className="purchase-composer-icon">{tab === 'shop' ? <ShoppingBag size={20} /> : <Sparkles size={20} />}</span>
        <textarea ref={draftRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onDraftKeyDown} rows={1} placeholder={tab === 'shop' ? 'Что купить?' : 'Чего хочется?'} aria-label={tab === 'shop' ? 'Новая покупка' : 'Новое желание'} />
        <button className="purchase-add" onClick={() => void addLines(draft)} disabled={!draft.trim()} aria-label="Добавить"><Plus size={20} /></button>
      </div>}
      {tab !== 'bought' && <p className="purchase-hint">Нажми Enter — появится новая строка. Отмеченные товары останутся в списке.</p>}
      <div className="purchase-heading"><span>{tab === 'bought' ? 'Куплено' : tab === 'shop' ? 'Нужно купить' : 'Желания'}</span><small>{tab === 'bought' ? items.length : `${open.length} ${open.length === 1 ? 'пункт' : 'пункта'}`}</small></div>
      <div className="purchase-list">
        {items.map((item) => <PurchaseRow key={item.id} item={item} onToggle={() => void toggle(item)} onRemove={() => void remove('shopping_items', item.id)} />)}
      </div>
      {tab === 'shop' && <button className="purchase-complete-all" onClick={() => void completeAll()} disabled={!marked.length}><Check size={17} /> Всё купили{marked.length > 0 ? ` · ${marked.length}` : ''}</button>}
      {!items.length && <Empty title={tab === 'bought' ? 'Пока ничего не купили.' : tab === 'shop' ? 'Список пока пуст.' : 'Желаний пока нет.'} text={tab === 'bought' ? 'Отмеченные покупки появятся здесь.' : tab === 'shop' ? 'Добавьте то, что нужно взять в магазине.' : 'Сохраните вещь, которую хочется однажды купить.'} onAdd={tab === 'bought' ? undefined : () => setCreateOpen(true)} />}
      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} initial="shopping_items" />
    </>
  );
}
function PurchaseRow({ item, onToggle, onRemove }: { item: Entry; onToggle: () => void; onRemove: () => void }) {
  const completed = item.status === 'completed';
  const marked = completed || item.status === 'in_cart';
  return <div className={'purchase-row ' + (completed ? 'completed ' : '') + (marked ? 'marked' : '')}><button className="purchase-check" onClick={onToggle} aria-label={completed ? 'Вернуть в список' : marked ? 'Снять отметку' : 'Отметить в корзине'}>{marked ? <Check size={15} /> : null}</button><div><b>{item.title}</b>{item.body && <small>{item.body}</small>}</div>{item.category === 'желания' ? <Sparkles size={17} /> : <ShoppingBag size={17} />}<button className="purchase-remove" onClick={onRemove} aria-label="Удалить"><Trash2 size={15} /></button></div>;
}
