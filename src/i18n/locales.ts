export const Locale = { ZH_CN: 'zh-CN', EN: 'en' } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];
export const DEFAULT_LOCALE: Locale = Locale.ZH_CN;
export const SUPPORTED_LOCALES = [
  { value: Locale.ZH_CN, label: '简体中文' },
  { value: Locale.EN, label: 'English' },
] as const;

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale.value === value);
}
