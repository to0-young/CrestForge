import { useEffect, useState } from 'react';
import { I18nContext } from './context.js';
import { LANGS, translations } from './translations.js';

const STORAGE_KEY = 'crestforge-lang';

function getInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (LANGS.includes(stored)) return stored;
  return 'uk';
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    document.title = translations[lang]['brand.title'];
  }, [lang]);

  function t(key, params) {
    const entry = translations[lang][key] ?? translations.uk[key] ?? key;
    return typeof entry === 'function' ? entry(params) : entry;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
