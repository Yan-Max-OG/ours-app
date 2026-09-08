'use client';
import { useEffect, useRef, useState } from 'react';
import { CarFront, CloudSun, Dice5, ExternalLink, MapPin, Newspaper } from 'lucide-react';
import { api, useSpace } from '@/lib/ours/store';
import { photos, type Entry, type Kind } from '@/lib/ours/types';
import { PageHeading } from './primitives';

export interface Openers { detail: (kind: Kind, row: Entry) => void; create: (kind: Kind) => void; go: (page: string) => void; }
type NewsItem = { title: string; link: string; source: string; published_at: string };
type Venue = { id: string; name: string; kind: string; address: string; website?: string; image: string };
type Weather = { temperature: number; feels: number; wind: number; code: number };
const fallbackVenues: Venue[] = [
  { id: 'sevkabel', name: 'Севкабель Порт', kind: 'пространство у воды', address: 'Кожевенная линия, 40', image: photos.coast },
  { id: 'new-holland', name: 'Новая Голландия', kind: 'остров и прогулка', address: 'Набережная Адмиралтейского канала, 2', image: photos.paris },
  { id: 'birch', name: 'Birch', kind: 'ресторан', address: 'Кировский проспект, 63', image: photos.cafe },
  { id: 'kuznya', name: 'Kuznya House', kind: 'ресторан', address: 'Новая Голландия', image: photos.cafe },
  { id: 'etazhi', name: 'Лофт Проект ЭТАЖИ', kind: 'городское пространство', address: 'Лиговский проспект, 74', image: photos.coast },
];
function weatherLabel(code: number) { if (code === 0) return 'Ясно'; if (code < 4) return 'Переменная облачность'; if (code < 50) return 'Туман'; if (code < 70) return 'Дождь'; if (code < 80) return 'Снег'; return 'Ливень'; }

export function Today(_props: Openers) {
  const { demo } = useSpace();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [venues, setVenues] = useState<Venue[]>(fallbackVenues);
  const [venueLoading, setVenueLoading] = useState(true);
  const [venue, setVenue] = useState<Venue | null>(fallbackVenues[0]);
  const venueIndex = useRef(0);
  useEffect(() => {
    let alive = true;
    api<{ items: NewsItem[] }>('news').then((data) => { if (alive) setNews(data.items); }).catch(() => undefined).finally(() => { if (alive) setNewsLoading(false); });
    fetch('https://api.open-meteo.com/v1/forecast?latitude=59.9386&longitude=30.3141&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Europe%2FMoscow').then((r) => r.json() as Promise<{ current?: { temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number } }>).then((d) => { if (alive && d.current) setWeather({ temperature: Math.round(d.current.temperature_2m), feels: Math.round(d.current.apparent_temperature), code: d.current.weather_code, wind: Math.round(d.current.wind_speed_10m) }); }).catch(() => undefined).finally(() => { if (alive) setWeatherLoading(false); });
    fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent('[out:json][timeout:12];nwr["amenity"~"restaurant|cafe|bar|cinema|theatre"](59.83,30.15,60.08,30.55);out center tags 80;')).then((r) => r.json() as Promise<{ elements: { id: number; tags?: Record<string, string>; center?: { lat: number; lon: number } }[] }>).then((d) => { if (!alive) return; const raw = d.elements.map((item, index) => ({ id: String(item.id), name: item.tags?.name ?? '', kind: item.tags?.amenity ?? 'место', address: [item.tags?.['addr:street'], item.tags?.['addr:housenumber']].filter(Boolean).join(', '), website: item.tags?.website, image: item.tags?.image ?? [photos.cafe, photos.coast, photos.paris][index % 3] })).filter((item) => item.name); const list = [...new Map(raw.map((item) => [item.name.toLocaleLowerCase(), item])).values()]; if (list.length >= 2) { setVenues(list); venueIndex.current = 0; setVenue(list[0]); } }).catch(() => undefined).finally(() => { if (alive) setVenueLoading(false); });
    return () => { alive = false; };
  }, []);
  function pickVenue() {
    if (venues.length < 2) return;
    venueIndex.current = (venueIndex.current + 1) % venues.length;
    setVenue(venues[venueIndex.current]);
  }
  return <><PageHeading label="СЕГОДНЯ" title={<>Что происходит <em>вокруг.</em></>} subtitle="Новости, погода и идеи для сегодняшнего дня." /><div className="today-dashboard">
    <section className="news-card today-news-card"><div className="section-heading"><h3><Newspaper size={18} /> Новости сегодня</h3><span className="eyebrow">РУССКАЯ ЛЕНТА</span></div>{newsLoading ? <p className="news-empty">Загружаем свежие новости…</p> : news.length ? <div className="news-list">{news.map((item) => <a key={item.link} href={item.link} target="_blank" rel="noreferrer"><span><b>{item.title}</b><small>{item.source}{item.published_at ? ` · ${new Date(item.published_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></span><ExternalLink size={16} /></a>)}</div> : <p className="news-empty">{demo ? 'Новости появятся после подключения приложения к Telegram.' : 'Новости временно недоступны.'}</p>}</section>
    <div className="today-mini-grid"><section className="today-widget weather-widget"><div className="widget-top"><span className="eyebrow">САНКТ‑ПЕТЕРБУРГ</span><CloudSun size={22} /></div>{weatherLoading ? <strong>Загружаем…</strong> : weather ? <><strong>{weather.temperature}°</strong><span>{weatherLabel(weather.code)} · ощущается как {weather.feels}°</span><small>Ветер {weather.wind} км/ч</small></> : <span>Погода временно недоступна</span>}</section><a className="today-widget traffic-widget" href="https://yandex.ru/maps/2/saint-petersburg/probki/" target="_blank" rel="noreferrer"><div className="widget-top"><span className="eyebrow">ДОРОГИ</span><CarFront size={22} /></div><strong>Ситуация на дорогах</strong><span>Открыть пробки Санкт‑Петербурга <ExternalLink size={14} /></span></a></div>
    <section className="today-widget place-generator"><div className="widget-top"><span className="eyebrow">НОВЫЕ ЗАВЕДЕНИЯ</span><Dice5 size={22} /></div>{venueLoading ? <p>Ищем интересные места в Санкт‑Петербурге…</p> : venue && <div className="generated-venue"><img src={venue.image} alt={venue.name} /><div className="venue-mark"><MapPin size={24} /></div><span><b>{venue.name}</b><small>{venue.kind}{venue.address ? ` · ${venue.address}` : ''}</small></span></div>}<button className="primary" onClick={() => pickVenue()}><Dice5 size={16} /> Другое место</button><p className="venue-source">Подборка по Санкт‑Петербургу · OpenStreetMap</p></section>
  </div></>;
}
