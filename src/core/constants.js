/**
 * Paper sizes at 300 DPI.
 * Each entry has: label, widthMM, heightMM, widthPx, heightPx
 */
export const PAPER_SIZES = [
  { id: 'a4-portrait',  label: 'A4 Portrait',  widthMM: 210, heightMM: 297, widthPx: 2480, heightPx: 3508 },
  { id: 'a4-landscape', label: 'A4 Landscape', widthMM: 297, heightMM: 210, widthPx: 3508, heightPx: 2480 },
  { id: 'a3-portrait',  label: 'A3 Portrait',  widthMM: 297, heightMM: 420, widthPx: 3508, heightPx: 4961 },
  { id: 'a3-landscape', label: 'A3 Landscape', widthMM: 420, heightMM: 297, widthPx: 4961, heightPx: 3508 },
  { id: 'a2-portrait',  label: 'A2 Portrait',  widthMM: 420, heightMM: 594, widthPx: 4961, heightPx: 7016 },
  { id: 'a2-landscape', label: 'A2 Landscape', widthMM: 594, heightMM: 420, widthPx: 7016, heightPx: 4961 },
  { id: 'square',       label: 'Square',       widthMM: 297, heightMM: 297, widthPx: 3508, heightPx: 3508 },
];

export const DEFAULT_PAPER = 'a3-portrait';

export const LAYOUT_TYPES = {
  GRID: 'grid',
  BRICK: 'brick',
  FREEFORM: 'freeform',
};

// Defaults are in millimeters — converted to pixels at render/layout time
export const DEFAULTS = {
  spacingMM: 3,        // 3mm gap between photos
  outerPaddingMM: 3,   // 3mm outer margin
  borderRadiusMM: 0,   // 0mm corner radius
  backgroundColor: '#ffffff',
  layoutType: LAYOUT_TYPES.GRID,
  gridTemplate: null, // null = auto
};

export const DPI = 300;

/**
 * Convert millimeters to pixels at 300 DPI.
 * 1 inch = 25.4mm, so 1mm = DPI / 25.4 pixels.
 */
export const MM_TO_PX = DPI / 25.4; // ~11.811

export function mmToPx(mm) {
  return Math.round(mm * MM_TO_PX);
}
