import Link from 'next/link';
import { Dyn } from '@/components/Dyn';
import { initials, inkOn, safeColor, type LPlayer, type LTeam } from '@/lib/league/calc';
import type { T } from '@/lib/i18n/translate';

// Odznak tímu: kruh vo farbe tímu so skratkou (tímy nemajú logá – nič nekreslíme za ne).
export function TeamBadge({ team, size = 'md' }: { team: Pick<LTeam, 'short' | 'color' | 'name'>; size?: 'sm' | 'md' | 'lg' }) {
  const c = safeColor(team.color);
  return (
    <Dyn as="span" className={`lgt lgt--${size}`} css={{ '--tc': c, '--ti': inkOn(c) }} aria-hidden="true">
      {team.short}
    </Dyn>
  );
}

// Avatar hráča: iniciály vo farbe jeho tímu
export function PlayerAvatar({ player, team, size = 'md' }: { player: Pick<LPlayer, 'name'>; team: Pick<LTeam, 'color'>; size?: 'md' | 'lg' }) {
  const c = safeColor(team.color);
  return (
    <Dyn as="span" className={`lga lga--${size}`} css={{ '--tc': c, '--ti': inkOn(c) }} aria-hidden="true">
      {initials(player.name)}
    </Dyn>
  );
}

export const POS: Record<string, string> = { F: 'Ú', D: 'O', G: 'B' };

export function LeagueEmpty({ t, title, text, cta = true }: { t: T; title: string; text: string; cta?: boolean }) {
  return (
    <div className="lge">
      <span className="lge__ic" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24">
          <path d="M6 3h12v2h3v3a5 5 0 0 1-5 5h-.3A6 6 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A6 6 0 0 1 8.3 13H8a5 5 0 0 1-5-5V5h3V3zm0 4H5v1a3 3 0 0 0 1.4 2.5A6 6 0 0 1 6 9V7zm12 0v2c0 .5 0 1-.1 1.5A3 3 0 0 0 19 8V7h-1z" fill="currentColor" />
        </svg>
      </span>
      <h2 className="lge__t">{title}</h2>
      <p>{text}</p>
      {cta ? (
        <Link href="/sutaz/registracia" className="lgbtn lgbtn--gold">
          {t('Prihlásiť tím do súťaže')}
        </Link>
      ) : null}
    </div>
  );
}

// Pás dní (výsledky, rozpis): dátum, deň v týždni, počet zápasov
export function DayStrip({ days, current, href, t }: { days: { iso: string; count: number }[]; current: string; href: (iso: string) => string; t: T }) {
  const fmtD = new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', day: 'numeric', month: 'numeric' });
  const fmtW = new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', weekday: 'short' });
  return (
    <nav className="lgd" aria-label={t('Výber dňa')}>
      {days.map((d) => {
        const dt = new Date(`${d.iso}T12:00:00Z`);
        return (
          <Link key={d.iso} href={href(d.iso)} className="lgd__d" aria-current={d.iso === current ? 'date' : undefined}>
            <span className="lgd__top">
              <span>{fmtD.format(dt)}</span>
              <span className="lgd__w">{fmtW.format(dt).replace('.', '').toUpperCase()}</span>
            </span>
            <span className="lgd__n">{d.count ? t.n(d.count, '{n} zápas|{n} zápasy|{n} zápasov') : t('bez zápasu')}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export const longDay = (iso: string, t: T) => new Intl.DateTimeFormat(t.intl, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00Z`));
export const hhmm = (d: Date, t: T) => new Intl.DateTimeFormat(t.intl, { timeZone: 'Europe/Bratislava', hour: '2-digit', minute: '2-digit' }).format(d);
