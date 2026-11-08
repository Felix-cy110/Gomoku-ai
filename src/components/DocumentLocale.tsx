import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE } from '../i18n/locales';

export default function DocumentLocale() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? DEFAULT_LOCALE;
    document.title = t('meta.title');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('meta.description'));
  }, [t, i18n.resolvedLanguage]);
  return null;
}
