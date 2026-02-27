/**
 * Cache for decoded ImageBitmap objects.
 * Maps photo ID → ImageBitmap.
 */
const cache = new Map();

export const ImageCache = {
  get(photoId) {
    return cache.get(photoId) || null;
  },

  set(photoId, bitmap) {
    cache.set(photoId, bitmap);
  },

  has(photoId) {
    return cache.has(photoId);
  },

  remove(photoId) {
    const bmp = cache.get(photoId);
    if (bmp) {
      bmp.close();
      cache.delete(photoId);
    }
  },

  clear() {
    for (const bmp of cache.values()) {
      bmp.close();
    }
    cache.clear();
  },

  get size() {
    return cache.size;
  },
};
