import { Store } from './Store.js';

const MAX_HISTORY = 50;
const undoStack = [];
const redoStack = [];

let ignoreNext = false;

/**
 * Push current state to undo stack before a change.
 * Call this before Store.set() for undoable actions.
 */
export function pushUndo() {
  if (ignoreNext) {
    ignoreNext = false;
    return;
  }
  undoStack.push(Store.snapshot());
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack.length = 0;
}

export function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(Store.snapshot());
  const prev = undoStack.pop();
  ignoreNext = true;
  Store.restoreSnapshot(prev);
}

export function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(Store.snapshot());
  const next = redoStack.pop();
  ignoreNext = true;
  Store.restoreSnapshot(next);
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}
