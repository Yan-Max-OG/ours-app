'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { useSpace } from '@/lib/ours/store';
import { day } from '@/lib/ours/types';
export default function Wrapped({ back }: { back: () => void }) {
  const { space, notify } = useSpace();
  const [step, setStep] = useState(0);
  const month = day().slice(0, 7);
  const label = new Date()
    .toLocaleDateString('en', { month: 'long' })
    .toUpperCase();
  const count = (k: 'events' | 'tasks' | 'gratitudes' | 'places') =>
    space.entries[k].filter(
      (e) =>
        e.created_at.startsWith(month) &&
        (k !== 'tasks' || e.status === 'completed') &&
        (k !== 'events' || e.category === 'date'),
    ).length;
  const slides = [
    {
      big: label,
      small: 'OUR MONTH, IN LITTLE MOMENTS',
      text: 'The days went by. We made them ours.',
    },
    {
      big: String(count('events')),
      small: 'DATES MADE FOR US',
      text: 'Time that belonged to nobody else.',
    },
    {
      big: String(count('tasks')),
      small: 'LITTLE THINGS, DONE',
      text: 'Even the everyday stuff feels different with you.',
    },
    {
      big: String(count('gratitudes')),
      small: 'THANK-YOUS WORTH KEEPING',
      text: 'We noticed. We said it.',
    },
    {
      big: String(count('places')),
      small: 'NEW POSSIBILITIES',
      text: 'Somewhere to go. Something to look forward to.',
    },
    {
      big: 'US.',
      small: `THIS WAS OUR ${label}`,
      text: 'Here’s to everything still ahead.',
    },
  ];
  async function share() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.fillStyle = '#292e28';
    c.fillRect(0, 0, 1080, 1350);
    c.fillStyle = '#d7dfc2';
    c.font = '32px Arial';
    c.fillText('OURS / OUR MONTH', 90, 120);
    c.font = '110px Georgia';
    c.fillText(label, 90, 340);
    c.font = '160px Georgia';
    c.fillText('A little life.', 90, 560);
    c.fillText('All ours.', 90, 750);
    c.font = '36px Arial';
    c.fillText(
      `${count('events')} dates · ${count('gratitudes')} thank-yous`,
      90,
      960,
    );
    c.fillText(`${count('tasks')} little things done together`, 90, 1030);
    c.font = '28px Arial';
    c.fillText(space.members.map((m) => m.first_name).join(' & '), 90, 1220);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/png'),
    );
    if (!blob) return;
    const file = new File([blob], 'our-month.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Our month' });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'our-month.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Your month card is ready to share.');
  }
  return (
    <section className="wrapped">
      <button className="text-link" onClick={back}>
        <ArrowLeft size={17} /> Back to us
      </button>
      <div className="story-progress">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={'Story ' + (i + 1)}
            className={i <= step ? 'seen' : ''}
            onClick={() => setStep(i)}
          />
        ))}
      </div>
      <div className="wrapped-slide" key={step}>
        <span className="eyebrow">{slides[step].small}</span>
        <h1>{slides[step].big}</h1>
        <p>{slides[step].text}</p>
      </div>
      <div className="wrapped-controls">
        <button
          className="light-button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft size={18} />
        </button>
        {step === slides.length - 1 ? (
          <button className="light-button" onClick={() => void share()}>
            Keep & share our month <Download size={17} />
          </button>
        ) : (
          <button
            className="light-button"
            onClick={() => setStep((s) => s + 1)}
          >
            The next little thing <ArrowRight size={17} />
          </button>
        )}
      </div>
    </section>
  );
}
