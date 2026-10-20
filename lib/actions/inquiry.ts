'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { InquiryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { FormState } from '@/lib/formState';
import { checkFormGuard } from '@/lib/formGuard';
import { hitLimit, minutes } from '@/lib/rateLimit';
import { getBaseUrl, getRequestInfo } from '@/lib/requestInfo';
import { getSessionUser } from '@/lib/session';
import { requireStaff } from '@/lib/staff';
import { getSite } from '@/lib/siteSettings';
import { isEmail, normalizeEmail, normalizePhone, isPhone, str } from '@/lib/validate';
import { sendInquiryNotification, sendInquiryReceipt } from '@/lib/email';

export async function createInquiryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { ip } = await getRequestInfo();
  const type = str(form, 'type', 10) === 'CLUB' ? 'CLUB' : 'CONTACT';
  const values = {
    name: str(form, 'name', 120),
    email: normalizeEmail(str(form, 'email', 254)),
    phone: normalizePhone(str(form, 'phone', 30)),
    organization: str(form, 'organization', 150),
    subject: str(form, 'subject', 150),
    message: str(form, 'message', 3000),
    term: str(form, 'term', 150),
    slots: str(form, 'slots', 300),
  };
  const guard = checkFormGuard(form);
  if (!guard.ok) return { error: 'Formulár sa nepodarilo odoslať. Obnov stránku a skús to znova.', values };
  const limit = await hitLimit(`inquiry:ip:${ip}`, 5, 60 * 60);
  if (!limit.ok) return { error: `Odoslal si veľa správ. Skús to o ${minutes(limit.retryAfterSec)} min alebo nám zavolaj.`, values };

  const errors: Record<string, string> = {};
  if (values.name.length < 2) errors.name = 'Zadaj meno.';
  if (!isEmail(values.email)) errors.email = 'Zadaj platný e-mail.';
  if (values.phone && !isPhone(values.phone)) errors.phone = 'Neplatný telefón.';
  if (type === 'CLUB' && values.organization.length < 2) errors.organization = 'Zadaj názov klubu alebo firmy.';
  if (values.message.length < 10) errors.message = 'Napíš nám aspoň pár slov.';
  if (Object.keys(errors).length) return { error: 'Skontroluj označené polia.', errors, values };

  const user = await getSessionUser();
  const inquiry = await prisma.inquiry.create({
    data: {
      type,
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      organization: values.organization || null,
      subject: type === 'CLUB' ? 'Sezónny prenájom ľadu' : values.subject || 'Správa z webu',
      message: values.message,
      details: type === 'CLUB' ? { obdobie: values.term, terminy: values.slots } : undefined,
      userId: user?.id ?? null,
      ip,
    },
  });

  const site = await getSite();
  const base = await getBaseUrl();
  const notifyTo = site.notifyEmail || site.email;
  try {
    if (notifyTo) {
      await sendInquiryNotification(
        notifyTo,
        `${base}/admin/dopyty/${inquiry.id}`,
        [
          { label: 'Typ', value: type === 'CLUB' ? 'Klub / sezónny prenájom' : 'Kontakt' },
          { label: 'Meno', value: values.name },
          { label: 'E-mail', value: values.email },
          ...(values.phone ? [{ label: 'Telefón', value: values.phone }] : []),
          ...(values.organization ? [{ label: 'Organizácia', value: values.organization }] : []),
          ...(values.term ? [{ label: 'Obdobie', value: values.term }] : []),
          ...(values.slots ? [{ label: 'Termíny', value: values.slots }] : []),
        ],
        values.message,
      );
    }
    await sendInquiryReceipt(values.email, values.name.split(' ')[0], base);
  } catch (err) {
    console.error('[email:inquiry]', err);
  }
  return { done: true, values: { name: values.name } };
}

const STATUSES: InquiryStatus[] = ['NEW', 'IN_PROGRESS', 'DONE', 'SPAM'];

export async function updateInquiryAction(form: FormData): Promise<void> {
  const me = await requireStaff('inquiries.manage');
  const id = str(form, 'id', 40);
  const status = str(form, 'status', 20) as InquiryStatus;
  const note = str(form, 'staffNote', 2000);
  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) redirect('/admin/dopyty');
  await prisma.inquiry.update({
    where: { id },
    data: {
      status: STATUSES.includes(status) ? status : inquiry.status,
      staffNote: note || null,
      handledById: me.id,
      handledAt: new Date(),
    },
  });
  const { ip } = await getRequestInfo();
  await prisma.auditLog.create({ data: { actorId: me.id, action: 'inquiry.update', target: id, meta: { status }, ip } });
  revalidatePath('/admin/dopyty');
  redirect(`/admin/dopyty/${id}?stav=ulozene`);
}
