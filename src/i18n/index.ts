import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import { DEFAULT_LOCALE, Locale } from './locales';

// 资源随客户端打包；不探测浏览器语言、不读写存储，刷新后恢复默认语言。
void i18n.use(initReactI18next).init({
  resources: { [Locale.ZH_CN]: { translation: zhCN }, [Locale.EN]: { translation: en } },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: Object.values(Locale),
  interpolation: { escapeValue: false },
  initAsync: false,
});

export default i18n;
