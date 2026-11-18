import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { AdmHead, Chip, Panel, fmtDateTime, INQUIRY_STATUS } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import { updateInquiryAction } from '@/lib/actions/inquiry';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Dopyt') };
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ stav?: string }> };

export default async function DopytDetail({ params, searchParams }: Props) {
  const t = await getT();
  const { id } = await params;
  await requireStaff('inquiries.manage', `/admin/dopyty/${id}`);
  const sp = await searchParams;
  const r = await prisma.inquiry.findUnique({ where: { id } });
  if (!r) notFound();
  const details = (r.details ?? {}) as Record<string, string>;
  const reply = `mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject ?? t('Váš dopyt')} – I-SPORT COMPLEX`)}`;

  return (
    <div className="adm__stack">
      <Link href="/admin/dopyty" className="adm-back">
        {t('← Dopyty')}
      </Link>
      <AdmHead title={r.organization ?? r.name} sub={`${r.subject ?? ''} · ${fmtDateTime(r.createdAt, t)}`}>
        <Chip tone={INQUIRY_STATUS[r.status].tone}>{t(INQUIRY_STATUS[r.status].label)}</Chip>
        <a href={reply} className="btn btn--sm">
          {t('Odpovedať e-mailom')}
        </a>
      </AdmHead>
      {sp.stav === 'ulozene' ? <FormAlert success={t('Uložené.')} /> : null}

      <div className="adm-grid">
        <Panel title={t('Správa')}>
          <p className="u-pre">{r.message}</p>
          {details.obdobie || details.terminy ? (
            <dl className="adm-dl">
              {details.obdobie ? (
                <div>
                  <dt>{t('Obdobie')}</dt>
                  <dd>{details.obdobie}</dd>
                </div>
              ) : null}
              {details.terminy ? (
                <div>
                  <dt>{t('Dni a časy')}</dt>
                  <dd>{details.terminy}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </Panel>
        <Panel title={t('Kontakt')}>
          <dl className="adm-dl">
            <div>
              <dt>{t('Meno')}</dt>
              <dd>{r.name}</dd>
            </div>
            <div>
              <dt>{t('E-mail')}</dt>
              <dd>
                <a href={reply}>{r.email}</a>
              </dd>
            </div>
            <div>
              <dt>{t('Telefón')}</dt>
              <dd>{r.phone ? <a href={`tel:${r.phone}`}>{r.phone}</a> : '—'}</dd>
            </div>
            {r.organization ? (
              <div>
                <dt>{t('Organizácia')}</dt>
                <dd>{r.organization}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>
      </div>

      <Panel title={t('Vybavenie')}>
        <form action={updateInquiryAction} className="adm-inline-form u-mt0">
          <input type="hidden" name="id" value={r.id} />
          <label className="adm-label u-f200">
            {t('Stav')}
            <select name="status" defaultValue={r.status} className="adm-select">
              <option value="NEW">{t('Nový')}</option>
              <option value="IN_PROGRESS">{t('Rieši sa')}</option>
              <option value="DONE">{t('Vybavený')}</option>
              <option value="SPAM">{t('Spam')}</option>
            </select>
          </label>
          <label className="adm-label">
            {t('Interná poznámka')}
            <textarea name="staffNote" defaultValue={r.staffNote ?? ''} rows={3} maxLength={2000} className="textarea u-ta-sm" />
          </label>
          <button className="btn btn--sm">{t('Uložiť')}</button>
        </form>
        {r.handledAt ? <p className="muted adm-note">{t('Naposledy upravené {fmtDateTime}', { fmtDateTime: fmtDateTime(r.handledAt, t) })}</p> : null}
      </Panel>
    </div>
  );
}
