import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff, can } from '@/lib/staff';
import { getBookingSettings } from '@/lib/booking/settings';
import { businessStats, delta, rangeOf, trafficStats } from '@/lib/analytics/stats';
import { euros } from '@/lib/booking/time';
import { AdmHead, Kpi, Meters, Panel } from '@/components/admin/ui';
import { BarChart, Heatmap } from '@/components/admin/Charts';
import { Dyn } from '@/components/Dyn';
import { getT } from '@/lib/i18n/server';
import { msg } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr('Analytika') };
}

type Props = { searchParams: Promise<{ d?: string; tab?: string }> };

const RANGES = [7, 30, 90, 365];
const PATH_LABEL: Record<string, string> = {
  '/': msg('Úvod'),
  '/ladova-plocha': msg('Ľadová plocha'),
  '/rezervacia': msg('Rezervácia – výber termínu'),
  '/rezervacia/udaje': msg('Rezervácia – údaje'),
  '/rezervacia/:kod': msg('Potvrdenie rezervácie'),
  '/cennik': msg('Cenník'),
  '/kontakt': msg('Kontakt'),
  '/pre-kluby': msg('Pre kluby'),
  '/ihrisko': msg('Futbalové ihrisko'),
  '/fitness-wellness': msg('Wellness a posilňovňa'),
  '/bufet-skyboxy': msg('Bufet a skyboxy'),
  '/prihlasenie': msg('Prihlásenie'),
  '/registracia': msg('Registrácia'),
  '/ucet': msg('Môj účet'),
  '/ucet/rezervacie': msg('Moje rezervácie'),
};
const DEVICE: Record<string, string> = { mobile: msg('Mobil'), desktop: msg('Počítač'), tablet: msg('Tablet') };
const pct = (v: number) => `${Math.round(v * 100)} %`;
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

