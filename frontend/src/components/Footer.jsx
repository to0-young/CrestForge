import { useI18n } from '../i18n/useI18n.js';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="hints">
      <span><kbd>P</kbd> {t('footer.pencil')}</span>
      <span><kbd>E</kbd> {t('footer.eraser')}</span>
      <span><kbd>F</kbd> {t('footer.fill')}</span>
      <span><kbd>I</kbd> {t('footer.dropper')}</span>
      <span><kbd>L</kbd> {t('footer.line')}</span>
      <span><kbd>R</kbd> {t('footer.rect')}</span>
      <span><kbd>C</kbd> {t('footer.circle')}</span>
      <span><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> {t('footer.history')}</span>
      <span><kbd>G</kbd> {t('footer.grid')}</span>
    </footer>
  );
}
