/**
 * Predefined grid templates.
 * Each template defines rows × cols and optionally cell spans.
 * For now, simple uniform grids. Can be extended with complex spans later.
 */
export const GRID_TEMPLATES = [
  { id: '1x1', label: '1', rows: 1, cols: 1 },
  { id: '1x2', label: '1×2', rows: 1, cols: 2 },
  { id: '2x1', label: '2×1', rows: 2, cols: 1 },
  { id: '2x2', label: '2×2', rows: 2, cols: 2 },
  { id: '1x3', label: '1×3', rows: 1, cols: 3 },
  { id: '3x1', label: '3×1', rows: 3, cols: 1 },
  { id: '2x3', label: '2×3', rows: 2, cols: 3 },
  { id: '3x2', label: '3×2', rows: 3, cols: 2 },
  { id: '3x3', label: '3×3', rows: 3, cols: 3 },
  { id: '3x4', label: '3×4', rows: 3, cols: 4 },
  { id: '4x3', label: '4×3', rows: 4, cols: 3 },
  { id: '4x4', label: '4×4', rows: 4, cols: 4 },
];
