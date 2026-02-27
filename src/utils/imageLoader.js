import { uid } from './uid.js';
import { ImageCache } from '../rendering/ImageCache.js';

/**
 * Process an array of File objects into photo state objects.
 * Decodes images to ImageBitmap and generates thumbnails.
 *
 * @param {File[]} files
 * @returns {Promise<Array<{ id: string, file: File, objectURL: string, thumbnail: string, naturalWidth: number, naturalHeight: number, cropOffsetX: number, cropOffsetY: number, cropZoom: number }>>}
 */
export async function loadImages(files) {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  const results = await Promise.all(imageFiles.map(processFile));
  return results.filter(Boolean);
}

async function processFile(file) {
  try {
    const objectURL = URL.createObjectURL(file);
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    const id = uid('photo');
    ImageCache.set(id, bitmap);

    const thumbnail = generateThumbnail(bitmap, 160);

    return {
      id,
      file,
      objectURL,
      thumbnail,
      naturalWidth: bitmap.width,
      naturalHeight: bitmap.height,
      cropOffsetX: 0,
      cropOffsetY: 0,
      cropZoom: 1,
      rotation: 0,
    };
  } catch (e) {
    console.error('Failed to load image:', file.name, e);
    return null;
  }
}

function generateThumbnail(bitmap, maxSize) {
  const scale = maxSize / Math.max(bitmap.width, bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);

  // Convert to blob URL — OffscreenCanvas doesn't support toDataURL,
  // so we return an object URL from a blob
  // Actually, for simplicity, use a regular canvas
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = w;
  tmpCanvas.height = h;
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.drawImage(bitmap, 0, 0, w, h);
  return tmpCanvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Revoke object URLs and close bitmaps for removed photos.
 */
export function cleanupPhoto(photo) {
  if (photo.objectURL) URL.revokeObjectURL(photo.objectURL);
  ImageCache.remove(photo.id);
}
