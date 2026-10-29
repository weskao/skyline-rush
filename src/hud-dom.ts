// The hot HUD runs every animation frame. Avoid redundant DOM setters without
// introducing Vue reactivity or changing the rendered value.
export function setTextIfChanged(node: Pick<Node, 'textContent'>, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

export function setHiddenIfChanged(node: Pick<HTMLElement, 'hidden'>, hidden: boolean): void {
  if (node.hidden !== hidden) node.hidden = hidden;
}

/** getAnimations() forces a style flush; an idle node skips it until it has started an animation again. */
export function createAnimationGate(node: Pick<Element, 'animate' | 'getAnimations'>) {
  let live = false;
  return {
    animate(...args: Parameters<Element['animate']>): Animation { live = true; return node.animate(...args); },
    cancel(): void { if (!live) return; live = false; node.getAnimations().forEach(animation => animation.cancel()); },
  };
}
