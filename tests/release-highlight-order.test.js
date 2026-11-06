import test from 'node:test';
import assert from 'node:assert/strict';
import { RELEASE_NOTES, highlightsByKind } from '../src/release-notes.ts';

test('each release lists NEW first, then improvements, then fixes, keeping the written order within a kind', () => {
  const highlights = [
    { id: 'fix-a', kind: 'fix' }, { id: 'better', kind: 'improvement' }, { id: 'new-a', kind: 'new' },
    { id: 'fix-b', kind: 'fix' }, { id: 'new-b', kind: 'new' },
  ];
  assert.deepEqual(highlightsByKind(highlights).map(h => h.id), ['new-a', 'new-b', 'better', 'fix-a', 'fix-b']);
  assert.deepEqual(highlights.map(h => h.id), ['fix-a', 'better', 'new-a', 'fix-b', 'new-b'], 'the shipped notes are never reordered in place');
});

test('inside a kind, clip entries come first, then picture entries, then text-only; ties keep the written order', () => {
  const clip = { desktop: { src: 'a.mp4', poster: 'a.png' }, mobile: { src: 'b.mp4', poster: 'b.png' } };
  const highlights = [
    { id: 'fix-text', kind: 'fix' }, { id: 'fix-clip', kind: 'fix', image: 'f.png', video: clip },
    { id: 'new-text-a', kind: 'new', image: null }, { id: 'new-image', kind: 'new', image: 'n.png' },
    { id: 'new-text-b', kind: 'new', video: null }, { id: 'new-clip', kind: 'new', video: clip },
    { id: 'new-image-b', kind: 'new', image: { en: 'n.png' } },
  ];
  assert.deepEqual(highlightsByKind(highlights).map(h => h.id),
    ['new-clip', 'new-image', 'new-image-b', 'new-text-a', 'new-text-b', 'fix-clip', 'fix-text']);
});

test('a kind the order does not know yet goes last instead of jumping ahead of NEW', () => {
  assert.deepEqual(highlightsByKind([{ id: 'odd', kind: 'event' }, { id: 'fix', kind: 'fix' }, { id: 'new', kind: 'new' }]).map(h => h.id), ['new', 'fix', 'odd']);
});

test('every shipped release shows NEW first, then improvements, then fixes', () => {
  const rank = kind => ({ new: 0, improvement: 1, fix: 2 })[kind] ?? 3;
  for (const release of RELEASE_NOTES) {
    const kinds = highlightsByKind(release.highlights).map(h => h.kind);
    assert.equal(kinds.lastIndexOf('new'), kinds.filter(k => k === 'new').length - 1, release.version);
    assert.deepEqual(kinds.map(rank), kinds.map(rank).sort((a, b) => a - b), release.version);
  }
});
