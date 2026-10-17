import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { ArrowUpRight } from '@/components/Icons';

export const metadata: Metadata = { title: 'Môj účet' };

export default async function UcetPage() {
  const user = await requireUser('/ucet');
  const since = new Intl.DateTimeFormat('sk-SK', { month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' }).format(user.createdAt);
  return (
    <div className="acct__stack">
      <header className="acct__head">
        <span className="kicker">Môj účet</span>
        <h1 className="display acct__title">
          Ahoj, <span className="red">{user.firstName}</span>
        </h1>
        <p className="muted">Člen od {since}</p>
      </header>

      <Link href="/rezervacia" className="card card--red acct__cta">
        <div>
          <span className="pill">Rezervácia ľadu</span>
          <h2 className="h-card">Rezervuj si ďalší tréning</h2>
          <p>Celá plocha alebo polovica, platba online.</p>
        </div>
        <span className="round-arrow">
          <ArrowUpRight />
        </span>
      </Link>

      <div className="acct__grid">
        <div className="card acct__tile">
          <h2 className="h-card">Moje rezervácie</h2>
          <p className="muted">Zatiaľ nemáš žiadne rezervácie. Tu uvidíš nadchádzajúce tréningy, QR vstup a faktúry.</p>
        </div>
        <Link href="/ucet/zabezpecenie" className="card acct__tile">
          <h2 className="h-card">Zabezpečenie</h2>
          <p className="muted">Dvojstupňové overenie:</p>
          <span className={`status ${user.twoFactorEnabledAt ? 'status--ok' : 'status--warn'}`}>{user.twoFactorEnabledAt ? 'Zapnuté' : 'Vypnuté – odporúčame zapnúť'}</span>
        </Link>
        <Link href="/ucet/profil" className="card acct__tile">
          <h2 className="h-card">Osobné údaje</h2>
          <p className="muted">
            {user.firstName} {user.lastName}
            <br />
            {user.phone ?? 'Telefón nie je vyplnený'}
          </p>
        </Link>
      </div>
    </div>
  );
}
