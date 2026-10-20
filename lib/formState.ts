// Spoločný tvar odpovede serverových akcií pre formuláre (useActionState).
export type CaptchaData = { image: string; token: string };

export type FormState = {
  error?: string;
  errors?: Record<string, string>;
  success?: string;
  values?: Record<string, string>;
  captcha?: CaptchaData;
  done?: boolean;
  unverifiedEmail?: string;
  qr?: string;
  secret?: string;
  backupCodes?: string[];
  devLink?: string;
  manual?: boolean;
};

export const EMPTY: FormState = {};
