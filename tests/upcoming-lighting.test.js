import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingShowcase } from '../src/upcoming-showcase.ts';
import { UPCOMING_ENVIRONMENTS } from '../src/upcoming-scenes/index.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';

test('all Coming Soon showcases keep combined scene and host lights within a readable range', () => {
  const room = new THREE.Texture(), carMap = new THREE.Texture();
  const stage = createUpcomingShowcase(UPCOMING_ENVIRONMENTS, room, carMap);
  try {
    for (const id of Object.keys(UPCOMING_TRACKS)) {
      assert.equal(stage.setTrack(id), true, id);
      stage.update(new THREE.PerspectiveCamera(), 8, { quality: 'high' }, false);
      let direct = 0, fill = 0, peakLocal = 0;
      stage.scene.traverse(object => {
        if (object.isDirectionalLight) direct += object.intensity;
        if (object.isHemisphereLight) fill += object.intensity;
        if (object.isPointLight) peakLocal = Math.max(peakLocal, object.intensity);
      });
      assert.ok(direct > 0 && direct <= 2, `${id} stacked key lights: ${direct}`);
      assert.ok(fill > 0 && fill <= 2, `${id} stacked fill lights: ${fill}`);
      assert.ok(peakLocal <= 140, `${id} local light blows out nearby surfaces: ${peakLocal}`);
      assert.ok(stage.scene.environmentIntensity <= .42, id);
      for (const car of stage.scene.children.filter(object => object.userData.body))
        assert.equal(car.userData.body.material.envMap, carMap, `${id} car should reflect the softened map`);
    }
  } finally {
    stage.dispose();
    room.dispose();
    carMap.dispose();
  }
});
