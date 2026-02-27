import { LAYOUT_TYPES, mmToPx } from '../core/constants.js';
import { computeGridLayout } from './GridLayout.js';
import { computeBrickLayout } from './BrickLayout.js';
import { computeFreeformLayout } from './FreeformLayout.js';

/**
 * Compute the cell layout based on current state.
 * Converts mm values to px before passing to layout algorithms.
 */
export function computeLayout(state) {
  const { photos, canvasWidth, canvasHeight, spacingMM, outerPaddingMM, layoutType, gridTemplate } = state;

  const spacing = mmToPx(spacingMM);
  const padding = mmToPx(outerPaddingMM);

  switch (layoutType) {
    case LAYOUT_TYPES.BRICK:
      return computeBrickLayout(photos, canvasWidth, canvasHeight, spacing, padding);
    case LAYOUT_TYPES.FREEFORM:
      return computeFreeformLayout(photos, canvasWidth, canvasHeight, spacing, padding);
    case LAYOUT_TYPES.GRID:
    default:
      return computeGridLayout(photos, canvasWidth, canvasHeight, spacing, padding, gridTemplate);
  }
}
