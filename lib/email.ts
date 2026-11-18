import 'server-only';
import type { T } from '@/lib/i18n/translate';

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
// Riadky súhrnu sa skladajú až v jazyku e-mailu.
export type Rows = (t: T) => Row[];

// Jazyk e-mailu: jeden (jazyk zákazníka pri akcii na webe) alebo viac (automatické e-maily mimo webu –
// pripomienky, platobná brána: slovensky a pod tým anglicky, lebo jazyk zákazníka vtedy nepoznáme).
export type MailLang = T | T[];

type Content = { title: string; intro: string; button: string; url: string; outro: string; rows?: Row[] };

const FOOT = 'I - SPORT COMPLEX s.r.o., Fejova 1527/2, 040 01 Košice';

function block(c: Content, t: T, first: boolean): string {
  const rows = c.rows ?? [];
  return `${first ? '' : '<tr><td style="padding:8px 32px 0"><div style="border-top:1px solid #25252A"></div></td></tr>'}
<tr><td style="padding:16px 32px 0" lang="${t.locale}"><h1 style="margin:0;font-size:24px;line-height:1.3;color:#F4F6F7">${esc(c.title)}</h1></td></tr>
<tr><td style="padding:12px 32px 0;font-size:16px;line-height:1.6;color:#C8CDD2" lang="${t.locale}">${esc(c.intro)}</td></tr>
${rows.length ? `<tr><td style="padding:20px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #25252A;border-radius:12px">${rows.map((r, i) => `<tr><td style="padding:12px 16px;font-size:13px;color:#9AA1A8;${i ? 'border-top:1px solid #25252A;' : ''}">${esc(r.label)}</td><td style="padding:12px 16px;font-size:15px;font-weight:700;color:#F4F6F7;text-align:right;${i ? 'border-top:1px solid #25252A;' : ''}">${esc(r.value)}</td></tr>`).join('')}</table></td></tr>` : ''}
<tr><td style="padding:24px 32px"><a href="${esc(c.url)}" style="display:inline-block;background:#E3121B;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:999px">${esc(c.button)}</a></td></tr>
<tr><td style="padding:0 32px 8px;font-size:13px;line-height:1.6;color:#9AA1A8" lang="${t.locale}">${esc(t('Ak tlačidlo nefunguje, skopíruj do prehliadača:'))}<br><span style="color:#C8CDD2;word-break:break-all">${esc(c.url)}</span></td></tr>
<tr><td style="padding:16px 32px 24px;font-size:13px;line-height:1.6;color:#9AA1A8" lang="${t.locale}">${esc(c.outro)}</td></tr>`;
}

function textBlock(c: Content): string {
  const rows = c.rows ?? [];
  return `${c.title}\n\n${c.intro}\n\n${rows.map((r) => `${r.label}: ${r.value}`).join('\n')}${rows.length ? '\n\n' : ''}${c.button}: ${c.url}\n\n${c.outro}`;
}

async function send(to: string, lang: MailLang, build: (t: T) => Content & { subject: string }) {
  const langs = Array.isArray(lang) ? lang : [lang];
  const parts = langs.map((t) => ({ t, c: build(t) }));
  // Logo sa načíta z webu ako PNG (e-mailové programy nezobrazujú SVG).
  const origin = new URL(parts[0].c.url).origin;
  const html = `<!doctype html><html lang="${parts[0].t.locale}"><body style="margin:0;background:#070708;font-family:Arial,Helvetica,sans-serif;color:#F4F6F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070708;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111114;border:1px solid #25252A;border-radius:18px;overflow:hidden">
<tr><td style="height:4px;background:#E3121B"></td></tr>
<tr><td style="padding:28px 32px 8px"><img src="${esc(origin)}/brand/email-logo.png" width="220" height="41" alt="I-SPORT COMPLEX" style="display:block;border:0;color:#F4F6F7;font-size:20px;font-weight:900"></td></tr>
${parts.map((p, i) => block(p.c, p.t, i === 0)).join('\n')}
</table>
<div style="padding:16px;font-size:12px;color:#6E747A">${FOOT}</div>
</td></tr></table></body></html>`;
  const text = `${parts.map((p) => textBlock(p.c)).join('\n\n────────\n\n')}\n\n${FOOT}`;
  const subject = parts.map((p) => p.c.subject).join(' / ');
  await sendMail({ to, subject, html, text });
}

export async function sendVerifyEmail(lang: MailLang, to: string, firstName: string, url: string) {
  await send(to, lang, (t) => ({
    subject: t('Over svoj e-mail – I-SPORT COMPLEX'),
    title: t('Ahoj {firstName}, over svoj e-mail', { firstName }),
    intro: t('Ďakujeme za registráciu v I-SPORT COMPLEX. Pre dokončenie účtu klikni na tlačidlo nižšie. Odkaz platí 24 hodín.'),
    button: t('Overiť e-mail'),
    url,
    outro: t('Ak si sa neregistroval ty, tento e-mail ignoruj. Účet bez overenia sa nedá použiť.'),
  }));
}

