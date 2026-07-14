import { useRef } from 'react';
import { CANVAS_FORMATS } from '../lib/formats.js';
import { TOOLS } from '../lib/tools.js';
import { useI18n } from '../i18n/useI18n.js';

export function ToolsPanel({
  format, onSetFormat,
  tool, onSetTool,
  shapeFilled, onSetShapeFilled,
  canUndo, canRedo, onUndo, onRedo,
  gridOn, onToggleGrid,
  onImportFile, onClearCanvas,
}) {
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const shapeToolActive = tool === 'rect' || tool === 'circle';

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) onImportFile(file);
  }

  return (
    <aside className="tools" aria-label={t('panel.toolsAriaLabel')}>
      <div>
        <p className="group-label">{t('format.groupLabel')}</p>
        <div className="format-grid">
          {CANVAS_FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="tool format-btn"
              aria-pressed={format.cw === f.w && format.ch === f.h}
              title={t(`format.${f.key}.title`)}
              onClick={() => onSetFormat(f.w, f.h)}
            >
              <span>{t(`format.${f.key}.label`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divider"></div>

      <div>
        <p className="group-label">{t('tool.groupLabel')}</p>
        <div className="tool-grid">
          {TOOLS.map(({ name, shortcut, Icon }) => (
            <button
              key={name}
              type="button"
              className="tool"
              aria-pressed={tool === name}
              title={`${t(`tool.${name}.label`)} (${shortcut})`}
              onClick={() => onSetTool(name)}
            >
              <Icon />
              <span>{t(`tool.${name}.label`)}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="check-row" style={{ opacity: shapeToolActive ? 1 : 0.5 }}>
        <input
          type="checkbox"
          checked={shapeFilled}
          onChange={(e) => onSetShapeFilled(e.target.checked)}
        />
        {t('shapeFilled.label')}
      </label>

      <div className="divider"></div>

      <div>
        <p className="group-label">{t('history.groupLabel')}</p>
        <div className="row-actions">
          <button type="button" className="btn" disabled={!canUndo} onClick={onUndo} title={t('history.undo.title')}>
            {t('history.undo.label')}
          </button>
          <button type="button" className="btn" disabled={!canRedo} onClick={onRedo} title={t('history.redo.title')}>
            {t('history.redo.label')}
          </button>
        </div>
      </div>

      <label className="check-row">
        <input type="checkbox" checked={gridOn} onChange={(e) => onToggleGrid(e.target.checked)} />
        {t('grid.label')}
      </label>

      <div className="divider"></div>

      <div>
        <p className="group-label">{t('canvas.groupLabel')}</p>
        <div className="row-actions">
          <button type="button" className="btn" title={t('canvas.import.title')} onClick={() => fileInputRef.current.click()}>
            {t('canvas.import.label')}
          </button>
        </div>
        <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleFileChange} />
      </div>

      <div className="divider"></div>

      <button type="button" className="btn btn-danger" onClick={onClearCanvas}>{t('canvas.clear')}</button>
    </aside>
  );
}
