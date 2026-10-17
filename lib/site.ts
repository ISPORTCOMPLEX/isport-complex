// Všetky údaje o firme a hale na jednom mieste.
// Prázdny reťazec alebo null = na webe sa zobrazí „Doplníme“.
// Ceny a otváracie hodiny sa vo fáze 5 presunú do administrácie.

type Prices = { offPeak: number | null; peak: number | null; weekend: number | null };

export type Site = {
  brand: string;
  brandSub: string;
  hallName: string;
  tagline: string;
  company: { name: string; street: string; city: string; ico: string; dic: string; icDph: string; register: string };
  hall: { street: string; city: string; mapUrl: string };
  phone: string;
  email: string;
  social: { facebook: string; instagram: string };
  hours: { days: string; time: string }[];
  prices: { full: Prices; half: Prices };
  peakFrom: string;
  cancelFreeHours: number;
  // Ľad sa dá rezervovať od – do (celé hodiny). Uprav podľa skutočnosti.
  iceHours: { from: number; to: number };
};

export const site: Site = {
  brand: 'I-SPORT',
  brandSub: 'COMPLEX',
  hallName: 'Hokejová hala',
  tagline: 'Tréningová hokejová hala v Košiciach',

  company: {
    name: 'I - SPORT COMPLEX s.r.o.',
    street: 'Fejova 1527/2',
    city: '040 01 Košice – mestská časť Juh',
    ico: '',
    dic: '',
    icDph: '',
    register: '',
  },

  hall: {
    street: '',
    city: 'Košice',
    mapUrl: '',
  },

  phone: '',
  email: '',

  social: {
    facebook: '',
    instagram: '',
  },

  hours: [
    { days: 'Pondelok – Piatok', time: '' },
    { days: 'Sobota', time: '' },
    { days: 'Nedeľa', time: '' },
  ],

  // Ceny v eurách s DPH za 60 minút. null = „Doplníme“.
  prices: {
    full: { offPeak: null, peak: null, weekend: null },
    half: { offPeak: null, peak: null, weekend: null },
  },
  peakFrom: '15:00',
  cancelFreeHours: 48,
  iceHours: { from: 6, to: 23 },
};

export const TBD = 'Doplníme';

export function orTbd(value: string | null | undefined): string {
  return value && value.trim() !== '' ? value : TBD;
}

export function price(value: number | null): string {
  return value === null ? TBD : `${value.toLocaleString('sk-SK')} €`;
}

export function lowestPrice(values: (number | null)[]): string {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? `od ${Math.min(...known).toLocaleString('sk-SK')} €` : TBD;
}
