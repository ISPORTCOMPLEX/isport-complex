import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { ensureLeagueTables } from '@/lib/league/db';
import { logoUrl, playerPhotoUrl, readImg, type LImg } from '@/lib/league/images';
import { TeamEditForm } from '@/components/league/TeamEditForm';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Úprava tímu'), robots: { index: false, follow: false } };
}

const up = (img: LImg | null, url: string | null) => (img && url ? { img, url } : null);

export default async function UpravaTimuPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const me = await getSessionUser();
  if (!me) return redirect(`/prihlasenie?next=${encodeURIComponent(`/sutaz/moj-tim/tim/${id}`)}`);
  await ensureLeagueTables();
  const team = await prisma.leagueTeam.findFirst({ where: { id, userId: me.id }, include: { players: { orderBy: [{ position: 'desc' }, { number: 'asc' }, { name: 'asc' }] } } });
  if (!team) notFound();
  const logo = readImg(team.logo);
  return (
    <>
      <Link href="/sutaz/moj-tim" className="lg-back">
        ← {t('Môj tím')}
      </Link>
      <h1 className="lgh">{t('Úprava tímu {name}', { name: team.name })}</h1>
      <TeamEditForm
        teamId={team.id}
        logo={up(logo, logoUrl(logo))}
        players={team.players.map((p, i) => {
          const ph = readImg(p.photo);
          return {
            id: p.id,
            key: i,
            name: p.name,
            number: p.number === null ? '' : String(p.number),
            pos: p.position,
            year: p.birthYear ? String(p.birthYear) : '',
            height: p.heightCm ? String(p.heightCm) : '',
            weight: p.weightKg ? String(p.weightKg) : '',
            shoots: p.shoots,
            photo: up(ph, playerPhotoUrl(ph)),
          };
        })}
      />
    </>
  );
}
