import { h } from '../utils/dom.js';
import { EventBus } from '../core/EventBus.js';

export function createToolbar() {
  const addPhotosBtn = h('button', {
    class: 'btn btn-primary',
    onClick: () => EventBus.emit('addPhotos'),
  },
    svgIcon('plus', 18),
    ' Add Photos'
  );

  const undoBtn = h('button', {
    class: 'btn btn-icon',
    title: 'Undo (Ctrl+Z)',
    onClick: () => EventBus.emit('undo'),
  }, svgIcon('undo', 18));

  const redoBtn = h('button', {
    class: 'btn btn-icon',
    title: 'Redo (Ctrl+Shift+Z)',
    onClick: () => EventBus.emit('redo'),
  }, svgIcon('redo', 18));

  const exportBtn = h('button', {
    class: 'btn btn-export',
    onClick: () => EventBus.emit('showExport'),
  },
    svgIcon('download', 18),
    ' Export'
  );

  const sidebarToggle = h('button', {
    class: 'btn btn-icon sidebar-toggle',
    title: 'Toggle sidebar',
    onClick: () => EventBus.emit('toggleSidebar'),
  }, menuSvg());

  const toolbar = h('header', { class: 'toolbar' },
    h('div', { class: 'toolbar-left' },
      sidebarToggle,
      h('span', { class: 'toolbar-logo' }, 'Collage Maker'),
      addPhotosBtn,
    ),
    h('div', { class: 'toolbar-center' },
      undoBtn,
      redoBtn,
    ),
    h('div', { class: 'toolbar-right' },
      exportBtn,
    ),
  );

  return { toolbar, undoBtn, redoBtn };
}

function menuSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of ['M3 12h18', 'M3 6h18', 'M3 18h18']) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

function svgIcon(name, size = 20) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const paths = {
    plus: ['M12 5v14', 'M5 12h14'],
    undo: ['M3 7v6h6', 'M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13'],
    redo: ['M21 7v6h-6', 'M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13'],
    download: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  };

  for (const d of (paths[name] || [])) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }

  return svg;
}
