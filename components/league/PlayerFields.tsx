'use client';

import { ImageUpload, type Uploaded } from '@/components/league/ImageUpload';
import { Silhouette } from '@/components/league/Silhouette';
import { useT } from '@/lib/i18n/client';

export type PlayerRow = { id?: string; key: number; name: string; number: string; pos: string; year: string; height: string; weight: string; shoots: string; photo: Uploaded | null };
export const emptyPlayer = (key: number, pos = 'F'): PlayerRow => ({ key, name: '', number: '', pos, year: '', height: '', weight: '', shoots: '', photo: null });

const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n);

// Jeden hráč súpisky: fotka (nepovinná), meno, číslo, post, rok narodenia, výška, váha, ľavák/pravák.
// Polia majú mená playerXxx – formulár ich pošle ako zoznamy v rovnakom poradí.
export function PlayerFields({ row, index, set, remove }: { row: PlayerRow; index: number; set: (patch: Partial<PlayerRow>) => void; remove?: () => void }) {
  const t = useT();
  const n = index + 1;
  return (
    <div className="lgpf">
      <input type="hidden" name="playerPhoto" value={row.photo ? JSON.stringify(row.photo.img) : ''} />
      <input type="hidden" name="playerId" value={row.id ?? ''} />
      <ImageUpload kind="player" compact value={row.photo} onChange={(photo) => set({ photo })} label={t('Fotka hráča {n}', { n })} empty={<Silhouette />} />
      <div className="lgpf__grid">
        <label className="lgpf__name">
          <span>{t('Meno a priezvisko')}</span>
          <input name="playerName" value={row.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />
        </label>
        <label>
          <span>{t('Číslo')}</span>
          <input name="playerNumber" value={row.number} onChange={(e) => set({ number: digits(e.target.value, 2) })} inputMode="numeric" placeholder="#" />
        </label>
        <label>
          <span>{t('Post')}</span>
          <select name="playerPos" value={row.pos} onChange={(e) => set({ pos: e.target.value })}>
            <option value="F">{t('Útočník')}</option>
            <option value="D">{t('Obranca')}</option>
            <option value="G">{t('Brankár')}</option>
          </select>
        </label>
        <label>
          <span>{t('Rok narodenia')}</span>
          <input name="playerYear" value={row.year} onChange={(e) => set({ year: digits(e.target.value, 4) })} inputMode="numeric" placeholder="2001" />
        </label>
        <label>
          <span>{t('Výška (cm)')}</span>
          <input name="playerHeight" value={row.height} onChange={(e) => set({ height: digits(e.target.value, 3) })} inputMode="numeric" placeholder="180" />
        </label>
        <label>
          <span>{t('Váha (kg)')}</span>
          <input name="playerWeight" value={row.weight} onChange={(e) => set({ weight: digits(e.target.value, 3) })} inputMode="numeric" placeholder="80" />
        </label>
        <label>
          <span>{t('Hokejka')}</span>
          <select name="playerShoots" value={row.shoots} onChange={(e) => set({ shoots: e.target.value })}>
            <option value="">{t('Vyber')}</option>
            <option value="L">{t('Ľavák')}</option>
            <option value="R">{t('Pravák')}</option>
          </select>
        </label>
      </div>
      {remove ? (
        <button type="button" className="lgreg__x" onClick={remove} aria-label={t('Odstrániť hráča {n}', { n })}>
          ×
        </button>
      ) : null}
    </div>
  );
}
