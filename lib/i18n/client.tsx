'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, type Locale } from './config';
import { makeT, type Dict, type T } from './translate';

const Ctx = createContext<{ locale: Locale; dict: Dict }>({ locale: DEFAULT_LOCALE, dict: {} });

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): T {
  const { locale, dict } = useContext(Ctx);
  return useMemo(() => makeT(locale, dict), [locale, dict]);
}
