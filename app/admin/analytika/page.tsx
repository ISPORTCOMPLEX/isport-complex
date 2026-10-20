import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff, can } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { businessStats, delta, rangeOf, trafficStats } from '@/lib/analytics/stats';
import { euros } from '@/lib/booking/time';
import { AdmHead, Kpi, Meters, Panel } from '@/components/admin/ui';
import { BarChart, Heatmap } from '@/components/admin/Charts';

export const metadata: Metadata = { title: 'Analytika' };

type Props = { searchParams: Promise<{ d?: string; tab?: string }> };

const RANGES = [7, 30, 90, 365];
const PATH_LABEL: Record<string, string> = {
  '/': 'Úvod',
  '/ladova-plocha': 'Ľadová plocha',
  '/rezervacia': 'Rezervácia – výber termínu',
  '/rezervacia/udaje': 'Rezervácia – údaje',
  '/rezervacia/:kod': 'Potvrdenie rezervácie',
  '/cennik': 'Cenník',
  '/kontakt': 'Kontakt',
  '/pre-kluby': 'Pre kluby',
  '/ihrisko': 'Futbalové ihrisko',
  '/fitness-wellness': 'Wellness a posilňovňa',
  '/bufet-skyboxy': 'Bufet a skyboxy',
  '/prihlasenie': 'Prihlásenie',
  '/registracia': 'Registrácia',
  '/ucet': 'Môj účet',
  '/ucet/rezervacie': 'Moje rezervácie',
};
const COUNTRY: Record<string, string> = { SK: 'Slovensko', CZ: 'Česko', HU: 'Maďarsko', PL: 'Poľsko', AT: 'Rakúsko', UA: 'Ukrajina', DE: 'Nemecko', GB: 'Spojené kráľovstvo', US: 'USA' };
const DEVICE: Record<string, string> = { mobile: 'Mobil', desktop: 'Počítač', tablet: 'Tablet' };
const pct = (v: number) => `${Math.round(v * 100)} %`;
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

