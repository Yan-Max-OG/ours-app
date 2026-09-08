'use client';
import { useState } from 'react';
import { Plus, MapPin, ArrowUpRight, Check } from 'lucide-react';
import { useSpace } from '@/lib/ours/store';
import { Empty, FilterTabs, PageHeading, Photo } from './primitives';
import type { Openers } from './today';
export function Places({ detail, create }: Openers) {
  const { space } = useSpace();
  const [filter, setFilter] = useState('All places');
  const items = space.entries.places.filter(
    (p) =>
      filter === 'All places' ||
      (filter === 'Visited'
        ? p.status === 'completed'
        : p.category === filter.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        label="SOMEWHERE WE’LL GO, SOMEDAY"
        title={
          <>
            Our kind of <em>places.</em>
          </>
        }
        subtitle="A shared collection of little escapes."
        action={
          <button className="primary" onClick={() => create('places')}>
            <Plus size={17} />
            <span>Куда это мы?</span>
          </button>
        }
      />
      <div className="places-toolbar">
        <FilterTabs
          items={[
            'All places',
            'Coffee',
            'Restaurants',
            'Travel',
            'Nature',
            'Visited',
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <div className="places-grid">
        {items.map((p, i) => (
          <button
            className={'place-card place-' + (i % 3)}
            key={p.id}
            onClick={() => detail('places', p)}
          >
            <div className="place-image">
              <Photo src={p.image} alt={p.title} />
              <span className="place-category">
                {p.status === 'completed' ? (
                  <>
                    <Check size={12} /> BEEN HERE
                  </>
                ) : (
                  p.category.toUpperCase()
                )}
              </span>
              <span className="place-open">
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className="place-caption">
              <h3>{p.title}</h3>
              <p>
                <MapPin size={12} />
                {String(
                  p.details.address ?? p.details.location ?? 'On our list',
                )}
                <span>{String(p.details.budget ?? '')}</span>
              </p>
            </div>
          </button>
        ))}
      </div>
      {!items.length && (
        <Empty
          title="Your map is still empty."
          text="Save somewhere you want to disappear to together."
          onAdd={() => create('places')}
        />
      )}
    </>
  );
}
