import { h } from '../utils/dom.js';
import { Store } from '../core/Store.js';
import { EventBus } from '../core/EventBus.js';
import { cleanupPhoto } from '../utils/imageLoader.js';
import { computeLayout } from '../layout/LayoutEngine.js';

export function createPhotoPanel() {
  const container = h('div', { class: 'photo-strip' });

  const addBtn = h('button', {
    class: 'photo-strip-add',
    title: 'Add more photos',
    onClick: () => EventBus.emit('addPhotos'),
  }, '+');

  function render() {
    const { photos } = Store.getState();
    container.innerHTML = '';

    if (photos.length === 0) {
      container.appendChild(
        h('span', { class: 'photo-strip-hint' }, 'Add photos to start creating your collage')
      );
      container.appendChild(addBtn);
      return;
    }

    for (const photo of photos) {
      const img = h('img', {
        class: 'photo-strip-thumb',
        src: photo.thumbnail,
        alt: photo.file?.name || 'Photo',
        draggable: 'true',
      });

      const removeBtn = h('button', {
        class: 'photo-strip-remove',
        title: 'Remove photo',
        onClick: (e) => {
          e.stopPropagation();
          removePhoto(photo);
        },
      }, '\u00d7');

      const wrapper = h('div', { class: 'photo-strip-thumb-wrapper' }, img, removeBtn);
      container.appendChild(wrapper);
    }

    container.appendChild(addBtn);
  }

  function removePhoto(photo) {
    const state = Store.getState();
    const newPhotos = state.photos.filter((p) => p.id !== photo.id);
    Store.set({ photos: newPhotos });
    const cells = computeLayout({ ...Store.getState(), photos: newPhotos });
    Store.set({ cells });
    cleanupPhoto(photo);
  }

  Store.subscribe(render);
  requestAnimationFrame(render);

  return { container };
}
