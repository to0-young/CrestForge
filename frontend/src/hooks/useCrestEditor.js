import { useCallback, useEffect, useRef, useState } from 'react';
import { hexToRgb } from '../lib/color.js';
import { linePixels, rectPixels, circlePixels } from '../lib/shapes.js';
import { floodFill } from '../lib/floodFill.js';
import { loadImageFile, fitDimensions, boxDownscaleRGBA } from '../lib/imageImport.js';
import { exportCrestBmp } from '../lib/bmpExport.js';
import { useI18n } from '../i18n/useI18n.js';

const MAX_HISTORY = 60;

export function useCrestEditor() {
  const { t } = useI18n();
  const viewRef = useRef(null);
  const bufferRef = useRef(null);

  const [format, setFormatValue] = useState({ cw: 32, ch: 32 });
  const [tool, setTool] = useState('pencil');
  const [shapeFilled, setShapeFilled] = useState(false);
  const [activeColor, setActiveColor] = useState('#101014');
  const [gridOn, setGridOn] = useState(true);
  const [scale, setScale] = useState(16);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [bmpBgColor, setBmpBgColor] = useState('#ffffff');
  const [modal, setModal] = useState(null);

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const drawingRef = useRef(false);
  const startRef = useRef([0, 0]);

  const getBctx = useCallback(() => bufferRef.current.getContext('2d'), []);
  const getVctx = useCallback(() => viewRef.current.getContext('2d'), []);

  const syncHistoryButtons = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const drawGrid = useCallback((vctx, cw, ch) => {
    vctx.strokeStyle = 'rgba(128,120,100,.35)';
    vctx.lineWidth = 1;
    for (let i = 0; i <= cw; i++) {
      const p = i * scale + 0.5;
      const major = i % 8 === 0;
      vctx.globalAlpha = major ? 0.9 : 0.35;
      vctx.beginPath();
      vctx.moveTo(p, 0); vctx.lineTo(p, ch * scale);
      vctx.stroke();
    }
    for (let i = 0; i <= ch; i++) {
      const p = i * scale + 0.5;
      const major = i % 8 === 0;
      vctx.globalAlpha = major ? 0.9 : 0.35;
      vctx.beginPath();
      vctx.moveTo(0, p); vctx.lineTo(cw * scale, p);
      vctx.stroke();
    }
    vctx.globalAlpha = 1;
  }, [scale]);

  const render = useCallback((previewPts) => {
    const view = viewRef.current, buffer = bufferRef.current;
    if (!view || !buffer) return;
    const vctx = getVctx();
    const { cw, ch } = format;
    vctx.imageSmoothingEnabled = false;
    vctx.clearRect(0, 0, view.width, view.height);
    vctx.drawImage(buffer, 0, 0, cw, ch, 0, 0, view.width, view.height);
    if (previewPts && previewPts.length) {
      vctx.fillStyle = activeColor;
      for (const [px, py] of previewPts) {
        vctx.fillRect(px * scale, py * scale, scale, scale);
      }
    }
    if (gridOn) drawGrid(vctx, cw, ch);
  }, [format, scale, gridOn, activeColor, drawGrid, getVctx]);

  // Redraw whenever anything render() depends on changes, including right after
  // format/scale changes have resized (and thus cleared) the canvas elements.
  useEffect(() => {
    render();
  }, [render]);

  const coordsFromEvent = useCallback((evt) => {
    const rect = viewRef.current.getBoundingClientRect();
    const { cw, ch } = format;
    const x = Math.floor((evt.clientX - rect.left) / (rect.width / cw));
    const y = Math.floor((evt.clientY - rect.top) / (rect.height / ch));
    return [Math.max(0, Math.min(cw - 1, x)), Math.max(0, Math.min(ch - 1, y))];
  }, [format]);

  const paintPixel = useCallback((x, y, erase) => {
    const { cw, ch } = format;
    if (x < 0 || y < 0 || x >= cw || y >= ch) return;
    const bctx = getBctx();
    if (erase) bctx.clearRect(x, y, 1, 1);
    else { bctx.fillStyle = activeColor; bctx.fillRect(x, y, 1, 1); }
  }, [format, activeColor, getBctx]);

  const snapshot = useCallback(() => {
    const { cw, ch } = format;
    return getBctx().getImageData(0, 0, cw, ch);
  }, [format, getBctx]);

  const pushUndo = useCallback(() => {
    undoStackRef.current.push(snapshot());
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    redoStackRef.current.length = 0;
    syncHistoryButtons();
  }, [snapshot, syncHistoryButtons]);

  const undo = useCallback(() => {
    if (!undoStackRef.current.length) return;
    redoStackRef.current.push(snapshot());
    getBctx().putImageData(undoStackRef.current.pop(), 0, 0);
    syncHistoryButtons();
    render();
  }, [snapshot, getBctx, syncHistoryButtons, render]);

  const redo = useCallback(() => {
    if (!redoStackRef.current.length) return;
    undoStackRef.current.push(snapshot());
    getBctx().putImageData(redoStackRef.current.pop(), 0, 0);
    syncHistoryButtons();
    render();
  }, [snapshot, getBctx, syncHistoryButtons, render]);

  const bufferHasContent = useCallback(() => {
    const { cw, ch } = format;
    const d = getBctx().getImageData(0, 0, cw, ch).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
    return false;
  }, [format, getBctx]);

  const applyFormatChange = useCallback((w, h) => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setFormatValue({ cw: w, ch: h });
  }, []);

  const setFormat = useCallback((w, h) => {
    if (w === format.cw && h === format.ch) return;
    if (bufferHasContent()) {
      setModal({
        kind: 'confirm',
        message: t('modal.confirmFormat'),
        onConfirm: () => applyFormatChange(w, h),
      });
    } else {
      applyFormatChange(w, h);
    }
  }, [format, bufferHasContent, applyFormatChange, t]);

  const clearCanvas = useCallback(() => {
    setModal({
      kind: 'confirm',
      message: t('modal.confirmClear'),
      onConfirm: () => {
        pushUndo();
        const { cw, ch } = format;
        getBctx().clearRect(0, 0, cw, ch);
        render();
      },
    });
  }, [pushUndo, format, getBctx, render, t]);

  const zoomIn = useCallback(() => setScale((s) => Math.min(32, s + 4)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(6, s - 4)), []);

  const handlePointerDown = useCallback((evt) => {
    viewRef.current.setPointerCapture(evt.pointerId);
    const [x, y] = coordsFromEvent(evt);
    startRef.current = [x, y];
    drawingRef.current = true;

    if (tool === 'dropper') {
      const d = getBctx().getImageData(x, y, 1, 1).data;
      if (d[3] > 0) {
        const hex = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        setActiveColor(hex);
      }
      drawingRef.current = false;
      return;
    }

    pushUndo();

    if (tool === 'pencil') { paintPixel(x, y, false); render(); }
    else if (tool === 'eraser') { paintPixel(x, y, true); render(); }
    else if (tool === 'fill') {
      const { cw, ch } = format;
      const bctx = getBctx();
      const img = bctx.getImageData(0, 0, cw, ch);
      floodFill(img, x, y, cw, ch, hexToRgb(activeColor));
      bctx.putImageData(img, 0, 0);
      render();
      drawingRef.current = false;
    } else {
      render();
    }
  }, [coordsFromEvent, tool, getBctx, pushUndo, paintPixel, render, format, activeColor]);

  const handlePointerMove = useCallback((evt) => {
    const [x, y] = coordsFromEvent(evt);
    const d = getBctx().getImageData(x, y, 1, 1).data;
    const hex = d[3] > 0
      ? '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')
      : null;

    if (drawingRef.current) {
      const [sx, sy] = startRef.current;
      if (tool === 'pencil') { paintPixel(x, y, false); render(); }
      else if (tool === 'eraser') { paintPixel(x, y, true); render(); }
      else if (tool === 'line') { render(linePixels(sx, sy, x, y)); }
      else if (tool === 'rect') { render(rectPixels(sx, sy, x, y, shapeFilled)); }
      else if (tool === 'circle') { render(circlePixels(sx, sy, x, y, shapeFilled)); }
    }

    return { x, y, hex };
  }, [coordsFromEvent, getBctx, tool, paintPixel, render, shapeFilled]);

  const finishStroke = useCallback((evt) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const [x, y] = coordsFromEvent(evt);
    const [sx, sy] = startRef.current;
    let pts = null;
    if (tool === 'line') pts = linePixels(sx, sy, x, y);
    else if (tool === 'rect') pts = rectPixels(sx, sy, x, y, shapeFilled);
    else if (tool === 'circle') pts = circlePixels(sx, sy, x, y, shapeFilled);
    if (pts) {
      const bctx = getBctx();
      bctx.fillStyle = activeColor;
      pts.forEach(([px, py]) => bctx.fillRect(px, py, 1, 1));
    }
    render();
  }, [coordsFromEvent, tool, shapeFilled, getBctx, activeColor, render]);

  const importImageIntoBuffer = useCallback((img) => {
    const { cw, ch } = format;
    const srcW = img.naturalWidth || img.width, srcH = img.naturalHeight || img.height;
    const tmp = document.createElement('canvas');
    const CAP = 1024;
    if (Math.max(srcW, srcH) > CAP) {
      const s = CAP / Math.max(srcW, srcH);
      tmp.width = Math.round(srcW * s); tmp.height = Math.round(srcH * s);
    } else { tmp.width = srcW; tmp.height = srcH; }
    const tctx = tmp.getContext('2d');
    tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
    const srcData = tctx.getImageData(0, 0, tmp.width, tmp.height).data;

    const [destW, destH] = fitDimensions(tmp.width, tmp.height, cw, ch);
    const block = boxDownscaleRGBA(srcData, tmp.width, tmp.height, destW, destH);

    pushUndo();
    const bctx = getBctx();
    const full = bctx.createImageData(cw, ch);
    const offX = Math.floor((cw - destW) / 2), offY = Math.floor((ch - destH) / 2);
    for (let y = 0; y < destH; y++) {
      for (let x = 0; x < destW; x++) {
        const si = (y * destW + x) * 4, di = ((y + offY) * cw + (x + offX)) * 4;
        full.data[di] = block[si]; full.data[di + 1] = block[si + 1];
        full.data[di + 2] = block[si + 2]; full.data[di + 3] = block[si + 3];
      }
    }
    bctx.clearRect(0, 0, cw, ch);
    bctx.putImageData(full, 0, 0);
    render();
  }, [format, pushUndo, getBctx, render]);

  const importImage = useCallback((file) => {
    loadImageFile(file, importImageIntoBuffer);
  }, [importImageIntoBuffer]);

  const downloadPng = useCallback(() => {
    const dataUrl = bufferRef.current.toDataURL('image/png');
    const { cw, ch } = format;
    setModal({ kind: 'png', dataUrl, filename: `crest-${cw}x${ch}.png` });
  }, [format]);

  const exportBmp = useCallback((destW, destH, filename) => {
    const { cw, ch } = format;
    const imageData = getBctx().getImageData(0, 0, cw, ch);
    const bgRgb = hexToRgb(bmpBgColor);
    const result = exportCrestBmp(imageData, cw, ch, destW, destH, bgRgb);
    const url = URL.createObjectURL(result.blob);
    setModal({ kind: 'bmp', url, filename, width: result.width, height: result.height, colorCount: result.colorCount });
  }, [format, getBctx, bmpBgColor]);

  const closeModal = useCallback(() => {
    setModal((m) => {
      if (m && m.kind === 'bmp' && m.url) URL.revokeObjectURL(m.url);
      return null;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        else if (k === 'y') { e.preventDefault(); redo(); }
        return;
      }
      const map = { p: 'pencil', e: 'eraser', f: 'fill', i: 'dropper', l: 'line', r: 'rect', c: 'circle' };
      if (map[k]) setTool(map[k]);
      else if (k === 'g') setGridOn((g) => !g);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return {
    viewRef, bufferRef,
    format, setFormat,
    tool, setTool,
    shapeFilled, setShapeFilled,
    activeColor, setActiveColor,
    gridOn, setGridOn,
    scale, zoomIn, zoomOut,
    canUndo, canRedo, undo, redo, clearCanvas,
    handlePointerDown, handlePointerMove,
    handlePointerUp: finishStroke, handlePointerCancel: finishStroke,
    importImage,
    downloadPng, exportBmp,
    bmpBgColor, setBmpBgColor,
    modal, closeModal,
  };
}
