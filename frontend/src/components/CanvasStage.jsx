import { useState } from 'react';
import { useI18n } from '../i18n/useI18n.js';

export function CanvasStage({
  viewRef, bufferRef, format, scale, onZoomIn, onZoomOut,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
}) {
  const { t } = useI18n();
  const [readout, setReadout] = useState(null);

  function handlePointerMove(evt) {
    setReadout(onPointerMove(evt));
  }

  return (
    <section className="canvas-stage">
      <div className="zoom-row">
        <button type="button" className="zoom-btn" aria-label={t('zoom.decrease')} onClick={onZoomOut}>–</button>
        <span className="zoom-value">{scale}px</span>
        <button type="button" className="zoom-btn" aria-label={t('zoom.increase')} onClick={onZoomIn}>+</button>
      </div>
      <div className="canvas-wrap" style={{ backgroundSize: `${scale * 2}px ${scale * 2}px` }}>
        <canvas
          ref={viewRef}
          width={format.cw * scale}
          height={format.ch * scale}
          onPointerDown={onPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={() => setReadout(null)}
        />
      </div>
      <canvas ref={bufferRef} width={format.cw} height={format.ch} style={{ display: 'none' }} />
      <p className="readout">
        <span>{t('readout.x')} <b>{readout ? readout.x : '–'}</b></span>
        <span>{t('readout.y')} <b>{readout ? readout.y : '–'}</b></span>
        <span>{t('readout.color')} <b>{readout && readout.hex ? readout.hex : '–'}</b></span>
      </p>
    </section>
  );
}
