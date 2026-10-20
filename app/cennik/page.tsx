import type { Metadata } from 'next';
import Link from 'next/link';
import { price } from '@/lib/site';
import { getBookingSettings } from '@/lib/booking/settings';

export const metadata: Metadata = { title: 'Cenník' };

export default async function CennikPage() {
  const settings = await getBookingSettings();
  const p = settings.prices;
  const peak = `${String(settings.peakFromHour).padStart(2, '0')}:00`;
  return (
    <>
      <section className="page-head">
        <div className="wrap page-head__in">
          <nav aria-label="Omrvinky" className="crumbs">
            <Link href="/">Domov</Link>
            <span>/</span>
            Cenník
          </nav>
          <div className="section__head">
            <h1 className="display h1">Cenník ľadu</h1>
            <p className="muted">Ceny sú vrátane DPH. Prenajíma sa celá plocha, úprava ľadu je v cene, šatne za príplatok.</p>
          </div>

          <div className="table-card">
            <table className="price-table">
              <thead>
                <tr>
                  <th scope="col" className="muted" style={{ fontSize: 14 }}>
                    Prenájom
                  </th>
                  <th scope="col">
                    <span className="display col-title">Mimo špičky</span>
                    <span className="col-sub">Po – Pi do {peak}</span>
                  </th>
                  <th scope="col">
                    <span className="display col-title">Špička</span>
                    <span className="col-sub">Po – Pi od {peak}</span>
                  </th>
                  <th scope="col">
                    <span className="display col-title">Víkend</span>
                    <span className="col-sub">So – Ne celý deň</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    Ľadová plocha<span>Celá plocha, cena za 60 minút</span>
                  </th>
                  <td className="num">{price(p.full.offPeak)}</td>
                  <td className="num">{price(p.full.peak)}</td>
                  <td className="num">{price(p.full.weekend)}</td>
                </tr>
                {settings.lockerRooms > 0 ? (
                  <tr>
                    <th scope="row">
                      Šatňa<span>Za každú šatňu k rezervácii</span>
                    </th>
                    <td colSpan={3} className="num">
                      {price(settings.lockerPrice)}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row">
                    Sezónny prenájom<span>Pevný čas každý týždeň</span>
                  </th>
                  <td colSpan={3} style={{ fontSize: 17 }}>
                    <Link href="/pre-kluby" className="link-red">
                      Individuálna ponuka pre kluby
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <Link href="/rezervacia" className="btn">
              Rezervovať ľad
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--deep">
        <div className="wrap section__in" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 64 }}>
          <div style={{ flex: '1 1 460px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <h2 className="display h2">Zrušenie rezervácie</h2>
            <dl className="dl-rows">
              <div>
                <dt>Viac ako {settings.cancelFreeHours} hodín pred začiatkom</dt>
                <dd style={{ color: 'var(--green)' }}>Bez poplatku</dd>
              </div>
              <div>
                <dt>Neskôr</dt>
                <dd>Len cez recepciu</dd>
              </div>
            </dl>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              Rezerváciu môžeš namiesto zrušenia aj presunúť na iný voľný termín.
            </p>
          </div>
          <div style={{ flex: '1 1 460px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <h2 className="display h2">Pre kluby</h2>
            <p className="muted" style={{ margin: 0 }}>
              Pravidelný ľad na celú sezónu s mesačnou faktúrou. Cenu pripravíme podľa počtu hodín a časov.
            </p>
            <Link href="/pre-kluby" className="btn btn--ghost" style={{ alignSelf: 'flex-start' }}>
              Sezónny prenájom
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
