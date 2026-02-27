import { coverFit } from '../utils/geometry.js';

/**
 * Draw a photo bitmap into a cell rectangle on a canvas context,
 * applying crop region, crop offset, zoom, and rotation.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {ImageBitmap} bitmap
 * @param {Object} photo - photo state object
 * @param {number} dx - destination x
 * @param {number} dy - destination y
 * @param {number} dw - destination width
 * @param {number} dh - destination height
 * @param {number} cellW - cell width in logical coords (for cover-fit computation)
 * @param {number} cellH - cell height in logical coords
 */
export function drawPhoto(ctx, bitmap, photo, dx, dy, dw, dh, cellW, cellH) {
  const rotation = photo?.rotation || 0;
  const radians = (rotation * Math.PI) / 180;

  // Apply crop to get effective image region
  const cropX = (photo?.cropX || 0) * bitmap.width;
  const cropY = (photo?.cropY || 0) * bitmap.height;
  const cropW = (photo?.cropW ?? 1) * bitmap.width;
  const cropH = (photo?.cropH ?? 1) * bitmap.height;

  // For cover-fit calculation, if rotated 90/270, swap the effective cell dimensions
  const isOrthogonal = Math.abs(rotation % 180) === 90;
  const fitW = isOrthogonal ? cellH : cellW;
  const fitH = isOrthogonal ? cellW : cellH;

  const { sx, sy, sw, sh } = coverFit(
    cropW,
    cropH,
    fitW,
    fitH,
    photo?.cropOffsetX || 0,
    photo?.cropOffsetY || 0,
    photo?.cropZoom || 1
  );

  // Offset source coordinates by crop origin
  const finalSx = cropX + sx;
  const finalSy = cropY + sy;

  if (rotation === 0) {
    // Fast path — no rotation
    ctx.drawImage(bitmap, finalSx, finalSy, sw, sh, dx, dy, dw, dh);
    return;
  }

  // Rotate around the cell center
  const cx = dx + dw / 2;
  const cy = dy + dh / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(radians);

  // When rotated, the drawn rect needs to be sized so it covers the cell
  let drawW = dw;
  let drawH = dh;

  if (!isOrthogonal && rotation !== 0) {
    // For non-90 rotations, scale the image to cover the cell after rotation
    const absCos = Math.abs(Math.cos(radians));
    const absSin = Math.abs(Math.sin(radians));
    const coverW = dw * absCos + dh * absSin;
    const coverH = dw * absSin + dh * absCos;
    const scaleUp = Math.max(coverW / dw, coverH / dh);
    drawW *= scaleUp;
    drawH *= scaleUp;
  } else if (isOrthogonal) {
    // For 90/270, swap draw dimensions so the image fills the cell
    drawW = dh;
    drawH = dw;
  }

  ctx.drawImage(bitmap, finalSx, finalSy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}
