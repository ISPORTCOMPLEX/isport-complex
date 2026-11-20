// Súpiska z formulára (registrácia tímu, úprava v Môj tím) – kontrola údajov hráča. Čisté funkcie.

export type RosterInput = { id?: string; name: string; number: number | null; position: string; birthYear: number; heightCm: number; weightKg: number; shoots: string; photo: string };

const POS = ['F', 'D', 'G'];
const int = (v: string) => (/^\d{1,4}$/.test(v.trim()) ? Number(v.trim()) : NaN);

export function checkPlayer(p: RosterInput, year = new Date().getFullYear()): string | null {
  if (p.name.length < 2) return 'doplň meno a priezvisko';
  if (p.number !== null && (!Number.isInteger(p.number) || p.number < 0 || p.number > 99)) return 'číslo dresu musí byť 0 – 99';
  if (!POS.includes(p.position)) return 'vyber post';
  if (!Number.isInteger(p.birthYear) || p.birthYear < year - 80 || p.birthYear > year - 4) return 'doplň rok narodenia';
  if (!Number.isInteger(p.heightCm) || p.heightCm < 100 || p.heightCm > 230) return 'doplň výšku v cm (100 – 230)';
  if (!Number.isInteger(p.weightKg) || p.weightKg < 20 || p.weightKg > 160) return 'doplň váhu v kg (20 – 160)';
  if (p.shoots !== 'L' && p.shoots !== 'R') return 'vyber, či je ľavák alebo pravák';
  return null;
}

// Zoznamy polí z formulára → hráči (prázdne riadky bez mena aj údajov sa ignorujú)
export function rosterFrom(get: (k: string) => string[]): RosterInput[] {
  const names = get('playerName');
  const col = (k: string) => get(k);
  const [num, pos, yr, h, w, sh, ph, ids] = ['playerNumber', 'playerPos', 'playerYear', 'playerHeight', 'playerWeight', 'playerShoots', 'playerPhoto', 'playerId'].map(col);
  return names
    .map((raw, i) => ({
      id: /^[a-z0-9]{10,40}$/i.test(ids[i] ?? '') ? ids[i] : undefined,
      name: raw.replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80),
      number: (num[i] ?? '').trim() === '' ? null : int(num[i] ?? ''),
      position: pos[i] ?? 'F',
      birthYear: int(yr[i] ?? ''),
      heightCm: int(h[i] ?? ''),
      weightKg: int(w[i] ?? ''),
      shoots: sh[i] ?? '',
      photo: ph[i] ?? '',
      blank: !raw.trim() && !(yr[i] ?? '').trim() && !(h[i] ?? '').trim() && !(w[i] ?? '').trim() && !(ph[i] ?? '').trim(),
    }))
    .filter((p) => !p.blank)
    .map(({ blank: _b, ...p }) => p);
}

// vek k dnešku z roku narodenia (približne – presný dátum nežiadame)
export const ageFrom = (birthYear: number | null, year = new Date().getFullYear()) => (birthYear ? year - birthYear : null);