export async function sendResetEmail(lang: MailLang, to: string, firstName: string, url: string) {
  await send(to, lang, (t) => ({
    subject: t('Obnova hesla – I-SPORT COMPLEX'),
    title: t('Obnova hesla'),
    intro: t('Ahoj {firstName}, niekto požiadal o obnovu hesla k tvojmu účtu. Nové heslo si nastavíš cez tlačidlo nižšie. Odkaz platí 1 hodinu a dá sa použiť len raz.', { firstName }),
    button: t('Nastaviť nové heslo'),
    url,
    outro: t('Ak si o obnovu nežiadal ty, tento e-mail ignoruj. Tvoje heslo sa nezmení.'),
  }));
}

export async function sendAlreadyRegisteredEmail(lang: MailLang, to: string, firstName: string, url: string) {
  await send(to, lang, (t) => ({
    subject: t('Tvoj účet v I-SPORT COMPLEX už existuje'),
    title: t('Účet už existuje'),
    intro: t('Ahoj {firstName}, niekto sa pokúsil zaregistrovať s tvojím e-mailom. Účet už máš. Ak si zabudol heslo, obnovíš ho cez tlačidlo nižšie.', { firstName }),
    button: t('Obnoviť heslo'),
    url,
    outro: t('Ak si to nebol ty, nemusíš nič robiť.'),
  }));
}

export async function sendBookingConfirmedEmail(lang: MailLang, to: string, firstName: string, url: string, rows: Rows) {
  await send(to, lang, (t) => {
    const r = rows(t);
    return {
      subject: t('Rezervácia potvrdená – {code}', { code: r[0]?.value ?? '' }),
      title: t('Rezervácia je potvrdená'),
      intro: t('Ahoj {firstName}, tvoj čas na ľade je rezervovaný. Na recepcii ukáž QR kód z detailu rezervácie.', { firstName }),
      button: t('Zobraziť rezerváciu a QR kód'),
      url,
      outro: t('Príď aspoň 30 minút pred začiatkom. Rezerváciu zrušíš v časti Môj účet → Moje rezervácie.'),
      rows: r,
    };
  });
}

export async function sendBookingCancelledEmail(lang: MailLang, to: string, firstName: string, url: string, rows: Rows, byStaff: boolean) {
  await send(to, lang, (t) => {
    const r = rows(t);
    return {
      subject: t('Rezervácia zrušená – {code}', { code: r[0]?.value ?? '' }),
      title: t('Rezervácia je zrušená'),
      intro: byStaff
        ? t('Ahoj {firstName}, tvoju rezerváciu zrušila recepcia haly. Ak máš otázky, kontaktuj nás.', { firstName })
        : t('Ahoj {firstName}, tvoja rezervácia bola zrušená podľa tvojej žiadosti.', { firstName }),
      button: t('Rezervovať iný termín'),
      url,
      outro: t('Ak si rezerváciu nerušil ty, kontaktuj nás čo najskôr.'),
      rows: r,
    };
  });
}

export async function sendPaymentExpiredEmail(lang: MailLang, to: string, firstName: string, url: string, rows: Rows) {
  await send(to, lang, (t) => {
    const r = rows(t);
    return {
      subject: t('Rezervácia nebola dokončená – {code}', { code: r[0]?.value ?? '' }),
      title: t('Rezervácia nebola dokončená'),
      intro: t('Ahoj {firstName}, platba kartou neprišla včas, preto sme podržaný čas uvoľnili. Žiadne peniaze sme nestiahli.', { firstName }),
      button: t('Rezervovať znova'),
      url,
      outro: t('Ak je termín stále voľný, môžeš si ho rezervovať znova a zaplatiť aj na recepcii alebo prevodom.'),
      rows: r,
    };
  });
}

export async function sendRefundEmail(lang: MailLang, to: string, firstName: string, url: string, rows: Rows, amount: string) {
  await send(to, lang, (t) => {
    const r = rows(t);
    return {
      subject: t('Vrátenie platby – {code}', { code: r[0]?.value ?? '' }),
      title: t('Vrátili sme ti peniaze'),
      intro: t('Ahoj {firstName}, na tvoju kartu sme vrátili {amount}. Na účte sa peniaze zvyčajne objavia do 5 až 10 pracovných dní, podľa banky.', { firstName, amount }),
      button: t('Zobraziť rezerváciu'),
      url,
      outro: t('Ak peniaze do 10 pracovných dní neprídu, kontaktuj nás a pošleme ti potvrdenie o vrátení.'),
      rows: r,
    };
  });
}

