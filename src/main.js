import './style.css';
import { Store } from './core/Store.js';
import { EventBus } from './core/EventBus.js';
import { computeLayout } from './layout/LayoutEngine.js';
import { loadImages } from './utils/imageLoader.js';
import { pushUndo, undo, redo, canUndo, canRedo } from './core/History.js';
import { createToolbar } from './ui/Toolbar.js';
import { createSidebar } from './ui/Sidebar.js';
import { createCanvasArea } from './ui/CanvasArea.js';
import { createPhotoPanel } from './ui/PhotoPanel.js';
import { createDropZone } from './ui/DropZone.js';
import { createExportDialog } from './ui/ExportDialog.js';
import { createPhotoEditor } from './ui/PhotoEditor.js';

function init() {
  const app = document.getElementById('app');
  if (!app) return;

  // Create UI components
  const { toolbar, undoBtn, redoBtn } = createToolbar();
  const { sidebar } = createSidebar();
  const { container: canvasArea } = createCanvasArea();
  const { container: photoStrip } = createPhotoPanel();
  const { overlay: dropZone } = createDropZone();
  const { overlay: exportOverlay } = createExportDialog();
  const { panel: photoEditor } = createPhotoEditor();

  // Hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Assemble layout
  const main = document.createElement('div');
  main.className = 'main-area';
  main.appendChild(sidebar);
  main.appendChild(canvasArea);

  // Sidebar scrim for mobile slide-over
  const scrim = document.createElement('div');
  scrim.className = 'sidebar-scrim';
  scrim.addEventListener('click', () => {
    sidebar.classList.remove('sidebar-visible');
    scrim.classList.remove('visible');
  });

  app.appendChild(toolbar);
  app.appendChild(main);
  app.appendChild(scrim);
  app.appendChild(photoStrip);
  app.appendChild(dropZone);
  app.appendChild(exportOverlay);
  app.appendChild(photoEditor);

  // Toggle sidebar on mobile
  EventBus.on('toggleSidebar', () => {
    sidebar.classList.toggle('sidebar-visible');
    scrim.classList.toggle('visible');
  });

  // Compute initial layout
  const cells = computeLayout(Store.getState());
  Store.set({ cells });

  // --- Event handling ---

  // Add photos via file picker
  EventBus.on('addPhotos', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length > 0) {
      await addPhotos([...fileInput.files]);
      fileInput.value = '';
    }
  });

  // Add photos via drag & drop
  EventBus.on('filesDropped', async (files) => {
    await addPhotos(files);
  });

  // Undo / Redo
  EventBus.on('undo', () => {
    undo();
    recomputeAfterRestore();
  });
  EventBus.on('redo', () => {
    redo();
    recomputeAfterRestore();
  });

  // Update undo/redo button states
  Store.subscribe(() => {
    undoBtn.disabled = !canUndo();
    redoBtn.disabled = !canRedo();
  });
  undoBtn.disabled = true;
  redoBtn.disabled = true;

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    // Don't intercept when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      recomputeAfterRestore();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
      recomputeAfterRestore();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
      recomputeAfterRestore();
    }
  });

  // Recompute layout when relevant state changes
  let prevLayoutKey = layoutKey(Store.getState());
  Store.subscribe((state) => {
    const key = layoutKey(state);
    if (key !== prevLayoutKey) {
      prevLayoutKey = key;
      const newCells = computeLayout(state);
      if (cellsChanged(newCells, state.cells)) {
        Store.set({ cells: newCells });
      }
    }
  });

  // Push undo before state changes that should be undoable
  const originalSet = Store.set.bind(Store);
  Store.set = (patch) => {
    // Only push undo for meaningful changes (not hover/selection/cells-only)
    const isTransient = Object.keys(patch).every((k) =>
      ['hoveredCellId', 'selectedCellId', 'cells'].includes(k)
    );
    if (!isTransient) {
      pushUndo();
    }
    originalSet(patch);
  };
}

async function addPhotos(files) {
  const newPhotos = await loadImages(files);
  if (newPhotos.length === 0) return;

  const state = Store.getState();
  const photos = [...state.photos, ...newPhotos];
  Store.set({ photos });

  // Recompute layout with new photos
  const cells = computeLayout({ ...Store.getState(), photos });
  Store.set({ cells });
}

function recomputeAfterRestore() {
  const state = Store.getState();
  const cells = computeLayout(state);
  // Use original set to avoid pushing another undo
  const { hoveredCellId, selectedCellId, ...rest } = state;
  Store.replaceState({ ...rest, cells, hoveredCellId: null, selectedCellId: null });
}

function layoutKey(state) {
  return [
    state.layoutType,
    state.gridTemplate,
    state.canvasWidth,
    state.canvasHeight,
    state.spacingMM,
    state.outerPaddingMM,
    state.photos.length,
    state.photos.map((p) => p.id).join(','),
  ].join('|');
}

function cellsChanged(a, b) {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y ||
        a[i].width !== b[i].width || a[i].height !== b[i].height ||
        a[i].photoId !== b[i].photoId) {
      return true;
    }
  }
  return false;
}

init();
