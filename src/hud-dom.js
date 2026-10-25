// The hot HUD runs every animation frame. Avoid redundant DOM setters without
// introducing Vue reactivity or changing the rendered value.
/**
 * @param {{ textContent: string | null }} node
 * @param {string} value
 */
export function setTextIfChanged(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

/**
 * @param {{ hidden: boolean }} node
 * @param {boolean} hidden
 */
export function setHiddenIfChanged(node, hidden) {
  if (node.hidden !== hidden) node.hidden = hidden;
}
