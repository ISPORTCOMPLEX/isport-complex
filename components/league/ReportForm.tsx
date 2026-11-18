'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { submitReportAction, type ReportState } from '@/lib/actions/league';
import { ownGoalsNeeded, type ReportGoal } from '@/lib/league/report';
import { useT } from '@/lib/i18n/client';

type P = { id: string; name: string; number: number | null; position: string };
type G = ReportGoal & { key: number };
type Init = { homeScore: string; awayScore: string; decision: string; shots: string; goalieId: string; lineup: string[]; goals: ReportGoal[] } | null;

// Formulár zápisu výsledku: skóre (domáci : hostia), ako sa zápas skončil, kto nastúpil, brankár, strely a góly vlastného tímu.
export function ReportForm({ gameId, teamId, side, home, away, roster, initial }: { gameId: string; teamId: string; side: 'home' | 'away'; home: string; away: string; roster: P[]; initial: Init }) {
  const t = useT();
  const router = useRouter();
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReportAction, {});
  const [hs, setHs] = useState(initial?.homeScore ?? '');
  const [as, setAs] = useState(initial?.awayScore ?? '');
  const [decision, setDecision] = useState(initial?.decision ?? 'REG');
  const [lineup, setLineup] = useState<string[]>(initial?.lineup ?? roster.map((p) => p.id));
  const [goalie, setGoalie] = useState(initial?.goalieId ?? roster.find((p) => p.position === 'G')?.id ?? '');
  const [goals, setGoals] = useState<G[]>(() => (initial?.goals ?? []).map((g, i) => ({ ...g, key: i })));
  const last = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.at && state.at !== last.current) {
      last.current = state.at;
      router.refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state, router]);

  const need = useMemo(() => {
    const h = Number(hs);
    const a = Number(as);
    if (hs === '' || as === '' || !Number.isInteger(h) || !Number.isInteger(a)) return null;
    return ownGoalsNeeded({ homeScore: h, awayScore: a, decision }, side);
  }, [hs, as, decision, side]);

  // počet riadkov gólov sa prispôsobí skóre vlastného tímu
  useEffect(() => {
    if (need === null || need > 30) return;
    setGoals((cur) => {
      if (cur.length === need) return cur;
      if (cur.length > need) return cur.slice(0, need);
      const next = [...cur];
      for (let i = cur.length; i < need; i++) next.push({ key: Date.now() + i, scorerId: '', assist1Id: null, assist2Id: null, period: 1, time: '', kind: 'EV' });
      return next;
    });
  }, [need]);

  const played = roster.filter((p) => lineup.includes(p.id));
  const label = (p: P) => `${p.number !== null ? `#${p.number} ` : ''}${p.name}`;
  const setGoal = (key: number, patch: Partial<G>) => setGoals((g) => g.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const mine = side === 'home' ? home : away;

  if (state.done === 'confirmed')
    return (
      <div className="lgz__note is-ok" role="status">
        <b>{t('Výsledok sa zhoduje so zápisom súpera a je zapísaný do súťaže.')}</b>
        <span>{t('Strelci, súpiska aj brankári sú v štatistikách.')}</span>
      </div>
    );

  return (
    <form
      className="lgz"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set('goals', JSON.stringify(goals.map(({ key: _k, ...g }) => g)));
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="teamId" value={teamId} />
      {state.done === 'waiting' ? (
        <div className="lgz__note is-ok" role="status">
          <b>{t('Zápis je uložený')}</b>
          <span>{t('Čakáme na zápis súpera. Keď sa skóre zhodne, výsledok sa zapíše automaticky.')}</span>
        </div>
      ) : null}
      {state.done === 'mismatch' || state.done === 'swapped' ? (
        <div className="lgz__note is-bad" role="alert">
          <b>{t('Výsledok sa nezhoduje so zápisom súpera')}</b>
          <span>{state.done === 'swapped' ? t('Súper zapísal opačné skóre – skontroluj domácich a hostí. Vedúcim oboch tímov sme poslali e-mail.') : t('Skontroluj zápis. Vedúcim oboch tímov sme poslali e-mail.')}</span>
        </div>
      ) : null}
      {state.error ? (
        <div className="lgz__note is-bad" role="alert">
          <b>{state.error}</b>
          {state.errors?.length ? (
            <ul>
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section className="lgz__box">
        <h2>{t('1. Skóre zápasu')}</h2>
        <p className="lgz__hint">{t('Pozor na poradie: vľavo vždy domáci, vpravo hostia – rovnako ako v rozpise.')}</p>
        <div className="lgz__score">
          <label>
            <span>
              {home} <small>({t('domáci')})</small>
            </span>
            <input name="homeScore" value={hs} onChange={(e) => setHs(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" required />
          </label>
          <b aria-hidden="true">:</b>
          <label>
            <span>
              {away} <small>({t('hostia')})</small>
            </span>
            <input name="awayScore" value={as} onChange={(e) => setAs(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" required />
          </label>
        </div>
        <div className="lgz__dec" role="radiogroup" aria-label={t('Ako sa zápas skončil')}>
          {[
            ['REG', t('V riadnom čase')],
            ['OT', t('Po predĺžení')],
            ['SO', t('Po nájazdoch')],
          ].map(([v, l]) => (
            <label key={v} className={decision === v ? 'is-on' : undefined}>
              <input type="radio" name="decision" value={v} checked={decision === v} onChange={() => setDecision(v)} />
              {l}
            </label>
          ))}
        </div>
      </section>

      <section className="lgz__box">
        <h2>{t('2. Kto za {team} nastúpil', { team: mine })}</h2>
        <div className="lgz__roster">
          {roster.map((p) => (
            <label key={p.id} className={lineup.includes(p.id) ? 'is-on' : undefined}>
              <input type="checkbox" name="lineup" value={p.id} checked={lineup.includes(p.id)} onChange={(e) => setLineup((l) => (e.target.checked ? [...l, p.id] : l.filter((x) => x !== p.id)))} />
              <span>{label(p)}</span>
              <small>{p.position === 'G' ? t('B') : p.position === 'D' ? t('O') : t('Ú')}</small>
            </label>
          ))}
        </div>
        <div className="lgz__row2">
          <label className="lgz__f">
            <span>{t('Brankár v zápase')}</span>
            <select name="goalieId" value={goalie} onChange={(e) => setGoalie(e.target.value)}>
              <option value="">{t('— neuvedený —')}</option>
              {played.map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="lgz__f">
            <span>
              {t('Strely tímu {team} na bránku', { team: mine })} <small>({t('nepovinné')})</small>
            </span>
            <input name="shots" defaultValue={initial?.shots ?? ''} inputMode="numeric" maxLength={3} />
          </label>
        </div>
      </section>

      <section className="lgz__box">
        <h2>{t('3. Góly tímu {team}', { team: mine })}</h2>
        {need === null ? (
          <p className="lgz__hint">{t('Najprv vyplň skóre – podľa neho sa pripravia riadky pre góly.')}</p>
        ) : need === 0 ? (
          <p className="lgz__hint">{t('Tím nestrelil gól – nie je čo zapisovať.')}</p>
        ) : (
          <>
            <p className="lgz__hint">{decision === 'SO' ? t('Pri výhre na nájazdy sa víťazný nájazd nezapisuje ako gól.') : t('Zapíš strelca a asistencie ku každému gólu.')}</p>
            <ol className="lgz__goals">
              {goals.map((g, i) => (
                <li key={g.key}>
                  <span className="lgz__gn">{i + 1}.</span>
                  <select value={g.scorerId} onChange={(e) => setGoal(g.key, { scorerId: e.target.value })} aria-label={t('Strelec gólu {n}', { n: i + 1 })} required>
                    <option value="">{t('Strelec')}</option>
                    {played.map((p) => (
                      <option key={p.id} value={p.id}>
                        {label(p)}
                      </option>
                    ))}
                  </select>
                  <select value={g.assist1Id ?? ''} onChange={(e) => setGoal(g.key, { assist1Id: e.target.value || null })} aria-label={t('1. asistencia gólu {n}', { n: i + 1 })}>
                    <option value="">{t('1. asistencia')}</option>
                    {played.map((p) => (
                      <option key={p.id} value={p.id}>
                        {label(p)}
                      </option>
                    ))}
                  </select>
                  <select value={g.assist2Id ?? ''} onChange={(e) => setGoal(g.key, { assist2Id: e.target.value || null })} aria-label={t('2. asistencia gólu {n}', { n: i + 1 })}>
                    <option value="">{t('2. asistencia')}</option>
                    {played.map((p) => (
                      <option key={p.id} value={p.id}>
                        {label(p)}
                      </option>
                    ))}
                  </select>
                  <select value={g.period} onChange={(e) => setGoal(g.key, { period: Number(e.target.value) })} aria-label={t('Tretina gólu {n}', { n: i + 1 })}>
                    <option value={1}>{t('1. tretina')}</option>
                    <option value={2}>{t('2. tretina')}</option>
                    <option value={3}>{t('3. tretina')}</option>
                    {decision === 'OT' ? <option value={4}>{t('Predĺženie')}</option> : null}
                  </select>
                  <input value={g.time} onChange={(e) => setGoal(g.key, { time: e.target.value.replace(/[^\d:]/g, '').slice(0, 5) })} placeholder="mm:ss" aria-label={t('Čas gólu {n}', { n: i + 1 })} />
                  <select value={g.kind} onChange={(e) => setGoal(g.key, { kind: e.target.value })} aria-label={t('Druh gólu {n}', { n: i + 1 })}>
                    <option value="EV">{t('Bežný')}</option>
                    <option value="PP">{t('Presilovka')}</option>
                    <option value="SH">{t('Oslabenie')}</option>
                    <option value="EN">{t('Prázdna bránka')}</option>
                    <option value="PS">{t('Trestné strieľanie')}</option>
                  </select>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <div className="lgz__go">
        <button type="submit" className="lgbtn lgbtn--gold" disabled={pending}>
          {pending ? t('Ukladám…') : initial ? t('Uložiť opravený zápis') : t('Odoslať zápis')}
        </button>
        <span className="lgz__hint">{t('Výsledok sa zapíše do súťaže, až keď ho rovnako zapíše aj súper.')}</span>
      </div>
    </form>
  );
}
