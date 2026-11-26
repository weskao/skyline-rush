import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { visibleShowcaseMeshes, isOpaqueShowcaseMesh } from '../src/showcase-framing.ts';

test('showcase occlusion ignores hidden branches and transparent non-obstacles', () => {
  const root = new Group(), hidden = new Group();
  hidden.visible = false;
  const geometry = new BoxGeometry();
  const opaque = new MeshBasicMaterial(), ghost = new MeshBasicMaterial({ transparent: true, opacity: .2 });
  const water = new MeshBasicMaterial({ depthWrite: false });
  const visible = new Mesh(geometry, [ghost, opaque]), invisible = new Mesh(geometry, opaque);
  const glass = new Mesh(geometry, ghost), surface = new Mesh(geometry, water);
  hidden.add(invisible); root.add(visible, hidden, glass, surface);
  assert.deepEqual(visibleShowcaseMeshes(root), [visible, glass, surface]);
  assert.equal(isOpaqueShowcaseMesh(visible), true);
  assert.equal(isOpaqueShowcaseMesh(glass), false);
  assert.equal(isOpaqueShowcaseMesh(surface), false);
  assert.equal(isOpaqueShowcaseMesh(root), false);
  geometry.dispose(); opaque.dispose(); ghost.dispose(); water.dispose();
});
