/**
 * Compute cover-fit source rect for drawing an image into a cell.
 * Returns { sx, sy, sw, sh } to use with ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh).
 *
 * @param {number} imgW - natural image width
 * @param {number} imgH - natural image height
 * @param {number} cellW - cell width
 * @param {number} cellH - cell height
 * @param {number} offsetX - pan offset X (-1 to 1, 0 = centered)
 * @param {number} offsetY - pan offset Y (-1 to 1, 0 = centered)
 * @param {number} zoom - zoom level (1 = fill, >1 = zoomed in)
 * @returns {{ sx: number, sy: number, sw: number, sh: number }}
 */
export function coverFit(imgW, imgH, cellW, cellH, offsetX = 0, offsetY = 0, zoom = 1) {
  const cellAspect = cellW / cellH;
  const imgAspect = imgW / imgH;

  let sw, sh;
  if (imgAspect > cellAspect) {
    // Image is wider than cell — fit height, crop width
    sh = imgH;
    sw = imgH * cellAspect;
  } else {
    // Image is taller than cell — fit width, crop height
    sw = imgW;
    sh = imgW / cellAspect;
  }

  // Apply zoom (reduce the source rect to zoom in)
  sw /= zoom;
  sh /= zoom;

  // Center + pan offset
  const maxOffsetX = (imgW - sw) / 2;
  const maxOffsetY = (imgH - sh) / 2;
  const sx = (imgW - sw) / 2 + offsetX * maxOffsetX;
  const sy = (imgH - sh) / 2 + offsetY * maxOffsetY;

  return {
    sx: Math.max(0, Math.min(sx, imgW - sw)),
    sy: Math.max(0, Math.min(sy, imgH - sh)),
    sw,
    sh,
  };
}

/**
 * Check if a point is inside a rect.
 */
export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
