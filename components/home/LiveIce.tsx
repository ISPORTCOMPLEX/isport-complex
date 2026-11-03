import Link from 'next/link';

// Živý stav ľadu pod úvodom: čo sa deje práve teraz a pás celého dnešného dňa.
// Mená tímov sa verejne neukazujú – len či je ľad voľný alebo obsadený.
export type LiveSlot = { hour: number; free: boolean; bookable: boolean };
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function LiveIce({ slots, hour, iso, openHour, closeHour }: { slots: LiveSlot[]; hour: number; iso: string; openHour: number; closeHour: number }) {
  if (!slots.length) return null;
  const nextFree = slots.find((s) => s.hour > hour && s.free && s.bookable) ?? null;
  const cur = slots.find((s) => s.hour === hour) ?? null;
  let title: string;
  let sub: string | null = null;
  let tone: 'busy' | 'free' | 'closed';
  if (hour < openHour) {
    tone = 'closed';
    title = 'Ľad sa ešte len pripravuje';
    sub = `prvý blok o ${hh(openHour)}`;
  } else if (hour >= closeHour || !cur) {
    tone = 'closed';
    title = 'Na dnes je po tréningoch';
    sub = 'zajtra od ' + hh(openHour);
  } else if (!cur.free) {
    tone = 'busy';
    let end = hour + 1;
    while (slots.find((s) => s.hour === end && !s.free)) end++;
    title = 'Na ľade sa práve trénuje';
    sub = `do ${hh(end)}`;
  } else {
    tone = 'free';
    title = 'Ľad je práve voľný';
    sub = null;
  }
  return (
    <section className={`lv lv--${tone}`} aria-label="Ľad práve teraz">
      <div className="wrap lv__in">
        <div className="lv__now">
          <span className="lv__dot" aria-hidden="true" />
          <span>
            <small>Práve teraz</small>
            <b>{title}</b>
          </span>
        </div>
        {sub ? (
          <>
            <span className="lv__sep" aria-hidden="true" />
            <div className="lv__item">
              {tone === 'busy' ? 'Končí' : 'Otvárame'}
              <b>{sub}</b>
            </div>
          </>
        ) : null}
        {nextFree ? (
          <>
            <span className="lv__sep" aria-hidden="true" />
            <Link href={`/rezervacia?datum=${iso}&cas=${nextFree.hour}`} className="lv__item lv__link">
              Najbližšie voľné
              <b>{hh(nextFree.hour)}</b>
            </Link>
          </>
        ) : null}
        <div className="lv__bar" aria-hidden="true">
          {slots.map((s) => (
            <i key={s.hour} className={s.hour === hour ? 'is-now' : s.hour < hour || !s.bookable ? 'is-past' : s.free ? 'is-free' : 'is-busy'} />
          ))}
        </div>
      </div>
    </section>
  );
}

// „Kedy je voľno“: celý týždeň na jeden pohľad, voľná hodina je odkaz priamo do rezervácie.
export type WeekDay = { iso: string; name: string; date: string; slots: (LiveSlot & { price: number })[] };

export function WeekMap({ days }: { days: WeekDay[] }) {
  const hours = days[0]?.slots.map((s) => s.hour) ?? [];
  if (!hours.length) return null;
  return (
    <section className="wrap wk" aria-labelledby="wk-t">
      <div className="sec-head">
        <h2 id="wk-t" className="disp sec-title">
          Kedy je voľno
        </h2>
        <p className="sec-head__p">Celý týždeň na jeden pohľad. Ťukni na zelenú hodinu a rovno ju rezervuješ.</p>
      </div>
      <div className="wk__scroll">
        <table className="wk__grid">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Deň</span>
              </th>
              {hours.map((h) => (
                <th key={h} scope="col">
                  {String(h).padStart(2, '0')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.iso}>
                <th scope="row">
                  {d.name}
                  <small>{d.date}</small>
                </th>
                {d.slots.map((s) => (
                  <td key={s.hour}>
                    {s.free && s.bookable ? (
                      <Link href={`/rezervacia?datum=${d.iso}&cas=${s.hour}`} className="wk__c is-free" aria-label={`${d.name} ${hh(s.hour)}, voľné, ${s.price} €`}>
                        <span className="wk__tip" aria-hidden="true">
                          <b>{hh(s.hour)}</b>
                          {s.price} €
                        </span>
                      </Link>
                    ) : (
                      <span className={`wk__c ${s.bookable ? 'is-busy' : 'is-past'}`} aria-label={`${d.name} ${hh(s.hour)}, ${s.bookable ? 'obsadené' : 'nedostupné'}`} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="wk__leg" aria-hidden="true">
        <span>
          <i className="is-free" />
          Voľné
        </span>
        <span>
          <i className="is-busy" />
          Obsadené
        </span>
        <span>
          <i className="is-past" />
          Prebehlo
        </span>
      </div>
    </section>
  );
}
