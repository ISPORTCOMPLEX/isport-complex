'use client';

import type { CaptchaData } from '@/lib/formState';
import { useT } from '@/lib/i18n/client';

// Skryté pole pre botov + podpísaný čas načítania formulára.
export function GuardFields({ stamp }: { stamp: string }) {
  const t = useT();
  return (
    <>
      <div className="hp" aria-hidden="true">
        <label>
          {t('Web stránka')}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="form_ts" value={stamp} />
    </>
  );
}

export function CaptchaField({ captcha, error }: { captcha: CaptchaData; error?: string }) {
  const t = useT();
  return (
    <div className={`field captcha${error ? ' field--error' : ''}`}>
      <label htmlFor="captcha">{t('Opíš znaky z obrázka')}</label>
      <div className="captcha__row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={captcha.image} width={220} height={80} alt={t('Overovací obrázok s piatimi znakmi')} className="captcha__img" />
        <div className="field__box">
          <input id="captcha" name="captcha" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} required key={captcha.token} />
        </div>
      </div>
      <input type="hidden" name="captcha_token" value={captcha.token} />
      <small className="field__hint">{t('Veľké a malé písmená sa nerozlišujú. Nový obrázok dostaneš po každom pokuse.')}</small>
      {error ? <small className="field__err">{error}</small> : null}
    </div>
  );
}
