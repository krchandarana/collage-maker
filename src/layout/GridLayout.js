import { uid } from '../utils/uid.js';
import { GRID_TEMPLATES } from './layoutTemplates.js';

/**
 * Compute a uniform grid layout.
 *
 * @param {Array} photos - array of photo objects
 * @param {number} canvasW - canvas width in px
 * @param {number} canvasH - canvas height in px
 * @param {number} spacing - gap between cells in px
 * @param {number} padding - outer padding in px
 * @param {string|null} templateId - specific grid template or null for auto
 * @returns {Array<{ id: string, x: number, y: number, width: number, height: number, photoId: string|null }>}
 */
export function computeGridLayout(photos, canvasW, canvasH, spacing, padding, templateId) {
  const count = photos.length || 1;
  let rows, cols;

  if (templateId) {
    const tpl = GRID_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      rows = tpl.rows;
      cols = tpl.cols;
    }
  }

  if (!rows || !cols) {
    // Auto-compute: try to make cells as close to square as possible
    cols = Math.ceil(Math.sqrt(count));
    rows = Math.ceil(count / cols);
  }

  const totalCells = rows * cols;
  const availW = canvasW - padding * 2 - (cols - 1) * spacing;
  const availH = canvasH - padding * 2 - (rows - 1) * spacing;
  const cellW = availW / cols;
  const cellH = availH / rows;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = padding + col * (cellW + spacing);
    const y = padding + row * (cellH + spacing);
    const photo = photos[i] || null;

    cells.push({
      id: uid('cell'),
      x,
      y,
      width: cellW,
      height: cellH,
      photoId: photo ? photo.id : null,
    });
  }

  return cells;
}
