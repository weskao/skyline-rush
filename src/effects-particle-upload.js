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
