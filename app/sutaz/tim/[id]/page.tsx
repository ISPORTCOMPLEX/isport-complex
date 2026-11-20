import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlayerAvatar, TeamBadge, POS } from '@/components/league/ui';
import { goalieStats, skaterStats, standings } from '@/lib/league/calc';
import { ageFrom } from '@/lib/league/roster';
import { loadLeague } from '@/lib/league/data';
import { getT } from '@/lib/i18n/server';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getT();
  const { id } = await params;
  const L = await loadLeague();
  const team = L.teams.find((x) => x.id === id);
  return { title: team ? `${team.name} – ${t('Súťaž tímov')}` : t('Tím') };
}

const POS_LONG: Record<string, string> = { G: 'Brankári', D: 'Obrancovia', F: 'Útočníci' };

// Profil tímu: logo, bilancia a súpiska s fotkami (alebo siluetou), vekom, výškou, váhou a štatistikami.
export default async function TimPage({ params }: Props) {
  const t = await getT();
  const { id } = await params;
  const L = await loadLeague();
  const team = L.teams.find((x) => x.id === id);
  if (!team) return notFound();
  const row = standings(L.teams, L.games).find((r) => r.team.id === id);
  const players = L.players.filter((p) => p.teamId === id);
  const sk = new Map(skaterStats(players, [team], L.games, L.goals).map((r) => [r.player.id, r]));
  const gk = new Map(goalieStats(players, [team], L.games, L.goals).map((r) => [r.player.id, r]));
  const num = (v: number, d = 0) => v.toLocaleString(t.intl, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <>
      <Link href="/sutaz/tabulky" className="lg-back">
        ← {t('Tabuľka')}
      </Link>
      <div className="lgtm">
        <TeamBadge team={team} size="lg" />
        <div>
          <h1 className="lgh lgtm__h">{team.name}</h1>
          {team.city ? <p className="lg-muted">{team.city}</p> : null}
        </div>
        {row && row.gp ? (
          <dl className="lgtm__rec">
            <div>
              <dt>{t('Zápasy')}</dt>
              <dd>{row.gp}</dd>
            </div>
            <div>
              <dt>{t('Body')}</dt>
              <dd>{row.pts}</dd>
            </div>
            <div>
              <dt>{t('Skóre')}</dt>
              <dd>
                {row.gf}:{row.ga}
              </dd>
            </div>
            <div>
              <dt>{t('Séria')}</dt>
              <dd>{row.streak || '–'}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      {(['G', 'D', 'F'] as const).map((pos) => {
        const list = players.filter((p) => p.position === pos);
        if (!list.length) return null;
        return (
          <section key={pos} className="lgtm__sec">
            <h2 className="lgh2">{t(POS_LONG[pos])}</h2>
            <ul className="lgpl">
              {list.map((p) => {
                const s = sk.get(p.id);
                const g = gk.get(p.id);
                const age = ageFrom(p.birthYear ?? null);
                return (
                  <li key={p.id} className="lgpl__card">
                    <PlayerAvatar player={p} team={team} size="lg" />
                    <span className="lgpl__num">{p.number !== null ? `#${p.number}` : ''}</span>
                    <b className="lgpl__name">{p.name}</b>
                    <span className="lgpl__pos">{t(POS[p.position] === 'B' ? 'Brankár' : POS[p.position] === 'O' ? 'Obranca' : 'Útočník')}</span>
                    <dl className="lgpl__bio">
                      {age ? (
                        <div>
                          <dt>{t('Vek')}</dt>
                          <dd>{age}</dd>
                        </div>
                      ) : null}
                      {p.heightCm ? (
                        <div>
                          <dt>{t('Výška')}</dt>
                          <dd>{p.heightCm} cm</dd>
                        </div>
                      ) : null}
                      {p.weightKg ? (
                        <div>
                          <dt>{t('Váha')}</dt>
                          <dd>{p.weightKg} kg</dd>
                        </div>
                      ) : null}
                      {p.shoots ? (
                        <div>
                          <dt>{t('Hokejka')}</dt>
                          <dd>{p.shoots === 'L' ? t('Ľavá') : t('Pravá')}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {pos === 'G' ? (
                      g ? (
                        <span className="lgpl__st">
                          {t('{gp} Z · priemer {gaa} · nuly {so}', { gp: g.gp, gaa: num(g.gaa, 2), so: g.so })}
                        </span>
                      ) : null
                    ) : s && s.gp ? (
                      <span className="lgpl__st">{t('{gp} Z · {g} G · {a} A · {pts} B', { gp: s.gp, g: s.g, a: s.a, pts: s.pts })}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