// Dopyt z webu: upozornenie pre halu (vždy po slovensky) a potvrdenie pre odosielateľa (v jeho jazyku).
export async function sendInquiryNotification(lang: MailLang, to: string, adminUrl: string, rows: Rows, message: string) {
  await send(to, lang, (t) => {
    const r = rows(t);
    return {
      subject: t('Nový dopyt: {subject}', { subject: r[0]?.value ?? '' }),
      title: t('Nový dopyt z webu'),
      intro: message.slice(0, 1500),
      button: t('Otvoriť v administrácii'),
      url: adminUrl,
      outro: t('Odpovedz zákazníkovi e-mailom alebo telefonicky a dopyt označ ako vybavený.'),
      rows: r,
    };
  });
}

export async function sendInquiryReceipt(lang: MailLang, to: string, name: string, siteUrl: string) {
  await send(to, lang, (t) => ({
    subject: t('Dopyt sme prijali – I-SPORT COMPLEX'),
    title: t('Dopyt sme prijali'),
    intro: t('Ahoj {name}, ďakujeme za správu. Ozveme sa ti najneskôr do 2 pracovných dní.', { name }),
    button: t('Rezervovať ľad online'),
    url: `${siteUrl}/rezervacia`,
    outro: t('Toto je automatické potvrdenie, naň neodpovedaj.'),
  }));
}

export async function sendBookingReminderEmail(lang: MailLang, to: string, firstName: string, url: string, rows: Rows) {
  await send(to, lang, (t) => {
    const r = rows(t);
    return {
      subject: t('Pripomienka: zajtra {time}', { time: r[2]?.value ?? '' }),
      title: t('Zajtra ideš na ľad'),
      intro: t('Ahoj {firstName}, pripomíname tvoju zajtrajšiu rezerváciu. Príď aspoň 30 minút pred začiatkom a na recepcii ukáž QR kód.', { firstName }),
      button: t('Zobraziť QR kód'),
      url,
      outro: t('Ak nemôžeš prísť, daj nám vedieť čo najskôr.'),
      rows: r,
    };
  });
}

// Bezpečnostné upozornenie pri zmene hesla alebo vypnutí 2FA – keby to nebol majiteľ účtu, dozvie sa to hneď.
// what = slovenský kľúč prekladu (napr. msg('zmena hesla')).
export async function sendSecurityNoticeEmail(lang: MailLang, to: string, firstName: string, what: string, url: string) {
  await send(to, lang, (t) => ({
    subject: t('Zmena zabezpečenia účtu – I-SPORT COMPLEX'),
    title: t('Zmena zabezpečenia účtu'),
    intro: t('Ahoj {firstName}, na tvojom účte prebehla zmena: {what}. Ak si to bol ty, nemusíš nič robiť.', { firstName, what: t(what) }),
    button: t('Skontrolovať zabezpečenie'),
    url,
    outro: t('Ak si to nebol ty, okamžite si obnov heslo a kontaktuj nás.'),
  }));
}

// Súťaž tímov: výsledok zápasu potvrdený oboma tímami / zápisy sa nezhodujú.
export async function sendLeagueResultEmail(lang: MailLang, to: string, name: string, url: string, kind: 'ok' | 'mismatch' | 'swapped', match: string, rows: Rows) {
  await send(to, lang, (t) => ({
    subject: kind === 'ok' ? t('Výsledok potvrdený: {match}', { match }) : t('Výsledok sa nezhoduje: {match}', { match }),
    title: kind === 'ok' ? t('Výsledok je zapísaný') : t('Výsledok sa nezhoduje'),
    intro:
      kind === 'ok'
        ? t('Ahoj {name}, oba tímy zapísali rovnaký výsledok zápasu, preto sa zapísal do súťaže aj so strelcami a súpiskou.', { name })
        : kind === 'swapped'
          ? t('Ahoj {name}, výsledok, ktorý zapísal súper, je opačný ako váš. Vyzerá to, že jeden z tímov prehodil domácich a hostí. Skontrolujte zápis – výsledok sa zapíše, až keď sa budú zhodovať.', { name })
          : t('Ahoj {name}, výsledok, ktorý zapísal súper, sa nezhoduje s vaším. Skontrolujte zápis (aj to, kto bol domáci a kto hosť) – výsledok sa zapíše, až keď sa budú zhodovať.', { name }),
    button: kind === 'ok' ? t('Pozrieť výsledok') : t('Skontrolovať zápis'),
    url,
    outro: t('Toto je automatická správa zo súťaže tímov I-SPORT COMPLEX.'),
    rows: rows(t),
  }));
}
