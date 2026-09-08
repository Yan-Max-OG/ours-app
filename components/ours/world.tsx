'use client';
import { useState, useRef } from 'react';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { useSpace } from '@/lib/ours/store';
import type { Openers } from './today';
export default function World({ go, detail }: Openers) {
  const { space } = useSpace();
  const [angle, setAngle] = useState(0);
  const start = useRef(0);
  const memories = space.entries.memories;
  const points = memories.map((m, i) => ({
    m,
    x: 50 + Math.cos(i * 2.399) * Math.min(34, 12 + i * 4),
    y: 48 + Math.sin(i * 2.399) * Math.min(30, 10 + i * 4),
  }));
  const stars = Array.from({ length: 65 }, (_, i) => ({
    x: (i * 47.7 + 13) % 100,
    y: (i * 29.3 + 7) % 100,
    r: i % 6 === 0 ? 1.4 : 0.65,
  }));
  return (
    <section
      className="world-scene"
      onPointerDown={(e) => {
        start.current = e.clientX;
      }}
      onPointerUp={(e) =>
        setAngle((a) => a + (e.clientX - start.current) * 0.2)
      }
    >
      <div className="world-header">
        <button className="text-link" onClick={() => go('us')}>
          <ArrowLeft size={17} /> Back to us
        </button>
        <span className="eyebrow">CONSTELLATION 001</span>
      </div>
      <div className="world-copy">
        <span className="eyebrow">EVERY LITTLE MOMENT LEAVES A LIGHT</span>
        <h1>
          Our little <em>universe.</em>
        </h1>
        <p>Made of everywhere we’ve been. Everything we remember.</p>
      </div>
      <svg
        className="constellation"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Our memories as a personal constellation"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r / 4}
            fill="#c5d5b9"
            opacity={0.3 + (i % 4) * 0.15}
          />
        ))}
        {points.map((p, i) => {
          const next = points[(i + 1) % points.length];
          return (
            <line
              key={'l' + i}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              stroke="#aabb9855"
              strokeWidth=".15"
            />
          );
        })}
        {points.map(({ m, x, y }, i) => (
          <g
            key={m.id}
            role="button"
            aria-label={'Open memory ' + m.title}
            tabIndex={0}
            onClick={() => detail('memories', m)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') detail('memories', m);
            }}
          >
            <circle cx={x} cy={y} r="5" fill="transparent" />
            <circle
              className="star-halo"
              cx={x}
              cy={y}
              r="2"
              fill="#cbdcb318"
            />
            <circle cx={x} cy={y} r=".65" fill="#e5efd5" />
            <text
              x={x + 2.8}
              y={y + 1}
              fill="#d0d6c5"
              fontSize="1.8"
              style={{ fontFamily: 'Arial' }}
            >
              {String(i + 1).padStart(2, '0')}
            </text>
          </g>
        ))}
      </svg>
      <div className="world-footer">
        <span>{memories.length} MEMORIES · ONE SHARED SKY</span>
        <button onClick={() => setAngle(0)}>
          <RotateCcw size={16} /> Reset view
        </button>
      </div>
      <p className="world-hint">Drag to drift. Tap a light to remember.</p>
      {memories.length === 0 && (
        <button className="light-button" onClick={() => go('memories')}>
          Give your sky its first memory →
        </button>
      )}
    </section>
  );
}
