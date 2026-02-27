import { h } from '../utils/dom.js';
import { Store } from '../core/Store.js';
import { ImageCache } from '../rendering/ImageCache.js';
import { drawPhoto } from '../rendering/drawPhoto.js';
import { coverFit } from '../utils/geometry.js';

/**
 * Photo Editor panel — shown when a photo cell is selected.
 * Displays an enlarged preview with rotate, crop (pan), and resize (zoom) controls.
 */
export function createPhotoEditor() {
  // Preview canvas
  const previewCanvas = h('canvas', { class: 'photo-editor-preview' });
  const previewCtx = previewCanvas.getContext('2d');

  // Rotate controls
  const rotateLeftBtn = h('button', {
    class: 'btn btn-icon editor-action-btn',
    title: 'Rotate left 90\u00b0',
    onClick: () => rotateSelected(-90),
  }, rotateSvg('left'));

  const rotateRightBtn = h('button', {
    class: 'btn btn-icon editor-action-btn',
    title: 'Rotate right 90\u00b0',
    onClick: () => rotateSelected(90),
  }, rotateSvg('right'));

  const rotationSlider = h('input', {
    type: 'range',
    min: '-180',
    max: '180',
    step: '1',
    value: '0',
    onInput: (e) => {
      const val = Number(e.target.value);
      rotationValue.textContent = `${val}\u00b0`;
      updatePhoto({ rotation: val });
    },
  });

  const rotationValue = h('span', { class: 'settings-value' }, '0\u00b0');

  // Zoom / resize control
  const zoomSlider = h('input', {
    type: 'range',
    min: '1',
    max: '5',
    step: '0.05',
    value: '1',
    onInput: (e) => {
      const val = Number(e.target.value);
      zoomValue.textContent = `${val.toFixed(1)}x`;
      updatePhoto({ cropZoom: val });
    },
  });

  const zoomValue = h('span', { class: 'settings-value' }, '1.0x');

  // Reset button
  const resetBtn = h('button', {
    class: 'btn',
    style: { width: '100%', justifyContent: 'center' },
    onClick: () => {
      updatePhoto({ rotation: 0, cropZoom: 1, cropOffsetX: 0, cropOffsetY: 0 });
      syncControlsToPhoto();
    },
  }, 'Reset');

  // Close button
  const closeBtn = h('button', {
    class: 'btn btn-icon',
    style: { position: 'absolute', top: '8px', right: '8px' },
    title: 'Close editor',
    onClick: () => Store.set({ selectedCellId: null }),
  }, '\u00d7');

  // File name display
  const fileName = h('div', { class: 'editor-file-name' }, '');

  const panel = h('div', { class: 'photo-editor-panel' },
    closeBtn,
    h('h3', { class: 'sidebar-heading', style: { marginBottom: '4px' } }, 'Edit Photo'),
    fileName,
    h('div', { class: 'photo-editor-preview-wrapper' }, previewCanvas),

    // Rotate section
    h('div', { class: 'editor-section' },
      h('div', { class: 'settings-label' },
        h('span', {}, 'Rotation'),
        rotationValue,
      ),
      h('div', { class: 'editor-rotate-row' },
        rotateLeftBtn,
        rotationSlider,
        rotateRightBtn,
      ),
    ),

    // Zoom section
    h('div', { class: 'editor-section' },
      h('div', { class: 'settings-label' },
        h('span', {}, 'Zoom'),
        zoomValue,
      ),
      zoomSlider,
    ),

    // Crop hint
    h('div', { class: 'editor-hint' }, 'Drag the preview to reposition the crop'),

    resetBtn,
  );

  // Modal overlay (backdrop)
  const overlay = h('div', { class: 'photo-editor-overlay' }, panel);

  // Close on backdrop click
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      Store.set({ selectedCellId: null });
    }
  });

  // --- Preview drag-to-pan ---
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panPhotoStartX = 0;
  let panPhotoStartY = 0;

  previewCanvas.addEventListener('mousedown', (e) => {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    const photo = getSelectedPhoto();
    if (photo) {
      panPhotoStartX = photo.cropOffsetX || 0;
      panPhotoStartY = photo.cropOffsetY || 0;
    }
    previewCanvas.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    const sensitivity = 0.005;
    const offsetX = Math.max(-1, Math.min(1, panPhotoStartX - dx * sensitivity));
    const offsetY = Math.max(-1, Math.min(1, panPhotoStartY - dy * sensitivity));
    updatePhoto({ cropOffsetX: offsetX, cropOffsetY: offsetY });
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      previewCanvas.style.cursor = 'grab';
    }
  });

  // --- State sync ---
  function getSelectedPhoto() {
    const { selectedCellId, cells, photos } = Store.getState();
    if (!selectedCellId) return null;
    const cell = cells.find((c) => c.id === selectedCellId);
    if (!cell || !cell.photoId) return null;
    return photos.find((p) => p.id === cell.photoId) || null;
  }

  function updatePhoto(patch) {
    const photo = getSelectedPhoto();
    if (!photo) return;
    const photos = Store.getState().photos.map((p) =>
      p.id === photo.id ? { ...p, ...patch } : p
    );
    Store.set({ photos });
  }

  function rotateSelected(delta) {
    const photo = getSelectedPhoto();
    if (!photo) return;
    let newRotation = ((photo.rotation || 0) + delta) % 360;
    if (newRotation > 180) newRotation -= 360;
    if (newRotation < -180) newRotation += 360;
    updatePhoto({ rotation: newRotation });
    syncControlsToPhoto();
  }

  function syncControlsToPhoto() {
    const photo = getSelectedPhoto();
    if (!photo) return;
    rotationSlider.value = String(photo.rotation || 0);
    rotationValue.textContent = `${photo.rotation || 0}\u00b0`;
    zoomSlider.value = String(photo.cropZoom || 1);
    zoomValue.textContent = `${(photo.cropZoom || 1).toFixed(1)}x`;
    fileName.textContent = photo.file?.name || 'Photo';
  }

  function renderPreview() {
    const photo = getSelectedPhoto();
    if (!photo) return;

    const bitmap = ImageCache.get(photo.id);
    if (!bitmap) return;

    const maxW = previewCanvas.parentElement?.clientWidth || 430;
    const maxH = 320;

    // Size preview to photo aspect ratio
    const aspect = bitmap.width / bitmap.height;
    let pw, ph;
    if (aspect > maxW / maxH) {
      pw = maxW;
      ph = maxW / aspect;
    } else {
      ph = maxH;
      pw = maxH * aspect;
    }

    const dpr = window.devicePixelRatio || 1;
    previewCanvas.style.width = `${pw}px`;
    previewCanvas.style.height = `${ph}px`;
    previewCanvas.width = pw * dpr;
    previewCanvas.height = ph * dpr;

    previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    previewCtx.scale(dpr, dpr);

    // Checkerboard background
    previewCtx.fillStyle = '#e2e8f0';
    previewCtx.fillRect(0, 0, pw, ph);

    // Draw the photo with all transforms applied
    drawPhoto(previewCtx, bitmap, photo, 0, 0, pw, ph, bitmap.width, bitmap.height);
  }

  // Show/hide panel and update preview on state changes
  let prevSelectedCell = null;
  let prevPhotoKey = '';
  let animFrameId = null;

  function onStateChange(state) {
    const { selectedCellId, cells } = state;
    const cell = cells.find((c) => c.id === selectedCellId);
    const hasPhoto = cell && cell.photoId;

    if (hasPhoto) {
      overlay.classList.add('visible');
      const photo = state.photos.find((p) => p.id === cell.photoId);
      const key = photo ? `${photo.id}-${photo.rotation}-${photo.cropZoom}-${photo.cropOffsetX}-${photo.cropOffsetY}` : '';

      if (cell.photoId !== prevSelectedCell) {
        // New photo selected — sync controls
        prevSelectedCell = cell.photoId;
        syncControlsToPhoto();
      }

      if (key !== prevPhotoKey) {
        prevPhotoKey = key;
        renderPreview();
      }
    } else {
      overlay.classList.remove('visible');
      prevSelectedCell = null;
      prevPhotoKey = '';
    }
  }

  Store.subscribe(onStateChange);

  return { panel: overlay };
}

function rotateSvg(dir) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const paths = dir === 'left'
    ? ['M3 7v6h6', 'M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13']
    : ['M21 7v6h-6', 'M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13'];

  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}
