import { h } from '../utils/dom.js';
import { Store } from '../core/Store.js';
import { createSlider } from './components/Slider.js';
import { createColorPicker } from './components/ColorPicker.js';

export function createSettingsPanel() {
  const state = Store.getState();

  const spacingSlider = createSlider({
    label: 'Spacing',
    min: 0,
    max: 20,
    value: state.spacingMM,
    step: 0.5,
    unit: 'mm',
    onChange: (v) => Store.set({ spacingMM: v }),
  });

  const paddingSlider = createSlider({
    label: 'Padding',
    min: 0,
    max: 20,
    value: state.outerPaddingMM,
    step: 0.5,
    unit: 'mm',
    onChange: (v) => Store.set({ outerPaddingMM: v }),
  });

  const radiusSlider = createSlider({
    label: 'Corner Radius',
    min: 0,
    max: 15,
    value: state.borderRadiusMM,
    step: 0.5,
    unit: 'mm',
    onChange: (v) => Store.set({ borderRadiusMM: v }),
  });

  const bgColor = createColorPicker({
    label: 'Background',
    value: state.backgroundColor,
    onChange: (v) => Store.set({ backgroundColor: v }),
  });

  const container = h('div', { class: 'sidebar-section' },
    h('h3', { class: 'sidebar-heading' }, 'Style'),
    spacingSlider.container,
    paddingSlider.container,
    radiusSlider.container,
    bgColor.container,
  );

  return { container };
}
