import { h } from '../../utils/dom.js';

const PRESET_COLORS = [
  '#ffffff', '#000000', '#f8fafc', '#e2e8f0',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

/**
 * Create a color picker with preset swatches.
 * @param {Object} opts
 * @param {string} opts.label
 * @param {string} opts.value
 * @param {(color: string) => void} opts.onChange
 * @returns {{ container: HTMLElement, setValue: (v: string) => void }}
 */
export function createColorPicker({ label, value, onChange }) {
  const colorInput = h('input', {
    type: 'color',
    value,
    onInput: (e) => {
      onChange(e.target.value);
      updateActiveSwatches(e.target.value);
    },
  });

  const swatches = PRESET_COLORS.map((color) => {
    const swatch = h('button', {
      class: 'color-swatch',
      style: { backgroundColor: color },
      title: color,
      onClick: () => {
        colorInput.value = color;
        onChange(color);
        updateActiveSwatches(color);
      },
    });
    return swatch;
  });

  function updateActiveSwatches(activeColor) {
    swatches.forEach((s, i) => {
      s.classList.toggle('active', PRESET_COLORS[i] === activeColor);
    });
  }

  const container = h('div', { class: 'settings-row' },
    h('div', { class: 'settings-label' },
      h('span', {}, label),
      colorInput,
    ),
    h('div', { class: 'color-swatches' }, ...swatches),
  );

  function setValue(v) {
    colorInput.value = v;
    updateActiveSwatches(v);
  }

  updateActiveSwatches(value);

  return { container, setValue };
}
