import 'server-only';

// E-maily cez Resend (REST API, bez ďalšej knižnice).
// Bez RESEND_API_KEY sa pri vývoji e-mail len vypíše do terminálu, aby sa dalo testovať.

type Mail = { to: string; subject: string; html: string; text: string };

// Kým nie je doména a Resend, ostrý web e-maily neposiela – aktiváciu účtov a obnovu hesla rieši recepcia.
// Pri vývoji (localhost) sa e-maily vypisujú do terminálu a odkazy sa ukážu na stránke.
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== 'production';
}

export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'I-SPORT COMPLEX <onboarding@resend.dev>';

  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('Chýba RESEND_API_KEY.');
    console.log(`\n──── E-MAIL (vývoj, neodoslaný) ────\nKomu: ${mail.to}\nPredmet: ${mail.subject}\n\n${mail.text}\n────────────────────────────────────\n`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export type Row = { label: string; value: string };

function layout(title: string, intro: string, buttonText: string, url: string, outro: string, rows: Row[] = []): { html: string; text: string } {
  // Logo sa načíta z webu ako PNG (e-mailové programy nezobrazujú SVG).
  const origin = new URL(url).origin;
  const html = `<!doctype html><html lang="sk"><body style="margin:0;background:#070708;font-family:Arial,Helvetica,sans-serif;color:#F4F6F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070708;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111114;border:1px solid #25252A;border-radius:18px;overflow:hidden">
<tr><td style="height:4px;background:#E3121B"></td></tr>
<tr><td style="padding:28px 32px 8px"><img src="${esc(origin)}/brand/email-logo.png" width="220" height="41" alt="I-SPORT COMPLEX" style="display:block;border:0;color:#F4F6F7;font-size:20px;font-weight:900"></td></tr>
<tr><td style="padding:16px 32px 0"><h1 style="margin:0;font-size:24px;line-height:1.3;color:#F4F6F7">${esc(title)}</h1></td></tr>
<tr><td style="padding:12px 32px 0;font-size:16px;line-height:1.6;color:#C8CDD2">${esc(intro)}</td></tr>
${rows.length ? `<tr><td style="padding:20px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #25252A;border-radius:12px">${rows.map((r, i) => `<tr><td style="padding:12px 16px;font-size:13px;color:#9AA1A8;${i ? 'border-top:1px solid #25252A;' : ''}">${esc(r.label)}</td><td style="padding:12px 16px;font-size:15px;font-weight:700;color:#F4F6F7;text-align:right;${i ? 'border-top:1px solid #25252A;' : ''}">${esc(r.value)}</td></tr>`).join('')}</table></td></tr>` : ''}
<tr><td style="padding:24px 32px"><a href="${esc(url)}" style="display:inline-block;background:#E3121B;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:999px">${esc(buttonText)}</a></td></tr>
<tr><td style="padding:0 32px 8px;font-size:13px;line-height:1.6;color:#9AA1A8">Ak tlačidlo nefunguje, skopíruj do prehliadača:<br><span style="color:#C8CDD2;word-break:break-all">${esc(url)}</span></td></tr>
<tr><td style="padding:16px 32px 32px;font-size:13px;line-height:1.6;color:#9AA1A8">${esc(outro)}</td></tr>
</table>
<div style="padding:16px;font-size:12px;color:#6E747A">I - SPORT COMPLEX s.r.o., Fejova 1527/2, 040 01 Košice</div>
</td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${rows.map((r) => `${r.label}: ${r.value}`).join('\n')}${rows.length ? '\n\n' : ''}${buttonText}: ${url}\n\n${outro}\n\nI - SPORT COMPLEX s.r.o., Fejova 1527/2, 040 01 Košice`;
  return { html, text };
}

export async function sendVerifyEmail(to: string, firstName: string, url: string) {
  const m = layout(
    `Ahoj ${firstName}, over svoj e-mail`,
    'Ďakujeme za registráciu v I-SPORT COMPLEX. Pre dokončenie účtu klikni na tlačidlo nižšie. Odkaz platí 24 hodín.',
    'Overiť e-mail',
    url,
    'Ak si sa neregistroval ty, tento e-mail ignoruj. Účet bez overenia sa nedá použiť.',
  );
  await sendMail({ to, subject: 'Over svoj e-mail – I-SPORT COMPLEX', ...m });
}

export async function sendResetEmail(to: string, firstName: string, url: string) {
  const m = layout(
    `Obnova hesla`,
    `Ahoj ${firstName}, niekto požiadal o obnovu hesla k tvojmu účtu. Nové heslo si nastavíš cez tlačidlo nižšie. Odkaz platí 1 hodinu a dá sa použiť len raz.`,
    'Nastaviť nové heslo',
    url,
    'Ak si o obnovu nežiadal ty, tento e-mail ignoruj. Tvoje heslo sa nezmení.',
  );
  await sendMail({ to, subject: 'Obnova hesla – I-SPORT COMPLEX', ...m });
}

export async function sendAlreadyRegisteredEmail(to: string, firstName: string, url: string) {
  const m = layout(
    'Účet už existuje',
    `Ahoj ${firstName}, niekto sa pokúsil zaregistrovať s tvojím e-mailom. Účet už máš. Ak si zabudol heslo, obnovíš ho cez tlačidlo nižšie.`,
    'Obnoviť heslo',
    url,
    'Ak si to nebol ty, nemusíš nič robiť.',
  );
  await sendMail({ to, subject: 'Tvoj účet v I-SPORT COMPLEX už existuje', ...m });
}

export async function sendBookingConfirmedEmail(to: string, firstName: string, url: string, rows: Row[]) {
  const m = layout(
    'Rezervácia je potvrdená',
    `Ahoj ${firstName}, tvoj čas na ľade je rezervovaný. Na recepcii ukáž QR kód z detailu rezervácie.`,
    'Zobraziť rezerváciu a QR kód',
    url,
    'Príď aspoň 30 minút pred začiatkom. Rezerváciu zrušíš v časti Môj účet → Moje rezervácie.',
    rows,
  );
  await sendMail({ to, subject: `Rezervácia potvrdená – ${rows[0]?.value ?? ''}`, ...m });
}

export async function sendBookingCancelledEmail(to: string, firstName: string, url: string, rows: Row[], byStaff: boolean) {
  const m = layout(
    'Rezervácia je zrušená',
    byStaff
      ? `Ahoj ${firstName}, tvoju rezerváciu zrušila recepcia haly. Ak máš otázky, kontaktuj nás.`
      : `Ahoj ${firstName}, tvoja rezervácia bola zrušená podľa tvojej žiadosti.`,
    'Rezervovať iný termín',
    url,
    'Ak si rezerváciu nerušil ty, kontaktuj nás čo najskôr.',
    rows,
  );
  await sendMail({ to, subject: `Rezervácia zrušená – ${rows[0]?.value ?? ''}`, ...m });
}

// Dopyt z webu: upozornenie pre halu a potvrdenie pre odosielateľa.
export async function sendInquiryNotification(to: string, adminUrl: string, rows: Row[], message: string) {
  const m = layout('Nový dopyt z webu', message.slice(0, 1500), 'Otvoriť v administrácii', adminUrl, 'Odpovedz zákazníkovi e-mailom alebo telefonicky a dopyt označ ako vybavený.', rows);
  await sendMail({ to, subject: `Nový dopyt: ${rows[0]?.value ?? ''}`, ...m });
}

export async function sendInquiryReceipt(to: string, name: string, siteUrl: string) {
  const m = layout(
    'Dopyt sme prijali',
    `Ahoj ${name}, ďakujeme za správu. Ozveme sa ti najneskôr do 2 pracovných dní.`,
    'Rezervovať ľad online',
    `${siteUrl}/rezervacia`,
    'Toto je automatické potvrdenie, naň neodpovedaj.',
  );
  await sendMail({ to, subject: 'Dopyt sme prijali – I-SPORT COMPLEX', ...m });
}

export async function sendBookingReminderEmail(to: string, firstName: string, url: string, rows: Row[]) {
  const m = layout(
    'Zajtra ideš na ľad',
    `Ahoj ${firstName}, pripomíname tvoju zajtrajšiu rezerváciu. Príď aspoň 30 minút pred začiatkom a na recepcii ukáž QR kód.`,
    'Zobraziť QR kód',
    url,
    'Ak nemôžeš prísť, daj nám vedieť čo najskôr.',
    rows,
  );
  await sendMail({ to, subject: `Pripomienka: zajtra ${rows[2]?.value ?? ''}`, ...m });
}

// Bezpečnostné upozornenie pri zmene hesla alebo vypnutí 2FA – keby to nebol majiteľ účtu, dozvie sa to hneď.
export async function sendSecurityNoticeEmail(to: string, firstName: string, what: string, url: string) {
  const m = layout(
    'Zmena zabezpečenia účtu',
    `Ahoj ${firstName}, na tvojom účte prebehla zmena: ${what}. Ak si to bol ty, nemusíš nič robiť.`,
    'Skontrolovať zabezpečenie',
    url,
    'Ak si to nebol ty, okamžite si obnov heslo a kontaktuj nás.',
  );
  await sendMail({ to, subject: 'Zmena zabezpečenia účtu – I-SPORT COMPLEX', ...m });
}
