// The hot HUD runs every animation frame. Avoid redundant DOM setters without
// introducing Vue reactivity or changing the rendered value.
export function setTextIfChanged(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

export function setHiddenIfChanged(node, hidden) {
  if (node.hidden !== hidden) node.hidden = hidden;
}
