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

  const paper = PAPER_SIZES.find((p) => p.id === paperId);
  let exportW = canvasWidth;
  let exportH = canvasHeight;

  // Detect max canvas area (iOS limits total pixels, not just dimension)
  const maxArea = detectMaxCanvasArea();
  const area = exportW * exportH;

  if (format === 'pdf' && area > maxArea) {
    // Scale down canvas for PDF — page size is set in mm independently
    const scale = Math.sqrt(maxArea / area) * 0.95; // 5% safety margin
    exportW = Math.floor(exportW * scale);
    exportH = Math.floor(exportH * scale);
  } else if (area > maxArea) {
    throw new Error(`Canvas size ${exportW}x${exportH} (${(area / 1e6).toFixed(1)}M pixels) exceeds browser limit. Try a smaller paper size.`);
  }

  const scaleFactor = exportW / canvasWidth;
  const borderRadius = mmToPx(borderRadiusMM) * scaleFactor;

  const canvas = document.createElement('canvas');
  canvas.width = exportW;
  canvas.height = exportH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not create canvas context. Your device may not have enough memory for this export size.');
  }

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

    const cx = cell.x * scaleFactor;
    const cy = cell.y * scaleFactor;
    const cw = cell.width * scaleFactor;
    const ch = cell.height * scaleFactor;

    ctx.save();

    // Clip with border radius
    roundedRect(ctx, cx, cy, cw, ch, borderRadius);
    ctx.clip();

    // Draw image with cover-fit + rotation
    drawPhoto(ctx, bitmap, photo, cx, cy, cw, ch, cell.width, cell.height);

    ctx.restore();

    done++;
    onProgress?.(done / total);
  }

  // Draw text overlays
  for (const overlay of textOverlays) {
    ctx.save();
    ctx.font = `${overlay.bold ? 'bold ' : ''}${overlay.italic ? 'italic ' : ''}${Math.round(overlay.fontSize * scaleFactor)}px ${overlay.fontFamily}`;
    ctx.fillStyle = overlay.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = overlay.x * exportW;
    const y = overlay.y * exportH;
    ctx.fillText(overlay.text, x, y);
    ctx.restore();
  }

  const sizeLabel = paper ? paper.label.replace(' ', '-') : `${exportW}x${exportH}`;

  if (format === 'pdf') {
    const widthMM = paper ? paper.widthMM : canvasWidth * 25.4 / 300;
    const heightMM = paper ? paper.heightMM : canvasHeight * 25.4 / 300;
    const orientation = widthMM > heightMM ? 'landscape' : 'portrait';
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const doc = new jsPDF({ orientation, unit: 'mm', format: [widthMM, heightMM] });
    doc.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM);
    const pdfBlob = doc.output('blob');
    downloadBlob(pdfBlob, `collage-${sizeLabel}-300dpi.pdf`);
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

let cachedMaxArea = null;

function detectMaxCanvasArea() {
  if (cachedMaxArea) return cachedMaxArea;

  // Test known safe areas from large to small.
  // iOS Safari limits total pixel area (~16.7M), not just dimensions.
  // Desktop browsers typically support much larger canvases.
  const candidates = [
    16384 * 16384,  // 268M — most desktop browsers
    8192 * 8192,    // 67M
    4096 * 8192,    // 33.5M
    4096 * 4096,    // 16.7M — iOS limit
    3072 * 4096,    // 12.5M
    2048 * 4096,    // 8.3M — conservative fallback
  ];

  for (const area of candidates) {
    const dim = Math.floor(Math.sqrt(area));
    try {
      const tc = document.createElement('canvas');
      tc.width = dim;
      tc.height = dim;
      const tctx = tc.getContext('2d');
      if (!tctx) continue;
      tctx.fillRect(0, 0, 1, 1);
      const data = tctx.getImageData(0, 0, 1, 1);
      if (data.data[3] > 0) {
        cachedMaxArea = area;
        return area;
      }
    } catch {
      continue;
    }
  }

  cachedMaxArea = 2048 * 4096;
  return cachedMaxArea;
}
