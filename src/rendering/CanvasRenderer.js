import { Store } from '../core/Store.js';
import { ImageCache } from './ImageCache.js';
import { mmToPx } from '../core/constants.js';
import { drawPhoto } from './drawPhoto.js';

let canvas = null;
let ctx = null;
let rafId = null;
let needsRender = true;

/**
 * Initialize the renderer with a canvas element.
 */
export function initRenderer(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  Store.subscribe(() => {
    needsRender = true;
  });
  renderLoop();
}

function renderLoop() {
  if (needsRender) {
    needsRender = false;
    render();
  }
  rafId = requestAnimationFrame(renderLoop);
}

export function stopRenderer() {
  cancelAnimationFrame(rafId);
}

function render() {
  const state = Store.getState();
  const { canvasWidth, canvasHeight, backgroundColor, cells, borderRadiusMM, photos, hoveredCellId, selectedCellId } = state;
  const borderRadius = mmToPx(borderRadiusMM);

  // Size the canvas buffer to match the viewport display size (not the full print resolution)
  const container = canvas.parentElement;
  if (!container) return;

  const containerW = container.clientWidth;
  const containerH = container.clientHeight;

  // Fit the canvas aspect ratio into the container
  const canvasAspect = canvasWidth / canvasHeight;
  const containerAspect = containerW / containerH;

  let displayW, displayH;
  if (canvasAspect > containerAspect) {
    displayW = containerW;
    displayH = containerW / canvasAspect;
  } else {
    displayH = containerH;
    displayW = containerH * canvasAspect;
  }

  // Apply device pixel ratio for sharp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Scale factor from logical canvas coords to display coords
  const scaleX = displayW / canvasWidth;
  const scaleY = displayH / canvasHeight;

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, displayW, displayH);

  // Build a map of photo id → photo object for quick lookup
  const photoMap = new Map(photos.map((p) => [p.id, p]));

  // Draw cells
  for (const cell of cells) {
    const dx = cell.x * scaleX;
    const dy = cell.y * scaleY;
    const dw = cell.width * scaleX;
    const dh = cell.height * scaleY;

    ctx.save();

    // Clip to cell with border radius
    const r = borderRadius * Math.min(scaleX, scaleY);
    roundedRect(ctx, dx, dy, dw, dh, r);
    ctx.clip();

    if (cell.photoId) {
      const photo = photoMap.get(cell.photoId);
      const bitmap = ImageCache.get(cell.photoId);

      if (bitmap) {
        drawPhoto(ctx, bitmap, photo, dx, dy, dw, dh, cell.width, cell.height);
      } else {
        // Placeholder while image loads
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${14 * Math.min(scaleX, scaleY)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', dx + dw / 2, dy + dh / 2);
      }
    } else {
      // Empty cell
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Hover / selection indicators
    if (cell.id === hoveredCellId || cell.id === selectedCellId) {
      ctx.save();
      roundedRect(ctx, dx, dy, dw, dh, r);
      if (cell.id === selectedCellId) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
        ctx.lineWidth = 2;
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Draw text overlays
  const { textOverlays } = state;
  for (const overlay of textOverlays) {
    ctx.save();
    const fontSize = overlay.fontSize * Math.min(scaleX, scaleY);
    ctx.font = `${overlay.bold ? 'bold ' : ''}${overlay.italic ? 'italic ' : ''}${fontSize}px ${overlay.fontFamily}`;
    ctx.fillStyle = overlay.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = overlay.x * displayW;
    const ty = overlay.y * displayH;

    // Text shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = fontSize * 0.05;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = fontSize * 0.02;

    ctx.fillText(overlay.text, tx, ty);
    ctx.restore();
  }
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

/**
 * Get the display-to-canvas coordinate scale factors.
 * Useful for hit-testing mouse events.
 */
export function getCanvasTransform() {
  if (!canvas) return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  const state = Store.getState();
  const displayW = parseFloat(canvas.style.width);
  const displayH = parseFloat(canvas.style.height);
  return {
    scaleX: state.canvasWidth / displayW,
    scaleY: state.canvasHeight / displayH,
    displayW,
    displayH,
  };
}
