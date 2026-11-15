/** CSS-pixel viewport segments; no device/OS sniffing or required Foldable API. */
export interface FoldableRect { left: number; top: number; width: number; height: number }
export interface FoldablePoint { x: number; y: number }
export interface FoldableSize { width: number; height: number }
export interface FoldableLayout {
  axis: 'vertical' | 'horizontal';
  segments: readonly [FoldableRect, FoldableRect];
  hinge: FoldableRect;
}

const isRect = (value: unknown): value is FoldableRect => {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return ['left', 'top', 'width', 'height'].every(key => typeof r[key] === 'number' && Number.isFinite(r[key])) &&
    (r.width as number) > 0 && (r.height as number) > 0;
};

/** Null means ordinary responsive phone/tablet behavior; never synthesize a hinge from width. */
export function resolveFoldableLayout(viewport: FoldableSize, raw: unknown): FoldableLayout | null {
  if (!Array.isArray(raw) || raw.length !== 2 || !raw.every(isRect) ||
      !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) return null;
  const [first, second] = raw as FoldableRect[];
  if (raw.some((r: FoldableRect) => r.left < 0 || r.top < 0 || r.left + r.width > viewport.width + 1 || r.top + r.height > viewport.height + 1)) return null;
  const [a, b] = [first, second].sort((x, y) => x.left - y.left || x.top - y.top);
  const sideBySide = a.left + a.width <= b.left && Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
  if (sideBySide) return { axis: 'vertical', segments: [a, b],
    hinge: { left: a.left + a.width, top: Math.max(a.top, b.top), width: b.left - a.left - a.width, height: Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) } };
  const [top, bottom] = [first, second].sort((x, y) => x.top - y.top);
  const stacked = top.top + top.height <= bottom.top && Math.min(top.left + top.width, bottom.left + bottom.width) > Math.max(top.left, bottom.left);
  if (!stacked) return null;
  return { axis: 'horizontal', segments: [top, bottom],
    hinge: { left: Math.max(top.left, bottom.left), top: top.top + top.height,
      width: Math.min(top.left + top.width, bottom.left + bottom.width) - Math.max(top.left, bottom.left),
      height: bottom.top - top.top - top.height } };
}

/** Project a control centre into the nearest full-sized panel, leaving an 8px gesture margin. */
export function placeInVisibleSegment(point: FoldablePoint, button: FoldableSize, layout: FoldableLayout | null): FoldablePoint {
  if (!layout) return point;
  const padX = Math.max(22, button.width / 2) + 8;
  const padY = Math.max(22, button.height / 2) + 8;
  const candidates = layout.segments.filter(r => r.width >= padX * 2 && r.height >= padY * 2)
    .map(r => ({ x: Math.max(r.left + padX, Math.min(r.left + r.width - padX, point.x)),
      y: Math.max(r.top + padY, Math.min(r.top + r.height - padY, point.y)) }));
  if (!candidates.length) return point;
  return candidates.reduce((nearest, candidate) =>
    (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2 < (nearest.x - point.x) ** 2 + (nearest.y - point.y) ** 2 ? candidate : nearest);
}

interface SegmentSource {
  innerWidth: number;
  innerHeight: number;
  viewport?: { segments?: unknown } | null;
  visualViewport?: (VisualViewport & { segments?: unknown }) | { segments: unknown } | null;
  getWindowSegments?(): unknown;
}

export function viewportFoldableLayout(source: SegmentSource): FoldableLayout | null {
  const size = { width: source.innerWidth, height: source.innerHeight };
  for (const read of [() => source.viewport?.segments, () => source.visualViewport && 'segments' in source.visualViewport
    ? source.visualViewport.segments : undefined, () => source.getWindowSegments?.()]) {
    try {
      const segments = read();
      // An explicit single segment is the current viewport, even if an older API still reports a split.
      if (Array.isArray(segments) && segments.length === 1 && isRect(segments[0])) return null;
      const layout = resolveFoldableLayout(size, segments);
      if (layout) return layout;
    } catch { /* A browser can report unavailable geometry during the transition. */ }
  }
  return null;
}
