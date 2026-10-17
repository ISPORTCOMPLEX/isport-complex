// Správa účtov z príkazového riadku (len pre majiteľa, beží lokálne nad databázou z .env).
//
//   node --env-file=.env scripts/ucet.mjs admin             vytvorí administrátora (alebo povýši existujúci účet)
//   node --env-file=.env scripts/ucet.mjs overit EMAIL      označí e-mail ako overený
//   node --env-file=.env scripts/ucet.mjs odomknut EMAIL    zruší zámok po neúspešných prihláseniach
//   node --env-file=.env scripts/ucet.mjs rola EMAIL ROLA   CUSTOMER | CLUB_MANAGER | RECEPTION | ACCOUNTANT | ADMIN
//   node --env-file=.env scripts/ucet.mjs zoznam            vypíše posledných 50 účtov

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'node:readline';

const prisma = new PrismaClient();
const ROLES = ['CUSTOMER', 'CLUB_MANAGER', 'RECEPTION', 'ACCOUNTANT', 'ADMIN'];

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

// Heslo sa pri písaní nezobrazuje.
function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch) => {
      if (ch === '\u0003') { process.stdout.write('\n'); process.exit(1); }
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (ch === '\u0008' || ch === '\u007f') { value = value.slice(0, -1); return; }
      value += ch;
    };
    stdin.on('data', onData);
  });
}

function passwordProblem(pw) {
  if (pw.length < 8) return 'Heslo musí mať aspoň 8 znakov.';
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Heslo je príliš dlhé.';
  if (!/[a-z]/.test(pw)) return 'Heslo musí obsahovať malé písmeno.';
  if (!/[A-Z]/.test(pw)) return 'Heslo musí obsahovať veľké písmeno.';
  if (!/[0-9]/.test(pw)) return 'Heslo musí obsahovať číslicu.';
  return null;
}

const normalize = (e) => String(e ?? '').trim().toLowerCase();

async function findUser(email) {
  const user = await prisma.user.findUnique({ where: { email: normalize(email) } });
  if (!user) throw new Error(`Účet ${normalize(email)} neexistuje.`);
  return user;
}

async function admin() {
  const email = normalize(await ask('E-mail administrátora: '));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Neplatný e-mail.');
  const existing = await prisma.user.findUnique({ where: { email } });
  const now = new Date();

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN', emailVerifiedAt: existing.emailVerifiedAt ?? now, failedLoginCount: 0, lockedUntil: null, bannedAt: null },
    });
    console.log(`\nHotovo: existujúci účet ${email} je teraz ADMINISTRÁTOR a má overený e-mail. Heslo ostalo pôvodné.`);
    return;
  }

  const firstName = await ask('Meno: ');
  const lastName = await ask('Priezvisko: ');
  if (!firstName || !lastName) throw new Error('Meno a priezvisko sú povinné.');
  const pw = await askHidden('Heslo (nezobrazuje sa): ');
  const problem = passwordProblem(pw);
  if (problem) throw new Error(problem);
  const pw2 = await askHidden('Heslo znova: ');
  if (pw !== pw2) throw new Error('Heslá sa nezhodujú.');

  await prisma.user.create({
    data: {
      email, firstName, lastName, role: 'ADMIN',
      passwordHash: await bcrypt.hash(pw, 10),
      emailVerifiedAt: now, termsAcceptedAt: now, ageConfirmedAt: now,
    },
  });
  console.log(`\nHotovo: administrátor ${email} je vytvorený a môže sa prihlásiť na /prihlasenie.`);
  console.log('Odporúčanie: hneď po prihlásení si v Môj účet → Zabezpečenie zapni dvojstupňové overenie.');
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (!process.env.DATABASE_URL) throw new Error('Chýba DATABASE_URL – spusti príkaz s --env-file=.env v priečinku projektu.');

  switch (cmd) {
    case 'admin':
      await admin();
      break;
    case 'overit': {
      const u = await findUser(a);
      await prisma.user.update({ where: { id: u.id }, data: { emailVerifiedAt: u.emailVerifiedAt ?? new Date() } });
      console.log(`Hotovo: e-mail ${u.email} je overený.`);
      break;
    }
    case 'odomknut': {
      const u = await findUser(a);
      await prisma.user.update({ where: { id: u.id }, data: { failedLoginCount: 0, lockedUntil: null } });
      await prisma.rateLimit.deleteMany({ where: { key: { startsWith: 'login:' } } });
      console.log(`Hotovo: účet ${u.email} je odomknutý a limity prihlásenia vynulované.`);
      break;
    }
    case 'rola': {
      const role = String(b ?? '').toUpperCase();
      if (!ROLES.includes(role)) throw new Error(`Rola musí byť jedna z: ${ROLES.join(', ')}`);
      const u = await findUser(a);
      await prisma.user.update({ where: { id: u.id }, data: { role } });
      console.log(`Hotovo: ${u.email} má rolu ${role}.`);
      break;
    }
    case 'zoznam': {
      const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      console.table(users.map((u) => ({
        email: u.email, meno: `${u.firstName} ${u.lastName}`, rola: u.role,
        overeny: u.emailVerifiedAt ? 'áno' : 'NIE', '2FA': u.twoFactorEnabledAt ? 'áno' : 'nie',
        zamknuty: u.lockedUntil && u.lockedUntil > new Date() ? 'ÁNO' : '', zmazany: u.deletedAt ? 'áno' : '',
      })));
      break;
    }
    default:
      console.log('Príkazy: admin | overit EMAIL | odomknut EMAIL | rola EMAIL ROLA | zoznam');
  }
}

main()
  .catch((e) => { console.error(`\nChyba: ${e.message}`); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
