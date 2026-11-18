import { getSite } from '@/lib/siteSettings';
import { RzBand } from '@/components/booking/RzBand';
import { getT } from '@/lib/i18n/server';

// Rozloženie právnych textov. Znenie je pracovný návrh – pred ostrým spustením ho má skontrolovať právnik.
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const t = await getT();
  const site = await getSite();
  const c = site.company;
  return (
    <>
      <RzBand crumbs={[{ href: '/', label: t('Komplex') }, { label: title }]} title={title} lead={<p>{t('Účinné od {updated}.', { updated })}</p>} />
      <section className="dk2 rz-dk">
        <div className="wrap">
          <div className="legal__in">
            {t.locale !== 'sk' ? (
              <p className="legal__lang" lang={t.locale}>
                {t('Toto je preklad. Právne záväzné je znenie v slovenskom jazyku.')}{' '}
                <a href="?lang=sk" hrefLang="sk" lang="sk" rel="nofollow">
                  Slovenská verzia
                </a>
              </p>
            ) : null}
            <p className="legal__op">
              {t('Prevádzkovateľ: {name}, {street}, {city}', { name: c.name, street: c.street, city: c.city })}
              
              {c.ico ? `, ${t('IČO')} ${c.ico}` : ''}
              {c.register ? `, ${c.register}` : ''}.{site.email || site.phone ? t(' Kontakt: {join}.', { join: [site.email, site.phone].filter(Boolean).join(', ') }) : ''}
            </p>
            <div className="legal__body">{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}
