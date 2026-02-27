let counter = 0;
export function uid(prefix = 'id') {
  return `${prefix}-${++counter}-${Math.random().toString(36).slice(2, 7)}`;
}
