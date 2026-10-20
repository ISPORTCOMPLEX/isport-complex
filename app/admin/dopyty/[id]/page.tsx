import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/staff';
import { AdmHead, Chip, Panel, fmtDateTime, INQUIRY_STATUS } from '@/components/admin/ui';
import { FormAlert } from '@/components/forms/FormAlert';
import { updateInquiryAction } from '@/lib/actions/inquiry';

export const metadata: Metadata = { title: 'Dopyt' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ stav?: string }> };

export default async function DopytDetail({ params, searchParams }: Props) {
  const { id } = await params;
  await requireStaff('inquiries.manage', `/admin/dopyty/${id}`);
  const sp = await searchParams;
  const r = await prisma.inquiry.findUnique({ where: { id } });
  if (!r) notFound();
  const details = (r.details ?? {}) as Record<string, string>;
  const reply = `mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject ?? 'Váš dopyt'} – I-SPORT COMPLEX`)}`;

  return (
    <div className="adm__stack">
      <Link href="/admin/dopyty" className="adm-back">
        ← Dopyty
      </Link>
      <AdmHead title={r.organization ?? r.name} sub={`${r.subject ?? ''} · ${fmtDateTime(r.createdAt)}`}>
        <Chip tone={INQUIRY_STATUS[r.status].tone}>{INQUIRY_STATUS[r.status].label}</Chip>
        <a href={reply} className="btn btn--sm">
          Odpovedať e-mailom
        </a>
      </AdmHead>
      {sp.stav === 'ulozene' ? <FormAlert success="Uložené." /> : null}

      <div className="adm-grid">
        <Panel title="Správa">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.message}</p>
          {details.obdobie || details.terminy ? (
            <dl className="adm-dl">
              {details.obdobie ? (
                <div>
                  <dt>Obdobie</dt>
                  <dd>{details.obdobie}</dd>
                </div>
              ) : null}
              {details.terminy ? (
                <div>
                  <dt>Dni a časy</dt>
                  <dd>{details.terminy}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </Panel>
        <Panel title="Kontakt">
          <dl className="adm-dl">
            <div>
              <dt>Meno</dt>
              <dd>{r.name}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>
                <a href={reply}>{r.email}</a>
              </dd>
            </div>
            <div>
              <dt>Telefón</dt>
              <dd>{r.phone ? <a href={`tel:${r.phone}`}>{r.phone}</a> : '—'}</dd>
            </div>
            {r.organization ? (
              <div>
                <dt>Organizácia</dt>
                <dd>{r.organization}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>
      </div>

      <Panel title="Vybavenie">
        <form action={updateInquiryAction} className="adm-inline-form" style={{ marginTop: 0 }}>
          <input type="hidden" name="id" value={r.id} />
          <label className="adm-label" style={{ flex: '0 1 200px' }}>
            Stav
            <select name="status" defaultValue={r.status} className="adm-select">
              <option value="NEW">Nový</option>
              <option value="IN_PROGRESS">Rieši sa</option>
              <option value="DONE">Vybavený</option>
              <option value="SPAM">Spam</option>
            </select>
          </label>
          <label className="adm-label">
            Interná poznámka
            <textarea name="staffNote" defaultValue={r.staffNote ?? ''} rows={3} maxLength={2000} className="textarea" style={{ minHeight: 80, fontSize: 15 }} />
          </label>
          <button className="btn btn--sm">Uložiť</button>
        </form>
        {r.handledAt ? <p className="muted adm-note">Naposledy upravené {fmtDateTime(r.handledAt)}</p> : null}
      </Panel>
    </div>
  );
}
