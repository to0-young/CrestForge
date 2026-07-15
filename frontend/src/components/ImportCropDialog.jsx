import { useEffect, useMemo, useRef, useState } from 'react';
import { imageToCappedRGBA, computeContainImageData, computeCropImageData, rotateRGBA90CW } from '../lib/imageImport.js';
import { useI18n } from '../i18n/useI18n.js';
import { RotateLeftIcon, RotateRightIcon } from './icons.jsx';

const PREVIEW_BOX = 320;
const MAX_UPSCALE = 8;

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

function roundedRect(rect, srcW, srcH) {
  const rx = Math.round(rect.x);
  const ry = Math.round(rect.y);
  const rx2 = Math.round(rect.x + rect.w);
  const ry2 = Math.round(rect.y + rect.h);
  const rw = Math.max(1, Math.min(rx2, srcW) - rx);
  const rh = Math.max(1, Math.min(ry2, srcH) - ry);
  return { x: clamp(rx, 0, srcW - 1), y: clamp(ry, 0, srcH - 1), w: rw, h: rh };
}

export function ImportCropDialog({ img, format, onApply, onCancel }) {
  const { t } = useI18n();
  const { cw, ch } = format;

  const [source] = useState(() => imageToCappedRGBA(img));
  const [rotationSteps, setRotationSteps] = useState(0);
  const [cropRect, setCropRect] = useState(() => ({ x: 0, y: 0, w: source.width, h: source.height }));
  const [prevRotatedDims, setPrevRotatedDims] = useState(() => ({ w: source.width, h: source.height }));
  const [useCrop, setUseCrop] = useState(true);

  const dragRef = useRef(null);
  const pendingRef = useRef(null);
  const rafRef = useRef(null);
  const stageRef = useRef(null);
  const sourceCanvasRef = useRef(null);
  const trueCanvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);

  const rotatedSource = useMemo(() => {
    let r = source;
    for (let i = 0; i < rotationSteps; i++) r = rotateRGBA90CW(r.data, r.width, r.height);
    return r;
  }, [source, rotationSteps]);

  // A rotation changes the source's dimensions, so any in-progress crop
  // selection is reset to the full (rotated) bounds rather than remapped.
  if (rotatedSource.width !== prevRotatedDims.w || rotatedSource.height !== prevRotatedDims.h) {
    setPrevRotatedDims({ w: rotatedSource.width, h: rotatedSource.height });
    setCropRect({ x: 0, y: 0, w: rotatedSource.width, h: rotatedSource.height });
  }

  useEffect(() => {
    const canvas = sourceCanvasRef.current;
    canvas.width = rotatedSource.width;
    canvas.height = rotatedSource.height;
    canvas.getContext('2d').putImageData(new ImageData(rotatedSource.data, rotatedSource.width, rotatedSource.height), 0, 0);
  }, [rotatedSource]);

  const displayScale = useMemo(() => {
    const raw = Math.min(PREVIEW_BOX / rotatedSource.width, PREVIEW_BOX / rotatedSource.height);
    return Math.min(raw, MAX_UPSCALE);
  }, [rotatedSource]);

  const minSize = Math.max(1, Math.min(8, rotatedSource.width, rotatedSource.height));

  const resultRGBA = useMemo(() => {
    if (useCrop) {
      const r = roundedRect(cropRect, rotatedSource.width, rotatedSource.height);
      return computeCropImageData(rotatedSource.data, rotatedSource.width, r.x, r.y, r.w, r.h, cw, ch);
    }
    return computeContainImageData(rotatedSource.data, rotatedSource.width, rotatedSource.height, cw, ch);
  }, [rotatedSource, useCrop, cropRect, cw, ch]);

  useEffect(() => {
    const trueCanvas = trueCanvasRef.current;
    trueCanvas.width = cw;
    trueCanvas.height = ch;
    trueCanvas.getContext('2d').putImageData(new ImageData(resultRGBA, cw, ch), 0, 0);

    const zoomCanvas = zoomCanvasRef.current;
    const zoomScale = Math.max(1, Math.floor(200 / Math.max(cw, ch)));
    zoomCanvas.width = cw * zoomScale;
    zoomCanvas.height = ch * zoomScale;
    const zctx = zoomCanvas.getContext('2d');
    zctx.imageSmoothingEnabled = false;
    zctx.drawImage(trueCanvas, 0, 0, cw, ch, 0, 0, zoomCanvas.width, zoomCanvas.height);
  }, [resultRGBA, cw, ch]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  function scheduleRectUpdate(next) {
    pendingRef.current = next;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setCropRect(pendingRef.current);
    });
  }

  function naturalPointer(evt) {
    const rect = stageRef.current.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) / displayScale,
      y: (evt.clientY - rect.top) / displayScale,
    };
  }

  function rotateLeft() {
    setRotationSteps((s) => (s + 3) % 4);
  }
  function rotateRight() {
    setRotationSteps((s) => (s + 1) % 4);
  }

  function startMove(evt) {
    if (dragRef.current) return;
    evt.currentTarget.setPointerCapture(evt.pointerId);
    dragRef.current = { mode: 'move', startClientX: evt.clientX, startClientY: evt.clientY, startRect: { ...cropRect } };
  }

  function startResize(evt, corner) {
    if (dragRef.current) return;
    evt.currentTarget.setPointerCapture(evt.pointerId);
    dragRef.current = { mode: corner, startRect: { ...cropRect } };
  }

  function onDragMove(evt) {
    const drag = dragRef.current;
    if (!drag) return;
    const srcW = rotatedSource.width, srcH = rotatedSource.height;
    const { x: x0, y: y0, w: w0, h: h0 } = drag.startRect;
    let next;
    if (drag.mode === 'move') {
      const dxNat = (evt.clientX - drag.startClientX) / displayScale;
      const dyNat = (evt.clientY - drag.startClientY) / displayScale;
      next = { x: clamp(x0 + dxNat, 0, srcW - w0), y: clamp(y0 + dyNat, 0, srcH - h0), w: w0, h: h0 };
    } else {
      const p = naturalPointer(evt);
      const x1 = x0 + w0, y1 = y0 + h0;
      if (drag.mode === 'se') {
        const w = clamp(p.x - x0, minSize, srcW - x0);
        const h = clamp(p.y - y0, minSize, srcH - y0);
        next = { x: x0, y: y0, w, h };
      } else if (drag.mode === 'nw') {
        const w = clamp(x1 - p.x, minSize, x1);
        const h = clamp(y1 - p.y, minSize, y1);
        next = { x: x1 - w, y: y1 - h, w, h };
      } else if (drag.mode === 'ne') {
        const w = clamp(p.x - x0, minSize, srcW - x0);
        const h = clamp(y1 - p.y, minSize, y1);
        next = { x: x0, y: y1 - h, w, h };
      } else {
        const w = clamp(x1 - p.x, minSize, x1);
        const h = clamp(p.y - y0, minSize, srcH - y0);
        next = { x: x1 - w, y: y0, w, h };
      }
    }
    scheduleRectUpdate(next);
  }

  function endDrag() {
    dragRef.current = null;
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onCancel();
  }

  const stageW = rotatedSource.width * displayScale;
  const stageH = rotatedSource.height * displayScale;

  return (
    <div className="crop-dialog-overlay" onClick={handleOverlayClick}>
      <div className="crop-dialog-box">
        <p className="modal-text">{t('importCrop.title')}</p>

        <div className="crop-toolbar">
          <label className="crop-toggle-row">
            <span>{t('importCrop.useCropLabel')}</span>
            <button
              type="button"
              className="toggle-switch"
              role="switch"
              aria-checked={useCrop}
              onClick={() => setUseCrop((v) => !v)}
            >
              <span className="toggle-thumb" />
            </button>
          </label>

          <div className="crop-rotate-group">
            <button type="button" className="rotate-btn" title={t('importCrop.rotateLeft')} onClick={rotateLeft}>
              <RotateLeftIcon />
              <span>90°</span>
            </button>
            <button type="button" className="rotate-btn" title={t('importCrop.rotateRight')} onClick={rotateRight}>
              <RotateRightIcon />
              <span>90°</span>
            </button>
          </div>
        </div>

        <div className="crop-dialog-panels">
          <div className="crop-panel">
            <p className="group-label">{t('importCrop.sourceLabel')}</p>

            <div className="crop-stage-outer">
              <div ref={stageRef} className="crop-stage" style={{ width: stageW, height: stageH }}>
                <canvas ref={sourceCanvasRef} style={{ width: stageW, height: stageH }} />
                <div
                  className="crop-rect"
                  style={{
                    left: cropRect.x * displayScale,
                    top: cropRect.y * displayScale,
                    width: cropRect.w * displayScale,
                    height: cropRect.h * displayScale,
                    opacity: useCrop ? 1 : 0.35,
                    pointerEvents: useCrop ? 'auto' : 'none',
                  }}
                >
                  <div
                    className="crop-body"
                    onPointerDown={startMove}
                    onPointerMove={onDragMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  />
                  {['nw', 'ne', 'sw', 'se'].map((corner) => (
                    <div
                      key={corner}
                      className={`crop-handle crop-handle-${corner}`}
                      onPointerDown={(e) => startResize(e, corner)}
                      onPointerMove={onDragMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="crop-panel">
            <p className="group-label">{t('importCrop.trueSizeLabel', { cw, ch })}</p>
            <div className="crop-preview-box">
              <canvas ref={trueCanvasRef} className="crop-preview-canvas" />
            </div>
          </div>

          <div className="crop-panel">
            <p className="group-label">{t('importCrop.resultZoomLabel', { cw, ch })}</p>
            <div className="crop-preview-box">
              <canvas ref={zoomCanvasRef} className="crop-preview-canvas" />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>{t('modal.cancel')}</button>
          <button type="button" className="btn-primary" onClick={() => onApply(resultRGBA)}>{t('importCrop.apply')}</button>
        </div>
      </div>
    </div>
  );
}
