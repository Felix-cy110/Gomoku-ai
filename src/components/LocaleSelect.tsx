import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isLocale, SUPPORTED_LOCALES } from '../i18n/locales';

export default function LocaleSelect() {
  const { t, i18n } = useTranslation();
  return (
    <label className="inline-flex shrink-0 items-center gap-2 text-[12px] text-forest">
      <Languages size={17} aria-hidden="true" />
      <select
        aria-label={t('common.language')}
        className="max-w-28 cursor-pointer rounded-md border border-line bg-surface px-2 py-1.5 font-sans text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        value={i18n.resolvedLanguage}
        onChange={(event) => {
          if (isLocale(event.target.value)) void i18n.changeLanguage(event.target.value);
        }}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale.value} value={locale.value} lang={locale.value}>
            {locale.label}
          </option>
        ))}
      </select>
    </label>
  );
}
