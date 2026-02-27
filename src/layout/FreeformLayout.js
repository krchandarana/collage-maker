import { uid } from '../utils/uid.js';

/**
 * Compute a freeform layout using a squarified treemap algorithm.
 * Each photo gets proportional area based on its pixel count (or equal weight).
 */
export function computeFreeformLayout(photos, canvasW, canvasH, spacing, padding) {
  if (photos.length === 0) return [];

  const availW = canvasW - padding * 2;
  const availH = canvasH - padding * 2;

  // Assign weights — use equal weights for a balanced look
  const items = photos.map((photo) => ({
    photo,
    weight: 1,
  }));

  // Normalize weights so they sum to total area
  const totalArea = availW * availH;
  const totalWeight = items.reduce((s, it) => s + it.weight, 0);
  const normalizedItems = items.map((it) => ({
    ...it,
    area: (it.weight / totalWeight) * totalArea,
  }));

  // Squarified treemap
  const rects = squarify(normalizedItems, {
    x: padding,
    y: padding,
    w: availW,
    h: availH,
  });

  // Apply spacing by insetting each rect
  const halfSpacing = spacing / 2;
  return rects.map((r, i) => ({
    id: uid('cell'),
    x: r.x + halfSpacing,
    y: r.y + halfSpacing,
    width: Math.max(1, r.w - spacing),
    height: Math.max(1, r.h - spacing),
    photoId: photos[i] ? photos[i].id : null,
  }));
}

/**
 * Squarified treemap algorithm.
 * Lays out items with given areas into the specified rectangle.
 */
function squarify(items, rect) {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x: rect.x, y: rect.y, w: rect.w, h: rect.h }];
  }

  // Sort by area descending
  const sorted = [...items].sort((a, b) => b.area - a.area);
  const results = [];
  layoutItems(sorted, rect, results);
  return results;
}

function layoutItems(items, rect, results) {
  if (items.length === 0) return;
  if (items.length === 1) {
    results.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
    return;
  }

  const totalArea = items.reduce((s, it) => s + it.area, 0);
  const isWide = rect.w >= rect.h;

  // Try adding items to the current row until aspect ratio worsens
  let row = [items[0]];
  let rowArea = items[0].area;
  let bestWorst = worstAspect(row, rowArea, rect, isWide);

  for (let i = 1; i < items.length; i++) {
    const testRow = [...row, items[i]];
    const testArea = rowArea + items[i].area;
    const testWorst = worstAspect(testRow, testArea, rect, isWide);

    if (testWorst <= bestWorst) {
      row = testRow;
      rowArea = testArea;
      bestWorst = testWorst;
    } else {
      break;
    }
  }

  // Layout the row
  const fraction = rowArea / totalArea;
  if (isWide) {
    const rowW = rect.w * fraction;
    let y = rect.y;
    for (const item of row) {
      const h = (item.area / rowArea) * rect.h;
      results.push({ x: rect.x, y, w: rowW, h });
      y += h;
    }
    // Recurse on remaining space
    const remaining = items.slice(row.length);
    layoutItems(remaining, {
      x: rect.x + rowW,
      y: rect.y,
      w: rect.w - rowW,
      h: rect.h,
    }, results);
  } else {
    const rowH = rect.h * fraction;
    let x = rect.x;
    for (const item of row) {
      const w = (item.area / rowArea) * rect.w;
      results.push({ x, y: rect.y, w, h: rowH });
      x += w;
    }
    const remaining = items.slice(row.length);
    layoutItems(remaining, {
      x: rect.x,
      y: rect.y + rowH,
      w: rect.w,
      h: rect.h - rowH,
    }, results);
  }
}

function worstAspect(row, rowArea, rect, isWide) {
  let worst = 0;
  for (const item of row) {
    const fraction = item.area / rowArea;
    let w, h;
    if (isWide) {
      w = (rowArea / (isWide ? rect.h : rect.w));
      h = fraction * (isWide ? rect.h : rect.w);
    } else {
      h = (rowArea / rect.w);
      w = fraction * rect.w;
    }
    const aspect = Math.max(w / h, h / w);
    worst = Math.max(worst, aspect);
  }
  return worst;
}
