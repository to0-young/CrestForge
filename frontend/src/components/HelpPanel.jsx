import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n.js';

export function HelpPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="help-widget" ref={containerRef}>
      <button
        type="button"
        className="help-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t('help.toggleLabel')}
      </button>

      {open && (
        <div className="help-dropdown">
          <h2>{t('help.title')}</h2>
          <p className="hint">{t('help.description')}</p>

          <h3>{t('help.requirementsTitle')}</h3>
          <ul className="help-list">
            <li><b>{t('help.reqClanLabel')}</b> {t('help.reqClanText')}</li>
            <li><b>{t('help.reqAllianceLabel')}</b> {t('help.reqAllianceText')}</li>
            <li><b>{t('help.reqCombinedLabel')}</b> {t('help.reqCombinedText')}</li>
          </ul>

          <h3>{t('help.faqTitle')}</h3>
          <div className="help-faq-item">
            <p className="help-faq-q">{t('help.faq1Q')}</p>
            <p className="hint">{t('help.faq1A')}</p>
          </div>
          <div className="help-faq-item">
            <p className="help-faq-q">{t('help.faq2Q')}</p>
            <p className="hint">{t('help.faq2A')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
