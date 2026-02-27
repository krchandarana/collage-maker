import { h } from '../utils/dom.js';
import { EventBus } from '../core/EventBus.js';

export function createDropZone() {
  const overlay = h('div', { class: 'drop-zone-overlay hidden' },
    h('div', { class: 'drop-zone-box' },
      h('p', {}, 'Drop photos here'),
      h('p', {}, 'Release to add to your collage'),
    ),
  );

  let dragCounter = 0;

  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      overlay.classList.remove('hidden');
    }
  });

  document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      overlay.classList.add('hidden');
    }
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    overlay.classList.add('hidden');

    const files = [...e.dataTransfer.files];
    if (files.length > 0) {
      EventBus.emit('filesDropped', files);
    }
  });

  return { overlay };
}
