'use client';
import { useT } from '@/lib/i18n/client';

// Len pri vývoji bez Resendu: odkaz, ktorý by inak prišiel e-mailom.
export function DevLink({ href }: { href?: string }) {
  const t = useT();
  if (!href) return null;
  return (
    <div className="devlink">
      <strong>{t('Vývojový režim – e-mail sa neposiela')}</strong>
      <span>{t('Toto okno vidíš len na svojom počítači. Na ostrom webe sa odkaz pošle e-mailom.')}</span>
      <a href={href} className="link-red">
        {t('Otvoriť odkaz z e-mailu →')}
      </a>
    </div>
  );
}
