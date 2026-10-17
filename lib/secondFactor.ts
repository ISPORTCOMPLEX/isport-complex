import 'server-only';
import { prisma } from './prisma';
import { decrypt, sha256 } from './crypto';
import { normalizeBackupCode, verifyTotp } from './totp';

type TwoFactorUser = { id: string; twoFactorSecretEnc: string | null; twoFactorLastStep: number | null; twoFactorBackupHashes: string[] };

// Overí 6-miestny kód z aplikácie alebo jednorazový záložný kód. Spoločné pre prihlásenie aj citlivé zmeny.
export async function checkSecondFactor(user: TwoFactorUser, input: string): Promise<boolean> {
  if (!user.twoFactorSecretEnc) return false;
  const digits = input.replace(/\s/g, '');
  if (/^\d{6}$/.test(digits)) {
    let secret: string;
    try {
      secret = decrypt(user.twoFactorSecretEnc);
    } catch {
      return false;
    }
    const step = verifyTotp(secret, digits, user.twoFactorLastStep);
    if (step === null) return false;
    // Atómovo: kód sa dá použiť len raz, aj pri dvoch súbežných pokusoch.
    const r = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
      data: { twoFactorLastStep: step },
    });
    return r.count === 1;
  }
  const hash = sha256(normalizeBackupCode(input));
  if (!user.twoFactorBackupHashes.includes(hash)) return false;
  const remaining = user.twoFactorBackupHashes.filter((h) => h !== hash);
  const r = await prisma.user.updateMany({
    where: { id: user.id, twoFactorBackupHashes: { has: hash } },
    data: { twoFactorBackupHashes: remaining },
  });
  return r.count === 1;
}
