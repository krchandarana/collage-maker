import { uid } from '../utils/uid.js';

/**
 * Compute a brick / masonry layout based on photo aspect ratios.
 * Packs photos into rows, scaling each row to fill the canvas width.
 */
export function computeBrickLayout(photos, canvasW, canvasH, spacing, padding) {
  if (photos.length === 0) return [];

  const availW = canvasW - padding * 2;
  const availH = canvasH - padding * 2;

  // Target row height (aim for ~3 rows in the canvas)
  const targetRowH = availH / Math.max(1, Math.ceil(photos.length / 3));

  const rows = [];
  let currentRow = [];
  let currentRowAspect = 0;

  for (const photo of photos) {
    const aspect = (photo.naturalWidth || 1) / (photo.naturalHeight || 1);
    currentRow.push({ photo, aspect });
    currentRowAspect += aspect;

    // Check if this row is "full" — combined width at target height exceeds available width
    const rowWidthAtTarget = currentRowAspect * targetRowH;
    if (rowWidthAtTarget >= availW && currentRow.length > 0) {
      rows.push([...currentRow]);
      currentRow = [];
      currentRowAspect = 0;
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Now compute actual cell positions
  const totalSpacingY = (rows.length - 1) * spacing;
  const cells = [];
  let y = padding;

  // Distribute available height proportionally based on row aspect ratios
  const rowAspects = rows.map((row) => row.reduce((sum, item) => sum + item.aspect, 0));
  // Each row height is proportional to (availW / rowAspect), normalized to fill availH
  const rawHeights = rowAspects.map((ra) => availW / ra);
  const totalRawH = rawHeights.reduce((s, h) => s + h, 0);
  const scale = (availH - totalSpacingY) / totalRawH;

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const rowH = rawHeights[ri] * scale;
    const rowSpacingX = (row.length - 1) * spacing;
    const rowAvailW = availW - rowSpacingX;

    // Distribute width proportionally by aspect ratio
    const rowTotalAspect = row.reduce((sum, item) => sum + item.aspect, 0);
    let x = padding;

    for (const item of row) {
      const cellW = (item.aspect / rowTotalAspect) * rowAvailW;
      cells.push({
        id: uid('cell'),
        x,
        y,
        width: cellW,
        height: rowH,
        photoId: item.photo.id,
      });
      x += cellW + spacing;
    }
    y += rowH + spacing;
  }

  return cells;
}