export default async function AnalytikaPage({ searchParams }: Props) {
  const tr = await getT();
  const me = await requireStaff('analytics.view');
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.d)) ? Number(sp.d) : 30;
  const showBiz = can(me.role, 'bookings.view');
  const tab = sp.tab === 'lad' && showBiz ? 'lad' : 'web';
  const range = rangeOf(days);
  const q = (o: Record<string, string | number>) => `/admin/analytika?${new URLSearchParams({ d: String(days), tab, ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <div className="adm__stack">
      <AdmHead title={tr('Analytika')} sub={tr('Návštevnosť webu a prevádzka ľadovej plochy')}>
        <nav className="adm-filters" aria-label={tr('Obdobie')}>
          {RANGES.map((r) => (
            <Link key={r} href={q({ d: r })} aria-current={r === days ? 'true' : undefined}>
              {r === 365 ? tr('Rok') : tr.n(r, '{n} deň|{n} dni|{n} dní')}
            </Link>
          ))}
        </nav>
      </AdmHead>
      <nav className="adm-tabs" aria-label={tr('Pohľad')}>
        <Link href={q({ tab: 'web' })} aria-current={tab === 'web' ? 'page' : undefined}>
          {tr('Návštevnosť webu')}
        </Link>
        {showBiz ? (
          <Link href={q({ tab: 'lad' })} aria-current={tab === 'lad' ? 'page' : undefined}>
            {tr('Ľadová plocha a tržby')}
          </Link>
        ) : null}
      </nav>
      {tab === 'web' ? <Traffic range={range} /> : <Business range={range} />}
    </div>
  );
}

async function Traffic({ range }: { range: ReturnType<typeof rangeOf> }) {
  const tr = await getT();
  // názov krajiny v jazyku administrácie (kód ISO → „Slovensko“, „Slovakia“…)
  const regions = new Intl.DisplayNames([tr.intl], { type: 'region' });
  const country = (code: string) => {
    try {
      return /^[A-Z]{2}$/.test(code) ? (regions.of(code) ?? code) : tr(code);
    } catch {
      return code;
    }
  };
  const t = await trafficStats(range);
  const funnelMax = Math.max(t.funnel[0].value, 1);
  return (
    <>
      <div className="kpis">
        <Kpi label={tr('Návštevníci')} value={t.visitors.toLocaleString('sk-SK')} change={delta(t.visitors, t.prevVisitors)} note={tr('oproti predch. obdobiu')} />
        <Kpi label={tr('Zobrazenia stránok')} value={t.views.toLocaleString('sk-SK')} change={delta(t.views, t.prevViews)} note={tr('{replace} na návštevníka', { replace: t.perVisitor.toFixed(1).replace('.', ',') })} />
        <Kpi label={tr('Priemerný čas na stránke')} value={t.avgDurationSec ? dur(t.avgDurationSec) : '—'} note={tr('bez okamžitých odchodov')} />
        <Kpi
          label={tr('Práve na webe')}
          value={
            <>
              <i className="kpi__live" aria-hidden="true" />
              {t.live}
            </>
          }
          note={tr('za 5 minút · prihlásení {pct} zobrazení', { pct: pct(t.loggedShare) })}
        />
      </div>

      <Panel title={tr('Návštevníci po dňoch')}>
        <BarChart points={t.daily} valueLabel={tr('Návštevníci')} extraLabel="Zobrazenia" />
      </Panel>

      <div className="adm-grid adm-grid--even">
        <Panel title={tr('Najnavštevovanejšie stránky')}>
          <Meters rows={t.pages.map((p) => ({ label: PATH_LABEL[p.label] ? tr(PATH_LABEL[p.label]) : p.label, value: p.value, note: tr.n(p.visitors, '{n} návštevník|{n} návštevníci|{n} návštevníkov') + (p.durSec ? tr(' · priemerne {dur}', { dur: dur(p.durSec) }) : '') }))} unit={tr('zobr.')} />
        </Panel>
        <Panel title={tr('Odkiaľ prichádzajú')}>
          <Meters rows={t.sources} unit={tr('návšt.')} />
          {t.refs.length ? (
            <>
              <h3 className="adm-sub">{tr('Odkazujúce weby')}</h3>
              <Meters rows={t.refs} />
            </>
          ) : null}
        </Panel>
      </div>

      <Panel title={tr('Kedy ľudia web navštevujú')}>
        <Heatmap grid={t.heat} unit={tr('zobrazení')} />
      </Panel>

      <div className="adm-grid adm-grid--three">
        <Panel title={tr('Zariadenia')}>
          <Meters rows={t.devices.map((d) => ({ ...d, label: DEVICE[d.label] ? tr(DEVICE[d.label]) : d.label }))} />
        </Panel>
        <Panel title={tr('Prehliadače')}>
          <Meters rows={t.browsers} />
        </Panel>
        <Panel title={tr('Krajiny')}>
          <Meters rows={t.countries.map((c) => ({ ...c, label: country(c.label) }))} />
        </Panel>
      </div>

      <Panel title={tr('Cesta k rezervácii')}>
        <ol className="fn">
          {t.funnel.map((f, i) => (
            <li key={f.label}>
              <span className="fn__label">
                <b>{i + 1}</b>
                {tr(f.label)}
              </span>
              <span className="fn__track">
                <Dyn as="i" css={{ width: `${Math.max(1.5, (f.value / funnelMax) * 100)}%` }} />
              </span>
              <span className="fn__val">
                {f.value.toLocaleString('sk-SK')}
                {i > 0 && t.funnel[i - 1].value ? <small>{tr('{pct} z predch.', { pct: pct(f.value / t.funnel[i - 1].value) })} </small> : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="adm-note muted">
          {tr('Meranie je bez cookies a bez ukladania IP adries. Návštevník sa počíta raz za deň; personál a roboty sa nezapočítavajú, rešpektuje sa aj „Do Not Track“.')}
        </p>
      </Panel>
    </>
  );
}

async function Business({ range }: { range: ReturnType<typeof rangeOf> }) {
  const tr = await getT();
  const s = await getBookingSettings();
  const b = await businessStats(range, s);
  return (
    <>
      <div className="kpis">
        <Kpi label={tr('Tržby')} value={euros(b.revenue)} change={delta(b.revenue, b.prevRevenue)} note={tr('zaplatené {euros}', { euros: euros(b.paid) })} />
        <Kpi label={tr('Obsadenosť ľadu')} value={pct(b.occupancy)} note={tr('{hours} z {round} hodín', { hours: b.hours, round: Math.round(b.capacity) })} />
        <Kpi label={tr('Rezervácie')} value={b.count} change={delta(b.count, b.prevCount)} note={tr('priemer {replace} h · {euros}', { replace: b.avgHours.toFixed(1).replace('.', ','), euros: euros(Math.round(b.avgPrice)) })} />
        <Kpi label={tr('Noví zákazníci')} value={b.newUsers} change={delta(b.newUsers, b.prevUsers)} note={tr('registrácie')} />
      </div>

      <Panel title={tr('Tržby po dňoch (podľa termínu tréningu)')}>
        <BarChart points={b.dailyRevenue} valueLabel={tr('Tržby')} unit="€" extraLabel={tr('Hodiny ľadu')} extraUnit="h" />
      </Panel>

      <Panel title={tr('Obsadenosť podľa dňa a hodiny')}>
        <Heatmap grid={b.heat} fromHour={b.openHour} toHour={b.closeHour} percent />
        <p className="adm-note muted">{tr('Percento hodín v danom čase, ktoré boli v zvolenom období predané. Pomáha nastaviť cenu špičky a akcie na slabé časy.')}</p>
      </Panel>

      <div className="kpis kpis--small">
        <Kpi label={tr('Nezaplatené')} value={euros(b.unpaid)} note={tr('v zvolenom období')} invert />
        <Kpi label={tr('Rezervované online')} value={pct(b.onlineShare)} note={tr('zvyšok zadala recepcia')} />
        <Kpi label={tr('Sprchy')} value={pct(b.showerRate)} note={tr('rezervácií so sprchami')} />
        <Kpi label={tr('Rezervujú vopred')} value={tr('{n} dňa', { n: b.leadDays.toLocaleString(tr.intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })} note={tr('priemerne')} />
        <Kpi label={tr('Zrušené')} value={pct(b.cancelRate)} note={tr('z {created} vytvorených', { created: b.created })} invert />
        <Kpi label={tr('Neprišli')} value={pct(b.noShowRate)} note={tr('z odohraných')} invert />
      </div>

      <div className="adm-grid adm-grid--even">
        <Panel title={tr('Najčastejší zákazníci')}>
          <Meters rows={b.teams.map((t) => ({ label: t.label, value: t.hours, note: `${tr.n(t.count, '{n} rezervácia|{n} rezervácie|{n} rezervácií')} · ${euros(t.cents)}` }))} unit={tr('h')} />
        </Panel>
        <Panel title={tr('Spôsob platby')}>
          <Meters rows={b.methods} unit={tr('rez.')} />
          {b.blockedHours ? <p className="adm-note muted">{tr('Blokovaný čas (údržba, turnaje): {blockedHours} h – do kapacity sa nepočíta.', { blockedHours: b.blockedHours })} </p> : null}
        </Panel>
      </div>
    </>
  );
}
