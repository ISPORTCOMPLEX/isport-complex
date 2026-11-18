import Link from 'next/link';
import type { IceToday } from '@/lib/booking/iceToday';

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const eur = (v: number) => `${v.toLocaleString('sk-SK')} €`;

// Lišta nad hlavičkou ako výsledková tabuľa NHL: hodiny dňa na ľade – prebehlo, trénuje sa, voľné (s cenou), obsadené.
// Voľná hodina vedie rovno do rezervácie. Večerná (vyššia) cena má žltý pásik hore.
export function IceStrip({ ice, nowHour }: { ice: IceToday; nowHour: number }) {
  if (!ice.iso || !ice.slots.length) return null;
  const today = ice.day === 'dnes';
  const base = Math.min(...ice.slots.map((s) => s.price));
  // dnes: dve hodiny dozadu, aby bolo vidno, čo sa práve deje; ďalej sa lišta posúva vodorovne
  const from = today ? nowHour - 2 : 0;
  const slots = ice.slots.filter((s) => s.hour >= from);
  if (!slots.length) return null;
  return (
    <div className="is" aria-label={today ? 'Ľad dnes' : 'Ľad zajtra'}>
      <div className="is__in">
        <span className="is__lbl">
          <b>{today ? 'Ľad dnes' : 'Ľad zajtra'}</b>
          <span>{ice.dayLabel}</span>
        </span>
        <ol className="is__row">
          {slots.map((s) => {
            const past = today && s.hour < nowHour;
            const cur = today && s.hour === nowHour;
            const live = cur && !s.free;
            const peak = s.price > base;
            const cls = `is__c${past ? ' is-past' : ''}${live ? ' is-live' : ''}${peak && !past ? ' is-peak' : ''}`;
            const body = (
              <>
                <b className="disp">{pad(s.hour)}</b>
                <span>{past ? 'prebehlo' : live ? 'trénuje sa' : cur && !s.ok ? 'práve teraz' : s.ok ? `voľné, ${eur(s.price)}` : 'obsadené'}</span>
              </>
            );
            return (
              <li key={s.hour}>
                {s.ok && !past ? (
                  <Link href={`/rezervacia?datum=${ice.iso}&cas=${s.hour}`} className={`${cls} is-free`} aria-label={`${pad(s.hour)}, voľné, ${eur(s.price)} – rezervovať`}>
                    {body}
                  </Link>
                ) : (
                  <span className={cls}>{body}</span>
                )}
              </li>
            );
          })}
        </ol>
        <Link href={`/rezervacia?datum=${ice.iso}`} className="is__all" aria-label="Celý rozpis ľadu">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
