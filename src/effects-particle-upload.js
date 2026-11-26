// Queue a partial GPU upload of items [first, first + count). Widens one pending range instead of pushing more, so a
// layer that is not rendered for a while (pause, hidden scene) keeps exactly one bounded range until three uploads
// and clears it (WebGLAttributes.updateBuffer).
export function markRange(attribute, first, count) {
  const start = first * attribute.itemSize, end = (first + count) * attribute.itemSize, pending = attribute.updateRanges[0];
  if (pending) {
    const from = Math.min(pending.start, start);
    pending.count = Math.max(pending.start + pending.count, end) - from;
    pending.start = from;
  } else attribute.addUpdateRange(start, end - start);
  attribute.needsUpdate = true;
}

// Conservative [first, last] span of ring-pool slots that may be alive. The owner rewrites only that span each frame,
// then `commit` queues its upload and, given a `geometry`, narrows drawing to the slots still alive. `vertices`:
// vertices per slot. Slots outside the span hold alpha 0 on the GPU (they died inside an uploaded span), so skipping
// them is exact.
export function createLiveSpan(capacity, attributes, { geometry = null, vertices = 1 } = {}) {
  geometry?.setDrawRange(0, 0);
  const span = {
    first: capacity, last: -1,
    add(slot) { if (slot < span.first) span.first = slot; if (slot > span.last) span.last = slot; },
    commit(liveFirst, liveLast) {
      if (span.last >= span.first) {
        for (const attribute of attributes) markRange(attribute, span.first * vertices, (span.last - span.first + 1) * vertices);
      }
      const any = liveLast >= liveFirst;
      span.first = any ? liveFirst : capacity; span.last = any ? liveLast : -1;
      geometry?.setDrawRange(any ? liveFirst * vertices : 0, any ? (liveLast - liveFirst + 1) * vertices : 0);
    },
    // Everything dead: the caller zeroed `alpha`, which is uploaded whole.
    clear(alpha) { span.first = capacity; span.last = -1; geometry?.setDrawRange(0, 0); markRange(alpha, 0, alpha.count); },
  };
  return span;
}
