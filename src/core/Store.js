import { PAPER_SIZES, DEFAULT_PAPER, DEFAULTS } from './constants.js';

const paper = PAPER_SIZES.find((p) => p.id === DEFAULT_PAPER);

const initialState = {
  // Paper / canvas
  paperId: DEFAULT_PAPER,
  canvasWidth: paper.widthPx,
  canvasHeight: paper.heightPx,

  // Layout
  layoutType: DEFAULTS.layoutType,
  gridTemplate: DEFAULTS.gridTemplate,

  // Style (values in millimeters — converted to px at render/layout time)
  spacingMM: DEFAULTS.spacingMM,
  outerPaddingMM: DEFAULTS.outerPaddingMM,
  borderRadiusMM: DEFAULTS.borderRadiusMM,
  backgroundColor: DEFAULTS.backgroundColor,

  // Photos
  photos: [],

  // Text overlays
  textOverlays: [],

  // Computed cells (set by layout engine)
  cells: [],

  // Interaction state (not persisted to history)
  selectedCellId: null,
  hoveredCellId: null,
};

let state = structuredClone(initialState);
const subscribers = new Map();
let subId = 0;

function notify() {
  for (const [, { selector, callback }] of subscribers) {
    try {
      callback(selector ? selector(state) : state);
    } catch (e) {
      console.error('Store subscriber error:', e);
    }
  }
}

export const Store = {
  getState() {
    return state;
  },

  /**
   * Update one or more state keys.
   * @param {Partial<typeof initialState>} patch
   */
  set(patch) {
    state = { ...state, ...patch };
    notify();
  },

  /**
   * Replace the entire state (used by undo/redo).
   */
  replaceState(newState) {
    state = newState;
    notify();
  },

  /**
   * Subscribe to state changes.
   * @param {Function|null} selector - optional selector; if null, passes full state
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  subscribe(selector, callback) {
    if (typeof selector === 'function' && callback === undefined) {
      callback = selector;
      selector = null;
    }
    const id = ++subId;
    subscribers.set(id, { selector, callback });
    return () => subscribers.delete(id);
  },

  /**
   * Get a snapshot of state suitable for history (excludes transient UI state).
   */
  snapshot() {
    const { selectedCellId, hoveredCellId, ...rest } = state;
    return structuredClone(rest);
  },

  /**
   * Restore a history snapshot.
   */
  restoreSnapshot(snap) {
    state = { ...snap, selectedCellId: null, hoveredCellId: null };
    notify();
  },
};
