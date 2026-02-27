import { h } from '../utils/dom.js';
import { initRenderer, getCanvasTransform } from '../rendering/CanvasRenderer.js';
import { Store } from '../core/Store.js';
import { pointInRect } from '../utils/geometry.js';
import { computeLayout } from '../layout/LayoutEngine.js';

export function createCanvasArea() {
  const canvas = h('canvas', { class: 'collage-canvas' });

  const emptyState = h('div', { class: 'canvas-empty-state' },
    h('div', { class: 'empty-icon' },
      h('svg', { width: '48', height: '48', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
        h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }),
        h('circle', { cx: '8.5', cy: '8.5', r: '1.5' }),
        h('path', { d: 'M21 15l-5-5L5 21' }),
      )
    ),
    h('p', { class: 'empty-title' }, 'Drop photos here'),
    h('p', { class: 'empty-subtitle' }, 'or click "Add Photos" to get started'),
  );

  const wrapper = h('div', { class: 'canvas-wrapper' },
    canvas,
    emptyState,
  );

  const container = h('div', { class: 'canvas-area' }, wrapper);

  // Toggle empty state visibility based on photos
  Store.subscribe((state) => {
    emptyState.style.display = state.photos.length > 0 ? 'none' : 'flex';
    canvas.style.display = state.photos.length > 0 ? 'block' : 'none';
  });

  // --- Canvas interactions ---
  let isDragging = false;
  let dragStartCell = null;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panPhotoStartX = 0;
  let panPhotoStartY = 0;

  function canvasToLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { scaleX, scaleY } = getCanvasTransform();
    return { x: x * scaleX, y: y * scaleY };
  }

  function hitTestCell(logicalX, logicalY) {
    const { cells } = Store.getState();
    for (const cell of cells) {
      if (pointInRect(logicalX, logicalY, cell.x, cell.y, cell.width, cell.height)) {
        return cell;
      }
    }
    return null;
  }

  // Hover
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging || isPanning) return;
    const { x, y } = canvasToLogical(e.clientX, e.clientY);
    const cell = hitTestCell(x, y);
    Store.set({ hoveredCellId: cell ? cell.id : null });
    canvas.style.cursor = cell && cell.photoId ? 'grab' : 'default';
  });

  canvas.addEventListener('mouseleave', () => {
    if (!isDragging && !isPanning) {
      Store.set({ hoveredCellId: null });
    }
  });

  // Click to select
  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = canvasToLogical(e.clientX, e.clientY);
    const cell = hitTestCell(x, y);

    if (cell && cell.photoId) {
      Store.set({ selectedCellId: cell.id });
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;

      const photo = Store.getState().photos.find((p) => p.id === cell.photoId);
      panPhotoStartX = photo?.cropOffsetX || 0;
      panPhotoStartY = photo?.cropOffsetY || 0;
      dragStartCell = cell;
      canvas.style.cursor = 'grabbing';
    } else {
      Store.set({ selectedCellId: null });
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning || !dragStartCell) return;

    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;

    // If dragged far enough, treat as a swap drag
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 30 && !isDragging) {
      isDragging = true;
    }

    if (!isDragging) {
      // Pan photo within cell
      const { scaleX, scaleY } = getCanvasTransform();
      const sensitivity = 0.003;
      const offsetX = Math.max(-1, Math.min(1, panPhotoStartX - dx * sensitivity * scaleX));
      const offsetY = Math.max(-1, Math.min(1, panPhotoStartY - dy * sensitivity * scaleY));

      const photos = Store.getState().photos.map((p) =>
        p.id === dragStartCell.photoId ? { ...p, cropOffsetX: offsetX, cropOffsetY: offsetY } : p
      );
      Store.set({ photos });
    } else {
      // Swap drag — highlight target cell
      const { x, y } = canvasToLogical(e.clientX, e.clientY);
      const targetCell = hitTestCell(x, y);
      Store.set({
        hoveredCellId: targetCell && targetCell.id !== dragStartCell.id ? targetCell.id : null,
      });
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (isPanning && isDragging && dragStartCell) {
      // Complete the swap
      const { x, y } = canvasToLogical(e.clientX, e.clientY);
      const targetCell = hitTestCell(x, y);
      if (targetCell && targetCell.id !== dragStartCell.id) {
        swapCellPhotos(dragStartCell.id, targetCell.id);
      }
    }

    isPanning = false;
    isDragging = false;
    dragStartCell = null;
    canvas.style.cursor = 'default';
    Store.set({ hoveredCellId: null });
  });

  // --- Touch events (mobile) ---
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = canvasToLogical(t.clientX, t.clientY);
    const cell = hitTestCell(x, y);

    if (cell && cell.photoId) {
      Store.set({ selectedCellId: cell.id });
      isPanning = true;
      panStartX = t.clientX;
      panStartY = t.clientY;
      const photo = Store.getState().photos.find((p) => p.id === cell.photoId);
      panPhotoStartX = photo?.cropOffsetX || 0;
      panPhotoStartY = photo?.cropOffsetY || 0;
      dragStartCell = cell;
    } else {
      Store.set({ selectedCellId: null });
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!isPanning || !dragStartCell || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - panStartX;
    const dy = t.clientY - panStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 30 && !isDragging) {
      isDragging = true;
    }

    if (!isDragging) {
      const { scaleX, scaleY } = getCanvasTransform();
      const sensitivity = 0.003;
      const offsetX = Math.max(-1, Math.min(1, panPhotoStartX - dx * sensitivity * scaleX));
      const offsetY = Math.max(-1, Math.min(1, panPhotoStartY - dy * sensitivity * scaleY));
      const photos = Store.getState().photos.map((p) =>
        p.id === dragStartCell.photoId ? { ...p, cropOffsetX: offsetX, cropOffsetY: offsetY } : p
      );
      Store.set({ photos });
    } else {
      const { x, y } = canvasToLogical(t.clientX, t.clientY);
      const targetCell = hitTestCell(x, y);
      Store.set({
        hoveredCellId: targetCell && targetCell.id !== dragStartCell.id ? targetCell.id : null,
      });
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (isPanning && isDragging && dragStartCell && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const { x, y } = canvasToLogical(t.clientX, t.clientY);
      const targetCell = hitTestCell(x, y);
      if (targetCell && targetCell.id !== dragStartCell.id) {
        swapCellPhotos(dragStartCell.id, targetCell.id);
      }
    }
    isPanning = false;
    isDragging = false;
    dragStartCell = null;
    Store.set({ hoveredCellId: null });
  }, { passive: false });

  // Scroll to zoom within cell
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { x, y } = canvasToLogical(e.clientX, e.clientY);
    const cell = hitTestCell(x, y);
    if (!cell || !cell.photoId) return;

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const photos = Store.getState().photos.map((p) => {
      if (p.id === cell.photoId) {
        const newZoom = Math.max(1, Math.min(5, (p.cropZoom || 1) + delta));
        return { ...p, cropZoom: newZoom };
      }
      return p;
    });
    Store.set({ photos });
  }, { passive: false });

  // Delete selected photo
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Don't delete if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const { selectedCellId, cells, photos } = Store.getState();
      if (!selectedCellId) return;

      const cell = cells.find((c) => c.id === selectedCellId);
      if (!cell || !cell.photoId) return;

      const newPhotos = photos.filter((p) => p.id !== cell.photoId);
      Store.set({ photos: newPhotos, selectedCellId: null });
      const newCells = computeLayout({ ...Store.getState(), photos: newPhotos });
      Store.set({ cells: newCells });
    }
  });

  // Initialize renderer after DOM insertion
  requestAnimationFrame(() => {
    initRenderer(canvas);
  });

  return { container, canvas };
}

function swapCellPhotos(cellIdA, cellIdB) {
  const state = Store.getState();
  const cells = state.cells.map((c) => {
    if (c.id === cellIdA) {
      const other = state.cells.find((o) => o.id === cellIdB);
      return { ...c, photoId: other.photoId };
    }
    if (c.id === cellIdB) {
      const other = state.cells.find((o) => o.id === cellIdA);
      return { ...c, photoId: other.photoId };
    }
    return c;
  });
  Store.set({ cells });
}
