import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Mesh, Group, BoxGeometry, MeshBasicMaterial, PointLight } from 'three';
import { warmupShaders } from '../src/shader-warmup.js';

test('warmup draws hidden and culled objects once into the given target, then restores them', () => {
  const scene = new Scene(), hidden = new Mesh(new BoxGeometry(), new MeshBasicMaterial()), parent = new Group();
  const culled = new Mesh(new BoxGeometry(), new MeshBasicMaterial()), nested = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  const lamp = new PointLight();
  hidden.visible = parent.visible = lamp.visible = false; nested.frustumCulled = false;
  parent.add(nested); scene.add(hidden, culled, parent, lamp);
  const target = {}, calls = [];
  const renderer = {
    setRenderTarget: t => calls.push(['target', t]),
    render: () => calls.push(['render', [hidden, parent, culled, nested, lamp].map(o => o.visible && !o.frustumCulled)]),
  };
  const touched = warmupShaders(renderer, scene, {}, target);
  assert.deepEqual(calls, [['target', target], ['render', [true, true, true, true, false]], ['target', null]]);
  assert.equal(touched, 4, 'the scene itself and every object that was hidden or culled; the hidden light is left alone');
  assert.ok(!hidden.visible && !parent.visible && nested.visible && culled.visible, 'visibility restored');
  assert.ok(hidden.frustumCulled && culled.frustumCulled && !nested.frustumCulled, 'culling restored');
});
