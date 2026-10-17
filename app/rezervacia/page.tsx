import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Rezervácia ľadu' };

export default function RezervaciaPage() {
  return (
    <ComingSoon
      title="Online rezervácia ľadu"
      text="Kalendár voľných hodín s platbou online spúšťame v ďalšej fáze. Uvidíš v ňom celý týždeň, vyberieš celú plochu alebo polovicu a zaplatíš kartou."
    />
  );
}
