import type { Metadata } from 'next';
import { LeagueEmpty, TeamBadge } from '@/components/league/ui';
import { standings } from '@/lib/league/calc';
import { loadLeague } from '@/lib/league/data';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Tabuľka – Súťaž tímov'), description: t('Tabuľka súťaže tímov v I-SPORT COMPLEX Košice – body, skóre, doma, vonku, forma.') };
}

export default async function TabulkyPage() {
  const t = await getT();
  const L = await loadLeague();
  if (!L.teams.length) return <LeagueEmpty t={t} title={t('Súťaž sa pripravuje')} text={t('Tabuľka sa zobrazí, keď budú v súťaži schválené prvé tímy.')} />;
  const rows = standings(L.teams, L.games);
  const pct = (v: number, gp: number) => (gp ? v.toLocaleString(t.intl, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/^0/, '') : '–');
  const cols: [string, string][] = [
    ['Z', 'Zápasy'],
    ['V', 'Výhry v riadnom čase'],
    ['VP', 'Výhry po predĺžení alebo nájazdoch'],
    ['PP', 'Prehry po predĺžení alebo nájazdoch'],
    ['P', 'Prehry v riadnom čase'],
    ['B', 'Body'],
    ['B%', 'Percento získaných bodov'],
    ['G', 'Strelené góly'],
    ['InkG', 'Inkasované góly'],
    ['Skóre', 'Rozdiel skóre'],
    ['Doma', 'Doma: výhry-prehry-prehry po predĺžení'],
    ['Vonku', 'Vonku: výhry-prehry-prehry po predĺžení'],
    ['Posl5', 'Posledných 5 zápasov'],
    ['Séria', 'Aktuálna séria (V výhry, P prehry)'],
  ];
  return (
    <>
      <h1 className="lgh">{t('Tabuľka')}</h1>
      <p className="lg-note">{t('Body: výhra 3, výhra po predĺžení alebo nájazdoch 2, prehra po predĺžení alebo nájazdoch 1, prehra 0.')}</p>
      <div className="lgtb-wrap" tabIndex={0} role="region" aria-label={t('Tabuľka súťaže')}>
        <table className="lgtb">
          <thead>
            <tr>
              <th scope="col" className="lgtb__rk">
                {t('Poradie')}
              </th>
              <th scope="col" className="lgtb__tm">
                {t('Tím')}
              </th>
              {cols.map(([k, title]) => (
                <th key={k} scope="col" className={k === 'B' ? 'is-key' : undefined}>
                  <abbr title={t(title)}>{t(k)}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team.id}>
                <td className="lgtb__rk">{i + 1}</td>
                <th scope="row" className="lgtb__tm">
                  <span className="lgtb__team">
                    <TeamBadge team={r.team} size="sm" />
                    {r.team.name}
                  </span>
                </th>
                <td>{r.gp}</td>
                <td>{r.w}</td>
                <td>{r.otw}</td>
                <td>{r.otl}</td>
                <td>{r.l}</td>
                <td className="is-key">{r.pts}</td>
                <td>{pct(r.pct, r.gp)}</td>
                <td>{r.gf}</td>
                <td>{r.ga}</td>
                <td className={r.diff > 0 ? 'is-pos' : r.diff < 0 ? 'is-neg' : undefined}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                <td>{r.home}</td>
                <td>{r.away}</td>
                <td>{r.last5}</td>
                <td>{r.streak || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
