import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Ochrana osobných údajov' };

export default function OchranaPage() {
  return <LegalPage title="Ochrana osobných údajov" />;
}
