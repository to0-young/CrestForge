import { SunIcon, MoonIcon } from './icons.jsx';
import { useI18n } from '../i18n/useI18n.js';
import { HelpPanel } from './HelpPanel.jsx';

const LANG_LABELS = { uk: 'UA', ru: 'RU', en: 'EN' };

export function Header({ theme, onToggleTheme }) {
  const { lang, setLang, t } = useI18n();
  const isDark = theme === 'dark';

  return (
    <header className="topbar">
      <div className="mark" aria-hidden="true"></div>
      <div className="brandtext">
        <h1>{t('brand.title')}</h1>
        <p>{t('brand.subtitle')}</p>
      </div>

      <div className="topbar-controls">
        <HelpPanel />

        <div className="lang-switch" role="group">
          {Object.keys(LANG_LABELS).map((code) => (
            <button
              key={code}
              type="button"
              className="lang-btn"
              aria-pressed={lang === code}
              title={t(`lang.${code}`)}
              onClick={() => setLang(code)}
            >
              {LANG_LABELS[code]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="theme-toggle"
          aria-pressed={isDark}
          title={isDark ? t('theme.toLight') : t('theme.toDark')}
          onClick={onToggleTheme}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </header>
  );
}
