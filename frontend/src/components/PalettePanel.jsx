import { useState } from 'react';
import { PALETTE } from '../lib/palette.js';
import { isValidHex6, normalizeHex } from '../lib/color.js';
import { DownloadIcon } from './icons.jsx';
import { useI18n } from '../i18n/useI18n.js';

function HexInput({ activeColor, onSetActiveColor }) {
  const [value, setValue] = useState(activeColor);
  const [prevActiveColor, setPrevActiveColor] = useState(activeColor);

  if (activeColor !== prevActiveColor) {
    setPrevActiveColor(activeColor);
    setValue(activeColor);
  }

  function commit() {
    if (!isValidHex6(value)) { setValue(activeColor); return; }
    onSetActiveColor(normalizeHex(value));
  }

  return (
    <input
      type="text"
      maxLength={7}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

export function PalettePanel({
  activeColor, onSetActiveColor,
  format, onDownloadPng,
  bmpBgColor, onSetBmpBgColor,
  onExportBmp,
}) {
  const { t } = useI18n();
  return (
    <aside className="palette-panel" aria-label={t('panel.paletteAriaLabel')}>
      <div>
        <p className="group-label">{t('palette.activeColor')}</p>
        <div className="active-color">
          <div className="swatch-big"><i style={{ background: activeColor }}></i></div>
          <div className="hex-field">
            <HexInput activeColor={activeColor} onSetActiveColor={onSetActiveColor} />
            <input
              type="color"
              className="native-color"
              value={activeColor}
              onChange={(e) => onSetActiveColor(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="group-label">{t('palette.groupLabel')}</p>
        <div className="swatches">
          {PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              className="swatch"
              style={{ background: hex }}
              title={hex}
              aria-pressed={activeColor === hex}
              onClick={() => onSetActiveColor(hex)}
            />
          ))}
        </div>
      </div>

      <div className="divider"></div>

      <button type="button" className="btn-primary" onClick={onDownloadPng}>
        <DownloadIcon />
        <span>{t('palette.downloadPng', { cw: format.cw, ch: format.ch })}</span>
      </button>
      <p className="hint">{t('palette.pngHint')}</p>

      <div className="divider"></div>

      <div>
        <p className="group-label">{t('palette.exportGroupLabel')}</p>
        <label className="check-row">
          {t('palette.bmpBg')}
          <input
            type="color"
            className="bmp-bg-swatch"
            value={bmpBgColor}
            onChange={(e) => onSetBmpBgColor(e.target.value)}
          />
        </label>
        <div className="row-actions">
          <button type="button" className="btn" onClick={() => onExportBmp(8, 12, 'crest-8x12.bmp')}>BMP 8×12</button>
          <button type="button" className="btn" onClick={() => onExportBmp(16, 12, 'crest-16x12.bmp')}>BMP 16×12</button>
          <button type="button" className="btn" onClick={() => onExportBmp(32, 32, 'crest-32x32.bmp')}>BMP 32×32</button>
        </div>
        <p className="hint">{t('palette.bmpHint')}</p>
      </div>
    </aside>
  );
}
