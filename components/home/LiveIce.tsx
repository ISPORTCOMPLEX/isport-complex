import type { T } from '@/lib/i18n/translate';

// Stav ľadu „práve teraz“ pre tabuľu v úvode. Mená tímov sa verejne neukazujú – len či je ľad voľný alebo obsadený.
export type LiveSlot = { hour: number; free: boolean; bookable: boolean };
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function iceNow(slots: LiveSlot[], hour: number, openHour: number, closeHour: number, t: T): { tone: 'busy' | 'free' | 'closed'; text: string } | null {
  if (!slots.length) return null;
  const cur = slots.find((s) => s.hour === hour) ?? null;
  if (hour < openHour) return { tone: 'closed', text: t('Ľad sa pripravuje · prvý blok o {time}', { time: hh(openHour) }) };
  if (hour >= closeHour || !cur) return { tone: 'closed', text: t('Na dnes je po tréningoch · zajtra od {time}', { time: hh(openHour) }) };
  if (!cur.free) {
    let end = hour + 1;
    while (slots.find((s) => s.hour === end && !s.free)) end++;
    return { tone: 'busy', text: t('Práve sa trénuje · do {time}', { time: hh(end) }) };
  }
  return { tone: 'free', text: t('Ľad je práve voľný') };
}
