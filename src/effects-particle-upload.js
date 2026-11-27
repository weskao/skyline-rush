// Queue a partial GPU upload of items [first, first + count). Keeps at most two pending ranges per attribute (a wrapped
// ring span needs two): a new range widens an overlapping/adjacent pending one, else the nearer one once two are
// pending, so a layer that is not rendered for a while (pause, hidden scene) stays bounded until three uploads and
// clears them (WebGLAttributes.updateBuffer sorts, merges and uploads each remaining range with one bufferSubData).
export function markRange(attribute, first, count) {
  const start = first * attribute.itemSize, end = (first + count) * attribute.itemSize, ranges = attribute.updateRanges;
  let near = null, nearGap = Infinity;
  for (const range of ranges) {
    const gap = Math.max(range.start - end, start - range.start - range.count, 0);
    if (gap < nearGap) { near = range; nearGap = gap; }
  }
  if (near && (nearGap === 0 || ranges.length >= 2)) {
    const from = Math.min(near.start, start);
    near.count = Math.max(near.start + near.count, end) - from;
    near.start = from;
  } else attribute.addUpdateRange(start, end - start);
  attribute.needsUpdate = true;
}

// Conservative span of ring-pool slots that may be alive: [first, last] minus one dead hole [holeFirst, holeLast]
// (empty: -1, -2). Once the emission cursor wraps, the live slots sit at both ends of the ring and the hole is the
// dead middle, so the span stays two short arcs instead of the whole ring. Each frame the owner rewrites only the span
// (`for (i = first; i <= last; i = next(i))`), reports every slot still alive with `live(i)` in ascending order, then
// `commit` queues the upload of what it rewrote and, given a `geometry`, narrows drawing to [first live, last live]
// (one draw range: slot order = draw order). `vertices`: vertices per slot. Slots outside the span hold alpha 0 on
// the GPU (they died inside an uploaded span), so skipping them is exact.
export function createLiveSpan(capacity, attributes, { geometry = null, vertices = 1 } = {}) {
  // A hole smaller than this costs an extra bufferSubData per attribute for few bytes: rewrite it instead.
  const minHole = Math.max(2, capacity >> 3);
  let liveFirst = capacity, liveLast = -1, gapFirst = -1, gapLast = -2; // this frame's live bounds and widest dead gap
  const upload = (first, last) => {
    for (const attribute of attributes) markRange(attribute, first * vertices, (last - first + 1) * vertices);
  };
  geometry?.setDrawRange(0, 0);
  const span = {
    first: capacity, last: -1, holeFirst: -1, holeLast: -2,
    add(slot) {
      if (slot < span.first) span.first = slot;
      if (slot > span.last) span.last = slot;
      // An emission inside the hole: keep only the hole part above it (the cursor fills the hole from its start).
      if (slot >= span.holeFirst && slot <= span.holeLast) {
        span.holeFirst = slot + 1;
        if (span.holeFirst > span.holeLast) { span.holeFirst = -1; span.holeLast = -2; }
      }
    },
    next: i => i + 1 === span.holeFirst ? span.holeLast + 1 : i + 1,
    live(i) {
      if (liveLast < 0) liveFirst = i;
      else if (i - liveLast - 1 > gapLast - gapFirst + 1) { gapFirst = liveLast + 1; gapLast = i - 1; }
      liveLast = i;
    },
    commit() {
      if (span.last >= span.first) {
        if (span.holeLast >= span.holeFirst) { upload(span.first, span.holeFirst - 1); upload(span.holeLast + 1, span.last); }
        else upload(span.first, span.last);
      }
      const any = liveLast >= 0, hole = gapLast - gapFirst + 1 >= minHole;
      span.first = any ? liveFirst : capacity; span.last = liveLast;
      span.holeFirst = hole ? gapFirst : -1; span.holeLast = hole ? gapLast : -2;
      geometry?.setDrawRange(any ? liveFirst * vertices : 0, any ? (liveLast - liveFirst + 1) * vertices : 0);
      liveFirst = capacity; liveLast = -1; gapFirst = -1; gapLast = -2;
    },
    // Everything dead: the caller zeroed `alpha`, which is uploaded whole.
    clear(alpha) {
      span.first = capacity; span.last = -1; span.holeFirst = -1; span.holeLast = -2;
      liveFirst = capacity; liveLast = -1; gapFirst = -1; gapLast = -2;
      geometry?.setDrawRange(0, 0); markRange(alpha, 0, alpha.count);
    },
  };
  return span;
}
