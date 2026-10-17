// Kontrola vstupov z formulárov. Všetko sa kontroluje na serveri.

export function str(form: FormData, name: string, max = 200): string {
  const v = form.get(name);
  return typeof v === 'string' ? v.slice(0, max).trim() : '';
}

export function raw(form: FormData, name: string, max = 200): string {
  const v = form.get(name);
  return typeof v === 'string' ? v.slice(0, max) : '';
}

export function checked(form: FormData, name: string): boolean {
  return form.get(name) === 'on';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isName(v: string): boolean {
  return v.length >= 1 && v.length <= 60 && /^[\p{L}][\p{L}\s'.-]*$/u.test(v);
}

export function normalizePhone(v: string): string {
  return v.replace(/[\s()-]/g, '');
}

export function isPhone(v: string): boolean {
  return v === '' || /^\+?[0-9]{9,15}$/.test(v);
}
