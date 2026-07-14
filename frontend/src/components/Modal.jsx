import { useEffect } from 'react';
import { useI18n } from '../i18n/useI18n.js';

export function Modal({ modal, onClose }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!modal) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, onClose]);

  if (!modal) {
    return <div className="modal-overlay" hidden><div className="modal-box" role="dialog" aria-modal="true"></div></div>;
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  let body = null;
  if (modal.kind === 'confirm') {
    body = (
      <>
        <p className="modal-text">{modal.message}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>{t('modal.cancel')}</button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => { onClose(); modal.onConfirm(); }}
          >
            {t('modal.confirmProceed')}
          </button>
        </div>
      </>
    );
  } else if (modal.kind === 'png') {
    body = (
      <>
        <p className="modal-text">{t('modal.pngReady')}</p>
        <img className="modal-preview" src={modal.dataUrl} alt={modal.filename} />
        <p className="hint">{t('modal.pngHint')}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>{t('modal.close')}</button>
          <a className="btn-primary" href={modal.dataUrl} download={modal.filename}>{t('modal.downloadFile')}</a>
        </div>
      </>
    );
  } else if (modal.kind === 'bmp') {
    const ar = modal.width / modal.height;
    const maxDim = 160;
    const previewStyle = ar >= 1
      ? { width: maxDim, height: Math.round(maxDim / ar) }
      : { height: maxDim, width: Math.round(maxDim * ar) };
    body = (
      <>
        <p className="modal-text">{t('modal.bmpReady', { width: modal.width, height: modal.height })}</p>
        <img className="modal-preview" src={modal.url} alt={modal.filename} style={previewStyle} />
        <p className="hint">{t('modal.bmpHint', { colorCount: modal.colorCount })}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>{t('modal.close')}</button>
          <a className="btn-primary" href={modal.url} download={modal.filename}>{t('modal.downloadFile')}</a>
        </div>
      </>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-box" role="dialog" aria-modal="true">{body}</div>
    </div>
  );
}
