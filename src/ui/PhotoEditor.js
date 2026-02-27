import { h } from '../utils/dom.js';
import { Store } from '../core/Store.js';
import { ImageCache } from '../rendering/ImageCache.js';
import { drawPhoto } from '../rendering/drawPhoto.js';

/**
 * Photo Editor modal — shown when a photo cell is selected.
 * Displays an enlarged preview with rotate, crop, and zoom controls.
 */
export function createPhotoEditor() {
  // --- Preview canvas (normal mode) ---
  const previewCanvas = h('canvas', { class: 'photo-editor-preview' });
  const previewCtx = previewCanvas.getContext('2d');

  // --- Crop canvas (crop mode) ---
  const cropCanvas = h('canvas', { class: 'photo-editor-crop-canvas' });
  const cropCtx = cropCanvas.getContext('2d');

  // --- Rotate controls ---
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

  // --- Zoom control ---
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

  // --- Buttons ---
  const cropBtn = h('button', {
    class: 'btn',
    style: { flex: '1', justifyContent: 'center', gap: '6px' },
    onClick: enterCropMode,
  }, cropSvg(), 'Crop');

  const resetBtn = h('button', {
    class: 'btn',
    style: { flex: '1', justifyContent: 'center' },
    onClick: () => {
      updatePhoto({
        rotation: 0, cropZoom: 1, cropOffsetX: 0, cropOffsetY: 0,
        cropX: 0, cropY: 0, cropW: 1, cropH: 1,
      });
      syncControlsToPhoto();
    },
  }, 'Reset');

  const closeBtn = h('button', {
    class: 'btn btn-icon',
    style: { position: 'absolute', top: '8px', right: '8px' },
    title: 'Close editor',
    onClick: () => Store.set({ selectedCellId: null }),
  }, '\u00d7');

  const fileName = h('div', { class: 'editor-file-name' }, '');
  const editorTitle = h('h3', { class: 'sidebar-heading', style: { marginBottom: '4px' } }, 'Edit Photo');

  // --- Normal mode view ---
  const previewWrapper = h('div', { class: 'photo-editor-preview-wrapper' }, previewCanvas);

  const normalControls = h('div', { class: 'editor-normal-controls' },
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
    // Hint
    h('div', { class: 'editor-hint' }, 'Drag the preview to reposition the crop'),
    // Button row
    h('div', { style: { display: 'flex', gap: '8px' } },
      cropBtn,
      resetBtn,
    ),
  );

  // --- Crop mode view ---
  const cropApplyBtn = h('button', {
    class: 'btn btn-primary',
    style: { flex: '1', justifyContent: 'center' },
    onClick: applyCrop,
  }, 'Apply Crop');

  const cropCancelBtn = h('button', {
    class: 'btn',
    style: { flex: '1', justifyContent: 'center' },
    onClick: exitCropMode,
  }, 'Cancel');

  const cropView = h('div', { class: 'editor-crop-view', style: { display: 'none' } },
    h('div', { class: 'photo-editor-crop-wrapper' }, cropCanvas),
    h('div', { class: 'editor-hint' }, 'Drag corners to resize, drag inside to move'),
    h('div', { style: { display: 'flex', gap: '8px' } },
      cropCancelBtn,
      cropApplyBtn,
    ),
  );

  // --- Panel ---
  const panel = h('div', { class: 'photo-editor-panel' },
    closeBtn,
    editorTitle,
    fileName,
    previewWrapper,
    normalControls,
    cropView,
  );

  // Modal overlay (backdrop)
  const overlay = h('div', { class: 'photo-editor-overlay' }, panel);

  // Close on backdrop click
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      Store.set({ selectedCellId: null });
    }
  });

  // =============================================
  // Preview drag-to-pan (normal mode)
  // =============================================
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

  // =============================================
  // Crop mode
  // =============================================
  let isCropMode = false;
  let cropRect = { x: 0, y: 0, w: 1, h: 1 };
  let cropDragType = null; // 'move', 'nw', 'ne', 'sw', 'se'
  let cropDragStart = { mx: 0, my: 0, rect: null };
  let cropImgW = 0;
  let cropImgH = 0;

  function enterCropMode() {
    const photo = getSelectedPhoto();
    if (!photo) return;
    isCropMode = true;
    cropRect = {
      x: photo.cropX || 0,
      y: photo.cropY || 0,
      w: photo.cropW ?? 1,
      h: photo.cropH ?? 1,
    };
    previewWrapper.style.display = 'none';
    normalControls.style.display = 'none';
    cropView.style.display = '';
    editorTitle.textContent = 'Crop Photo';
    renderCropCanvas();
  }

  function exitCropMode() {
    isCropMode = false;
    cropDragType = null;
    previewWrapper.style.display = '';
    normalControls.style.display = '';
    cropView.style.display = 'none';
    editorTitle.textContent = 'Edit Photo';
    renderPreview();
  }

  function applyCrop() {
    updatePhoto({
      cropX: cropRect.x,
      cropY: cropRect.y,
      cropW: cropRect.w,
      cropH: cropRect.h,
      cropOffsetX: 0,
      cropOffsetY: 0,
    });
    exitCropMode();
  }

  function getCropCoords(e) {
    const rect = cropCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / cropImgW,
      y: (e.clientY - rect.top) / cropImgH,
    };
  }

  function hitTestCropHandle(mx, my) {
    const hrx = 12 / (cropImgW || 1);
    const hry = 12 / (cropImgH || 1);
    const corners = {
      nw: { x: cropRect.x, y: cropRect.y },
      ne: { x: cropRect.x + cropRect.w, y: cropRect.y },
      sw: { x: cropRect.x, y: cropRect.y + cropRect.h },
      se: { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h },
    };
    for (const [name, pos] of Object.entries(corners)) {
      if (Math.abs(mx - pos.x) < hrx && Math.abs(my - pos.y) < hry) return name;
    }
    if (mx >= cropRect.x && mx <= cropRect.x + cropRect.w &&
        my >= cropRect.y && my <= cropRect.y + cropRect.h) {
      return 'move';
    }
    return null;
  }

  cropCanvas.addEventListener('mousedown', (e) => {
    if (!isCropMode) return;
    const { x, y } = getCropCoords(e);
    const hit = hitTestCropHandle(x, y);
    if (hit) {
      cropDragType = hit;
      cropDragStart = { mx: x, my: y, rect: { ...cropRect } };
    }
    e.preventDefault();
  });

  cropCanvas.addEventListener('mousemove', (e) => {
    if (!isCropMode || cropDragType) return;
    const { x, y } = getCropCoords(e);
    const hit = hitTestCropHandle(x, y);
    if (hit === 'nw' || hit === 'se') cropCanvas.style.cursor = 'nwse-resize';
    else if (hit === 'ne' || hit === 'sw') cropCanvas.style.cursor = 'nesw-resize';
    else if (hit === 'move') cropCanvas.style.cursor = 'move';
    else cropCanvas.style.cursor = 'default';
  });

  window.addEventListener('mousemove', (e) => {
    if (!cropDragType || !isCropMode) return;
    const { x, y } = getCropCoords(e);
    const dx = x - cropDragStart.mx;
    const dy = y - cropDragStart.my;
    const r = cropDragStart.rect;

    if (cropDragType === 'move') {
      let nx = r.x + dx;
      let ny = r.y + dy;
      nx = Math.max(0, Math.min(1 - r.w, nx));
      ny = Math.max(0, Math.min(1 - r.h, ny));
      cropRect = { x: nx, y: ny, w: r.w, h: r.h };
    } else {
      let rx = r.x, ry = r.y, rw = r.w, rh = r.h;
      const MIN = 0.05;
      if (cropDragType.includes('w')) {
        const newX = Math.max(0, Math.min(rx + rw - MIN, rx + dx));
        rw = rx + rw - newX;
        rx = newX;
      }
      if (cropDragType[1] === 'e') {
        rw = Math.max(MIN, Math.min(1 - rx, rw + dx));
      }
      if (cropDragType[0] === 'n') {
        const newY = Math.max(0, Math.min(ry + rh - MIN, ry + dy));
        rh = ry + rh - newY;
        ry = newY;
      }
      if (cropDragType[0] === 's') {
        rh = Math.max(MIN, Math.min(1 - ry, rh + dy));
      }
      cropRect = { x: rx, y: ry, w: rw, h: rh };
    }
    renderCropCanvas();
  });

  window.addEventListener('mouseup', () => {
    if (cropDragType) {
      cropDragType = null;
    }
  });

  function renderCropCanvas() {
    const photo = getSelectedPhoto();
    if (!photo) return;
    const bitmap = ImageCache.get(photo.id);
    if (!bitmap) return;

    const maxW = cropCanvas.parentElement?.clientWidth || 430;
    const maxH = 320;
    const imgAspect = bitmap.width / bitmap.height;
    let imgW, imgH;
    if (imgAspect > maxW / maxH) {
      imgW = maxW;
      imgH = maxW / imgAspect;
    } else {
      imgH = maxH;
      imgW = maxH * imgAspect;
    }

    const dpr = window.devicePixelRatio || 1;
    cropCanvas.style.width = `${imgW}px`;
    cropCanvas.style.height = '';
    cropCanvas.style.aspectRatio = `${imgW} / ${imgH}`;
    cropCanvas.width = imgW * dpr;
    cropCanvas.height = imgH * dpr;
    cropCtx.setTransform(1, 0, 0, 1, 0, 0);
    cropCtx.scale(dpr, dpr);

    cropImgW = imgW;
    cropImgH = imgH;

    // Draw full image
    cropCtx.drawImage(bitmap, 0, 0, imgW, imgH);

    // Dark overlay
    cropCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    cropCtx.fillRect(0, 0, imgW, imgH);

    // Bright crop area
    const cx = cropRect.x * imgW;
    const cy = cropRect.y * imgH;
    const cw = cropRect.w * imgW;
    const ch = cropRect.h * imgH;

    cropCtx.save();
    cropCtx.beginPath();
    cropCtx.rect(cx, cy, cw, ch);
    cropCtx.clip();
    cropCtx.drawImage(bitmap, 0, 0, imgW, imgH);
    cropCtx.restore();

    // Crop border
    cropCtx.strokeStyle = '#ffffff';
    cropCtx.lineWidth = 2;
    cropCtx.strokeRect(cx, cy, cw, ch);

    // Rule of thirds grid
    cropCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    cropCtx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const gx = cx + (cw * i) / 3;
      const gy = cy + (ch * i) / 3;
      cropCtx.beginPath();
      cropCtx.moveTo(gx, cy);
      cropCtx.lineTo(gx, cy + ch);
      cropCtx.stroke();
      cropCtx.beginPath();
      cropCtx.moveTo(cx, gy);
      cropCtx.lineTo(cx + cw, gy);
      cropCtx.stroke();
    }

    // Corner handles
    const hs = 6;
    cropCtx.fillStyle = '#ffffff';
    cropCtx.strokeStyle = '#2563eb';
    cropCtx.lineWidth = 2;
    const corners = [
      [cx, cy], [cx + cw, cy],
      [cx, cy + ch], [cx + cw, cy + ch],
    ];
    for (const [hx, hy] of corners) {
      cropCtx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
      cropCtx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
    }
  }

  // =============================================
  // State helpers
  // =============================================
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

    // Get the cell so the preview matches the collage aspect ratio
    const { selectedCellId, cells } = Store.getState();
    const cell = cells.find((c) => c.id === selectedCellId);
    if (!cell) return;

    const maxW = previewCanvas.parentElement?.clientWidth || 430;
    const maxH = 320;

    // Use the cell's aspect ratio to match the main collage
    const cellAspect = cell.width / cell.height;
    let pw, ph;
    if (cellAspect > maxW / maxH) {
      pw = maxW;
      ph = maxW / cellAspect;
    } else {
      ph = maxH;
      pw = maxH * cellAspect;
    }

    const dpr = window.devicePixelRatio || 1;
    previewCanvas.style.width = `${pw}px`;
    previewCanvas.style.height = '';
    previewCanvas.style.aspectRatio = `${pw} / ${ph}`;
    previewCanvas.width = pw * dpr;
    previewCanvas.height = ph * dpr;

    previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    previewCtx.scale(dpr, dpr);

    previewCtx.fillStyle = '#e2e8f0';
    previewCtx.fillRect(0, 0, pw, ph);

    // Pass cell dimensions so cover-fit matches the main collage exactly
    drawPhoto(previewCtx, bitmap, photo, 0, 0, pw, ph, cell.width, cell.height);
  }

  // =============================================
  // State change handler
  // =============================================
  let prevSelectedCell = null;
  let prevPhotoKey = '';

  function onStateChange(state) {
    const { selectedCellId, cells } = state;
    const cell = cells.find((c) => c.id === selectedCellId);
    const hasPhoto = cell && cell.photoId;

    if (hasPhoto) {
      overlay.classList.add('visible');
      const photo = state.photos.find((p) => p.id === cell.photoId);
      const key = photo ? [
        photo.id, photo.rotation, photo.cropZoom,
        photo.cropOffsetX, photo.cropOffsetY,
        photo.cropX, photo.cropY, photo.cropW, photo.cropH,
      ].join('-') : '';

      if (cell.photoId !== prevSelectedCell) {
        prevSelectedCell = cell.photoId;
        syncControlsToPhoto();
      }

      if (key !== prevPhotoKey) {
        prevPhotoKey = key;
        if (!isCropMode) renderPreview();
      }
    } else {
      overlay.classList.remove('visible');
      // Reset to normal mode for next open
      if (isCropMode) {
        isCropMode = false;
        cropDragType = null;
        previewWrapper.style.display = '';
        normalControls.style.display = '';
        cropView.style.display = 'none';
        editorTitle.textContent = 'Edit Photo';
      }
      prevSelectedCell = null;
      prevPhotoKey = '';
    }
  }

  Store.subscribe(onStateChange);

  return { panel: overlay };
}

// =============================================
// SVG icon helpers
// =============================================
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

function cropSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const paths = [
    'M6.13 1L6 16a2 2 0 002 2h15',
    'M1 6.13L16 6a2 2 0 012 2v15',
  ];
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}