export default async function AnalytikaPage({ searchParams }: Props) {
  const me = await requireStaff('analytics.view');
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.d)) ? Number(sp.d) : 30;
  const showBiz = can(me.role, 'bookings.view');
  const tab = sp.tab === 'lad' && showBiz ? 'lad' : 'web';
  const range = rangeOf(days);
  const q = (o: Record<string, string | number>) => `/admin/analytika?${new URLSearchParams({ d: String(days), tab, ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <div className="adm__stack">
      <AdmHead title="Analytika" sub="Návštevnosť webu a prevádzka ľadovej plochy">
        <nav className="adm-filters" aria-label="Obdobie">
          {RANGES.map((r) => (
            <Link key={r} href={q({ d: r })} aria-current={r === days ? 'true' : undefined}>
              {r === 365 ? 'Rok' : `${r} dní`}
            </Link>
          ))}
        </nav>
      </AdmHead>
      <nav className="adm-tabs" aria-label="Pohľad">
        <Link href={q({ tab: 'web' })} aria-current={tab === 'web' ? 'page' : undefined}>
          Návštevnosť webu
        </Link>
        {showBiz ? (
          <Link href={q({ tab: 'lad' })} aria-current={tab === 'lad' ? 'page' : undefined}>
            Ľadová plocha a tržby
          </Link>
        ) : null}
      </nav>
      {tab === 'web' ? <Traffic range={range} /> : <Business range={range} />}
    </div>
  );
}

async function Traffic({ range }: { range: ReturnType<typeof rangeOf> }) {
  const t = await trafficStats(range);
  const funnelMax = Math.max(t.funnel[0].value, 1);
  return (
    <>
      <div className="kpis">
        <Kpi label="Návštevníci" value={t.visitors.toLocaleString('sk-SK')} change={delta(t.visitors, t.prevVisitors)} note="oproti predch. obdobiu" />
        <Kpi label="Zobrazenia stránok" value={t.views.toLocaleString('sk-SK')} change={delta(t.views, t.prevViews)} note={`${t.perVisitor.toFixed(1).replace('.', ',')} na návštevníka`} />
        <Kpi label="Priemerný čas na stránke" value={t.avgDurationSec ? dur(t.avgDurationSec) : '—'} note="bez okamžitých odchodov" />
        <Kpi
          label="Práve na webe"
          value={
            <>
              <i className="kpi__live" aria-hidden="true" />
              {t.live}
            </>
          }
          note={`za 5 minút · prihlásení ${pct(t.loggedShare)} zobrazení`}
        />
      </div>

      <Panel title="Návštevníci po dňoch">
        <BarChart points={t.daily} valueLabel="Návštevníci" extraLabel="Zobrazenia" />
      </Panel>

      <div className="adm-grid adm-grid--even">
        <Panel title="Najnavštevovanejšie stránky">
          <Meters rows={t.pages.map((p) => ({ label: PATH_LABEL[p.label] ?? p.label, value: p.value, note: `${p.visitors} návštevníkov${p.durSec ? ` · priemerne ${dur(p.durSec)}` : ''}` }))} unit="zobr." />
        </Panel>
        <Panel title="Odkiaľ prichádzajú">
          <Meters rows={t.sources} unit="návšt." />
          {t.refs.length ? (
            <>
              <h3 className="adm-sub">Odkazujúce weby</h3>
              <Meters rows={t.refs} />
            </>
          ) : null}
        </Panel>
      </div>

      <Panel title="Kedy ľudia web navštevujú">
        <Heatmap grid={t.heat} unit="zobrazení" />
      </Panel>

      <div className="adm-grid adm-grid--three">
        <Panel title="Zariadenia">
          <Meters rows={t.devices.map((d) => ({ ...d, label: DEVICE[d.label] ?? d.label }))} />
        </Panel>
        <Panel title="Prehliadače">
          <Meters rows={t.browsers} />
        </Panel>
        <Panel title="Krajiny">
          <Meters rows={t.countries.map((c) => ({ ...c, label: COUNTRY[c.label] ?? c.label }))} />
        </Panel>
      </div>

      <Panel title="Cesta k rezervácii">
        <ol className="fn">
          {t.funnel.map((f, i) => (
            <li key={f.label}>
              <span className="fn__label">
                <b>{i + 1}</b>
                {f.label}
              </span>
              <span className="fn__track">
                <i style={{ width: `${Math.max(1.5, (f.value / funnelMax) * 100)}%` }} />
              </span>
              <span className="fn__val">
                {f.value.toLocaleString('sk-SK')}
                {i > 0 && t.funnel[i - 1].value ? <small>{pct(f.value / t.funnel[i - 1].value)} z predch.</small> : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="adm-note muted">
          Meranie je bez cookies a bez ukladania IP adries. Návštevník sa počíta raz za deň; personál a roboty sa nezapočítavajú, rešpektuje sa aj „Do Not Track“.
        </p>
      </Panel>
    </>
  );
}

async function Business({ range }: { range: ReturnType<typeof rangeOf> }) {
  const s = await getBookingSettings();
  const b = await businessStats(range, s);
  return (
    <>
      <div className="kpis">
        <Kpi label="Tržby" value={euros(b.revenue)} change={delta(b.revenue, b.prevRevenue)} note={`zaplatené ${euros(b.paid)}`} />
        <Kpi label="Obsadenosť ľadu" value={pct(b.occupancy)} note={`${b.hours} z ${Math.round(b.capacity)} hodín`} />
        <Kpi label="Rezervácie" value={b.count} change={delta(b.count, b.prevCount)} note={`priemer ${b.avgHours.toFixed(1).replace('.', ',')} h · ${euros(Math.round(b.avgPrice))}`} />
        <Kpi label="Noví zákazníci" value={b.newUsers} change={delta(b.newUsers, b.prevUsers)} note="registrácie" />
      </div>

      <Panel title="Tržby po dňoch (podľa termínu tréningu)">
        <BarChart points={b.dailyRevenue} valueLabel="Tržby" unit="€" extraLabel="Hodiny ľadu" extraUnit="h" />
      </Panel>

      <Panel title="Obsadenosť podľa dňa a hodiny">
        <Heatmap grid={b.heat} fromHour={b.openHour} toHour={b.closeHour} percent />
        <p className="adm-note muted">Percento hodín v danom čase, ktoré boli v zvolenom období predané. Pomáha nastaviť cenu špičky a akcie na slabé časy.</p>
      </Panel>

      <div className="kpis kpis--small">
        <Kpi label="Nezaplatené" value={euros(b.unpaid)} note="v zvolenom období" invert />
        <Kpi label="Rezervované online" value={pct(b.onlineShare)} note="zvyšok zadala recepcia" />
        <Kpi label="Sprchy" value={pct(b.showerRate)} note="rezervácií so sprchami" />
        <Kpi label="Rezervujú vopred" value={`${b.leadDays.toFixed(1).replace('.', ',')} dňa`} note="priemerne" />
        <Kpi label="Zrušené" value={pct(b.cancelRate)} note={`z ${b.created} vytvorených`} invert />
        <Kpi label="Neprišli" value={pct(b.noShowRate)} note="z odohraných" invert />
      </div>

      <div className="adm-grid adm-grid--even">
        <Panel title="Najčastejší zákazníci">
          <Meters rows={b.teams.map((t) => ({ label: t.label, value: t.hours, note: `${t.count} rezervácií · ${euros(t.cents)}` }))} unit="h" />
        </Panel>
        <Panel title="Spôsob platby">
          <Meters rows={b.methods} unit="rez." />
          {b.blockedHours ? <p className="adm-note muted">Blokovaný čas (údržba, turnaje): {b.blockedHours} h – do kapacity sa nepočíta.</p> : null}
        </Panel>
      </div>
    </>
  );
}
