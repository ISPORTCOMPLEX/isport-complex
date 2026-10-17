import 'server-only';

// E-maily cez Resend (REST API, bez ďalšej knižnice).
// Bez RESEND_API_KEY sa pri vývoji e-mail len vypíše do terminálu, aby sa dalo testovať.

type Mail = { to: string; subject: string; html: string; text: string };

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

function layout(title: string, intro: string, buttonText: string, url: string, outro: string): { html: string; text: string } {
  const html = `<!doctype html><html lang="sk"><body style="margin:0;background:#070708;font-family:Arial,Helvetica,sans-serif;color:#F4F6F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070708;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111114;border:1px solid #25252A;border-radius:18px;overflow:hidden">
<tr><td style="height:4px;background:#E3121B"></td></tr>
<tr><td style="padding:32px 32px 8px"><div style="font-size:22px;font-weight:900;font-style:italic;letter-spacing:.02em">I-SPORT <span style="font-size:11px;letter-spacing:.4em;color:#9AA1A8;font-style:normal;font-weight:600">COMPLEX</span></div></td></tr>
<tr><td style="padding:16px 32px 0"><h1 style="margin:0;font-size:24px;line-height:1.3;color:#F4F6F7">${esc(title)}</h1></td></tr>
<tr><td style="padding:12px 32px 0;font-size:16px;line-height:1.6;color:#C8CDD2">${esc(intro)}</td></tr>
<tr><td style="padding:24px 32px"><a href="${esc(url)}" style="display:inline-block;background:#E3121B;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:999px">${esc(buttonText)}</a></td></tr>
<tr><td style="padding:0 32px 8px;font-size:13px;line-height:1.6;color:#9AA1A8">Ak tlačidlo nefunguje, skopíruj do prehliadača:<br><span style="color:#C8CDD2;word-break:break-all">${esc(url)}</span></td></tr>
<tr><td style="padding:16px 32px 32px;font-size:13px;line-height:1.6;color:#9AA1A8">${esc(outro)}</td></tr>
</table>
<div style="padding:16px;font-size:12px;color:#6E747A">I - SPORT COMPLEX s.r.o., Fejova 1527/2, 040 01 Košice</div>
</td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${buttonText}: ${url}\n\n${outro}\n\nI - SPORT COMPLEX s.r.o., Fejova 1527/2, 040 01 Košice`;
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
