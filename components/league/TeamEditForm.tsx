'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { saveMyTeamAction, type TeamFormState } from '@/lib/actions/league';
import { ImageUpload, type Uploaded } from '@/components/league/ImageUpload';
import { PlayerFields, emptyPlayer, type PlayerRow } from '@/components/league/PlayerFields';
import { useT } from '@/lib/i18n/client';

// Úprava tímu vedúcim: logo a súpiska (údaje aj fotky hráčov).
export function TeamEditForm({ teamId, logo: initialLogo, players }: { teamId: string; logo: Uploaded | null; players: PlayerRow[] }) {
  const t = useT();
  const router = useRouter();
  const [state, action, pending] = useActionState<TeamFormState, FormData>(saveMyTeamAction, {});
  const [logo, setLogo] = useState<Uploaded | null>(initialLogo);
  const [rows, setRows] = useState<PlayerRow[]>(players.length ? players : [emptyPlayer(0, 'G')]);
  const e = state.errors ?? {};
  const set = (key: number, patch: Partial<PlayerRow>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  useEffect(() => {
    if (state.done) router.refresh();
  }, [state, router]);

  return (
    <form
      className="lgreg"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="teamId" value={teamId} />
      <FormAlert error={state.error} success={state.done && !pending ? t('Uložené. Zmeny sú hneď na webe.') : undefined} />
      <fieldset className="lgreg__set">
        <legend>{t('Logo tímu')}</legend>
        <div className={`lgreg__logo${e.logo ? ' is-err' : ''}`}>
          <input type="hidden" name="logo" value={logo ? JSON.stringify(logo.img) : ''} />
          <ImageUpload kind="logo" value={logo} onChange={setLogo} label={t('Nahrať logo tímu')} empty={<span className="lgup__ph">{t('Logo')}</span>} />
          <p>{t('Najlepšie štvorcové PNG s priehľadným pozadím, aspoň 400 × 400 px.')}</p>
        </div>
        {e.logo ? <p className="field__err">{e.logo}</p> : null}
      </fieldset>
      <fieldset className="lgreg__set">
        <legend>{t('Súpiska')}</legend>
        <p className="lgreg__hint">{t('Fotka hráča je nepovinná – bez nej sa ukáže silueta. Hráča s gólmi alebo zápasmi v bráne zo súpisky odstrániť nejde.')}</p>
        {e.roster ? (
          <p className="field__err" role="alert">
            {e.roster}
          </p>
        ) : null}
        <div className="lgreg__roster">
          {rows.map((r, i) => (
            <PlayerFields key={r.key} row={r} index={i} set={(patch) => set(r.key, patch)} remove={rows.length > 1 ? () => setRows((x) => x.filter((y) => y.key !== r.key)) : undefined} />
          ))}
        </div>
        {rows.length < 30 ? (
          <button type="button" className="lgreg__add" onClick={() => setRows((x) => [...x, emptyPlayer(Math.max(-1, ...x.map((y) => y.key)) + 1)])}>
            + {t('Pridať hráča')}
          </button>
        ) : null}
      </fieldset>
      <div className="lgreg__go lgz__go">
        <button type="submit" className="lgbtn lgbtn--gold" disabled={pending}>
          {pending ? t('Ukladám…') : t('Uložiť tím')}
        </button>
        <Link href="/sutaz/moj-tim" className="lgbtn">
          {t('Späť')}
        </Link>
      </div>
    </form>
  );
}
