import { h } from '../../utils/dom.js';

/**
 * Create a labeled slider with value display.
 * @param {Object} opts
 * @param {string} opts.label
 * @param {number} opts.min
 * @param {number} opts.max
 * @param {number} opts.value
 * @param {number} [opts.step]
 * @param {string} [opts.unit]
 * @param {(value: number) => void} opts.onChange
 * @returns {{ container: HTMLElement, setValue: (v: number) => void }}
 */
export function createSlider({ label, min, max, value, step = 1, unit = 'px', onChange }) {
  const valueDisplay = h('span', { class: 'settings-value' }, `${value}${unit}`);

  const input = h('input', {
    type: 'range',
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value),
    onInput: (e) => {
      const v = Number(e.target.value);
      valueDisplay.textContent = `${v}${unit}`;
      onChange(v);
    },
  });

  const container = h('div', { class: 'settings-row' },
    h('div', { class: 'settings-label' },
      h('span', {}, label),
      valueDisplay,
    ),
    input,
  );

  function setValue(v) {
    input.value = String(v);
    valueDisplay.textContent = `${v}${unit}`;
  }

  return { container, setValue };
}
