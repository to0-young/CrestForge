import { useCrestEditor } from './hooks/useCrestEditor.js';
import { useTheme } from './hooks/useTheme.js';
import { Header } from './components/Header.jsx';
import { Footer } from './components/Footer.jsx';
import { ToolsPanel } from './components/ToolsPanel.jsx';
import { CanvasStage } from './components/CanvasStage.jsx';
import { PalettePanel } from './components/PalettePanel.jsx';
import { Modal } from './components/Modal.jsx';
import { ImportCropDialog } from './components/ImportCropDialog.jsx';
import { Toast } from './components/Toast.jsx';

function App() {
  const editor = useCrestEditor();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="workshop">
        <ToolsPanel
          format={editor.format}
          onSetFormat={editor.setFormat}
          tool={editor.tool}
          onSetTool={editor.setTool}
          shapeFilled={editor.shapeFilled}
          onSetShapeFilled={editor.setShapeFilled}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          gridOn={editor.gridOn}
          onToggleGrid={editor.setGridOn}
          onImportFile={editor.importImage}
          onClearCanvas={editor.clearCanvas}
        />

        <CanvasStage
          viewRef={editor.viewRef}
          bufferRef={editor.bufferRef}
          format={editor.format}
          scale={editor.scale}
          onZoomIn={editor.zoomIn}
          onZoomOut={editor.zoomOut}
          onPointerDown={editor.handlePointerDown}
          onPointerMove={editor.handlePointerMove}
          onPointerUp={editor.handlePointerUp}
          onPointerCancel={editor.handlePointerCancel}
        />

        <PalettePanel
          activeColor={editor.activeColor}
          onSetActiveColor={editor.setActiveColor}
          format={editor.format}
          onDownloadPng={editor.downloadPng}
          bmpBgColor={editor.bmpBgColor}
          onSetBmpBgColor={editor.setBmpBgColor}
          onExportBmp={editor.exportBmp}
          onExportCombined={editor.exportCombined}
          hasContent={editor.hasContent}
        />
      </main>

      <Footer />

      {editor.modal && editor.modal.kind === 'importCrop'
        ? (
          <ImportCropDialog
            img={editor.modal.img}
            format={editor.format}
            onApply={editor.commitImport}
            onCancel={editor.closeModal}
          />
        )
        : <Modal modal={editor.modal} onClose={editor.closeModal} />}

      <Toast message={editor.toast} />
    </div>
  );
}

export default App;
