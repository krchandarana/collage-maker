import { h } from '../utils/dom.js';
import { Store } from '../core/Store.js';
import { uid } from '../utils/uid.js';

const FONTS = [
  { id: 'sans', label: 'Sans Serif', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Monospace', value: '"SF Mono", "Fira Code", Menlo, monospace' },
  { id: 'cursive', label: 'Cursive', value: '"Brush Script MT", "Segoe Script", cursive' },
  { id: 'impact', label: 'Impact', value: 'Impact, "Arial Black", sans-serif' },
];

export function createTextPanel() {
  let selectedTextId = null;

  const addBtn = h('button', {
    class: 'btn',
    style: { width: '100%', justifyContent: 'center' },
    onClick: addText,
  }, '+ Add Text');

  // Font selector
  const fontSelect = h('select', {
    class: 'text-select',
    onInput: (e) => updateSelectedText({ fontFamily: e.target.value }),
  });
  FONTS.forEach((f) => {
    fontSelect.appendChild(h('option', { value: f.value }, f.label));
  });

  const sizeInput = h('input', {
    type: 'range',
    min: '20',
    max: '300',
    value: '80',
    onInput: (e) => updateSelectedText({ fontSize: Number(e.target.value) }),
  });

  const sizeLabel = h('span', { class: 'settings-value' }, '80px');
  sizeInput.addEventListener('input', () => {
    sizeLabel.textContent = `${sizeInput.value}px`;
  });

  const colorInput = h('input', {
    type: 'color',
    value: '#ffffff',
    onInput: (e) => updateSelectedText({ color: e.target.value }),
  });

  const boldBtn = h('button', {
    class: 'sidebar-btn',
    style: { fontWeight: 'bold', flex: '0 0 auto', width: '36px' },
    onClick: () => {
      boldBtn.classList.toggle('active');
      updateSelectedText({ bold: boldBtn.classList.contains('active') });
    },
  }, 'B');

  const italicBtn = h('button', {
    class: 'sidebar-btn',
    style: { fontStyle: 'italic', flex: '0 0 auto', width: '36px' },
    onClick: () => {
      italicBtn.classList.toggle('active');
      updateSelectedText({ italic: italicBtn.classList.contains('active') });
    },
  }, 'I');

  const deleteBtn = h('button', {
    class: 'btn',
    style: { width: '100%', justifyContent: 'center', color: '#ef4444', borderColor: '#fecaca' },
    onClick: deleteSelectedText,
  }, 'Delete Text');

  const controls = h('div', { class: 'text-controls', style: { display: 'none' } },
    h('div', { class: 'settings-row' },
      h('div', { class: 'settings-label' }, h('span', {}, 'Font')),
      fontSelect,
    ),
    h('div', { class: 'settings-row' },
      h('div', { class: 'settings-label' }, h('span', {}, 'Size'), sizeLabel),
      sizeInput,
    ),
    h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
      h('div', { class: 'settings-label', style: { flex: '1' } },
        h('span', {}, 'Color'),
        colorInput,
      ),
      boldBtn,
      italicBtn,
    ),
    deleteBtn,
  );

  const container = h('div', { class: 'sidebar-section' },
    h('h3', { class: 'sidebar-heading' }, 'Text'),
    addBtn,
    controls,
  );

  function addText() {
    const id = uid('text');
    const overlay = {
      id,
      text: 'Your Text',
      x: 0.5,
      y: 0.5,
      fontSize: 80,
      fontFamily: FONTS[0].value,
      color: '#ffffff',
      bold: false,
      italic: false,
    };
    const state = Store.getState();
    Store.set({ textOverlays: [...state.textOverlays, overlay] });
    selectText(id);
  }

  function selectText(id) {
    selectedTextId = id;
    const overlay = Store.getState().textOverlays.find((t) => t.id === id);
    if (!overlay) {
      controls.style.display = 'none';
      return;
    }
    controls.style.display = 'flex';
    controls.style.flexDirection = 'column';
    controls.style.gap = '8px';
    fontSelect.value = overlay.fontFamily;
    sizeInput.value = overlay.fontSize;
    sizeLabel.textContent = `${overlay.fontSize}px`;
    colorInput.value = overlay.color;
    boldBtn.classList.toggle('active', overlay.bold);
    italicBtn.classList.toggle('active', overlay.italic);
  }

  function updateSelectedText(patch) {
    if (!selectedTextId) return;
    const state = Store.getState();
    const overlays = state.textOverlays.map((t) =>
      t.id === selectedTextId ? { ...t, ...patch } : t
    );
    Store.set({ textOverlays: overlays });
  }

  function deleteSelectedText() {
    if (!selectedTextId) return;
    const state = Store.getState();
    Store.set({ textOverlays: state.textOverlays.filter((t) => t.id !== selectedTextId) });
    selectedTextId = null;
    controls.style.display = 'none';
  }

  // Expose selectText for external use (e.g., clicking on text in canvas)
  return { container, selectText };
}
