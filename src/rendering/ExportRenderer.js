import { jsPDF } from 'jspdf';
import { Store } from '../core/Store.js';
import { ImageCache } from './ImageCache.js';
import { downloadBlob } from '../utils/download.js';
import { PAPER_SIZES, mmToPx } from '../core/constants.js';
import { drawPhoto } from './drawPhoto.js';

/**
 * Export the collage at full print resolution.
 * @param {Object} opts
 * @param {'png'|'jpeg'|'pdf'} opts.format
 * @param {number} opts.quality - JPEG quality 0-1
 * @param {(progress: number) => void} [opts.onProgress]
 * @returns {Promise<void>}
 */
export async function exportCollage({ format = 'png', quality = 0.92, onProgress } = {}) {
  const state = Store.getState();
  const { canvasWidth, canvasHeight, backgroundColor, cells, borderRadiusMM, photos, paperId, textOverlays } = state;
  const borderRadius = mmToPx(borderRadiusMM);

  const paper = PAPER_SIZES.find((p) => p.id === paperId);
  const exportW = canvasWidth;
  const exportH = canvasHeight;

  // Detect max canvas size
  const maxDim = detectMaxCanvasSize();
  if (exportW > maxDim || exportH > maxDim) {
    throw new Error(`Canvas size ${exportW}x${exportH} exceeds browser limit of ${maxDim}px. Try a smaller paper size.`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = exportW;
  canvas.height = exportH;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, exportW, exportH);

  const photoMap = new Map(photos.map((p) => [p.id, p]));
  const total = cells.filter((c) => c.photoId).length;
  let done = 0;

  for (const cell of cells) {
    if (!cell.photoId) continue;

    const photo = photoMap.get(cell.photoId);
    const bitmap = ImageCache.get(cell.photoId);
    if (!bitmap) continue;

    ctx.save();

    // Clip with border radius
    const r = borderRadius;
    roundedRect(ctx, cell.x, cell.y, cell.width, cell.height, r);
    ctx.clip();

    // Draw image with cover-fit + rotation
    drawPhoto(ctx, bitmap, photo, cell.x, cell.y, cell.width, cell.height, cell.width, cell.height);

    ctx.restore();

    done++;
    onProgress?.(done / total);
  }

  // Draw text overlays
  for (const overlay of textOverlays) {
    ctx.save();
    ctx.font = `${overlay.bold ? 'bold ' : ''}${overlay.italic ? 'italic ' : ''}${overlay.fontSize}px ${overlay.fontFamily}`;
    ctx.fillStyle = overlay.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = overlay.x * canvasWidth;
    const y = overlay.y * canvasHeight;
    ctx.fillText(overlay.text, x, y);
    ctx.restore();
  }

  const sizeLabel = paper ? paper.label.replace(' ', '-') : `${exportW}x${exportH}`;

  if (format === 'pdf') {
    const widthMM = paper ? paper.widthMM : exportW * 25.4 / 300;
    const heightMM = paper ? paper.heightMM : exportH * 25.4 / 300;
    const orientation = widthMM > heightMM ? 'landscape' : 'portrait';
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const doc = new jsPDF({ orientation, unit: 'mm', format: [widthMM, heightMM] });
    doc.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM);
    doc.save(`collage-${sizeLabel}-300dpi.pdf`);
    return;
  }

  // Convert to blob and download
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));

  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const filename = `collage-${sizeLabel}-300dpi.${ext}`;

  downloadBlob(blob, filename);
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

let cachedMaxDim = null;

function detectMaxCanvasSize() {
  if (cachedMaxDim) return cachedMaxDim;

  // Binary search for max canvas dimension
  let lo = 1024;
  let hi = 16384;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    try {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = mid;
      testCanvas.height = mid;
      const testCtx = testCanvas.getContext('2d');
      testCtx.fillRect(0, 0, 1, 1);
      // If we can read back a pixel, the canvas works
      const data = testCtx.getImageData(0, 0, 1, 1);
      if (data.data[3] > 0) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    } catch {
      hi = mid - 1;
    }
  }

  cachedMaxDim = lo;
  return lo;
}
