// The hot HUD runs every animation frame. Avoid redundant DOM setters without
// introducing Vue reactivity or changing the rendered value.
export function setTextIfChanged(node: Pick<Node, 'textContent'>, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

export function setHiddenIfChanged(node: Pick<HTMLElement, 'hidden'>, hidden: boolean): void {
  if (node.hidden !== hidden) node.hidden = hidden;
}
