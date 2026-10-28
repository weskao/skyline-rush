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

test('a kind the order does not know yet goes last instead of jumping ahead of NEW', () => {
  assert.deepEqual(highlightsByKind([{ id: 'odd', kind: 'event' }, { id: 'fix', kind: 'fix' }, { id: 'new', kind: 'new' }]).map(h => h.id), ['new', 'fix', 'odd']);
});

test('every shipped release shows its NEW highlights before anything else', () => {
  for (const release of RELEASE_NOTES) {
    const kinds = highlightsByKind(release.highlights).map(h => h.kind);
    assert.equal(kinds.lastIndexOf('new'), kinds.filter(k => k === 'new').length - 1, release.version);
  }
});
