import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Prihlásenie', robots: { index: false } };

export default function PrihlaseniePage() {
  return (
    <ComingSoon
      title="Účty pripravujeme"
      text="Prihlásenie, registrácia a správa rezervácií pribudnú v ďalšej fáze spolu s dvojstupňovým overením a ochranou účtov."
    />
  );
}
