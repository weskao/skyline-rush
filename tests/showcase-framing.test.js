import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { createCarBounds } from '../src/car-bounds.ts';
import { CAR_STYLES, makeCar } from '../src/car-model.js';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { chooseShowcaseFraming } from '../src/showcase-framing.ts';
import { createSkyScene } from '../src/sky-scene.js';
import { trackFrame } from '../src/track-paths.ts';
import { HERO_PREVIEWS, SHOWCASE_BACKS, showcaseCameraPose } from '../src/track-preview.ts';
import { orientCarOnRoad } from '../src/vehicle-pose.ts';
import { createWorldTourScene } from '../src/world-tour-scene.js';

test('the home camera fits the Roadster and rebuilt landmarks on a portrait phone', () => {
  const scene = new Scene(), sky = createSkyScene(scene), tour = createWorldTourScene(scene);
  const player = makeCar(CAR_STYLES.roadster);
  const camera = new PerspectiveCamera(50, 390 / 844, .1, 3000), probe = camera.clone();
  const { projectedCarBounds, carCorner } = createCarBounds(probe, camera, player, () => null);
  scene.add(player);
  try {
    for (const id of ['spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']) {
      const { distance, landmark: kind } = HERO_PREVIEWS[id];
      if (id === 'spiral') sky.update(distance, 'low');
      else tour.update(id, distance, 'low', RACE_TRACKS[id].sections);
      const heroes = id === 'spiral' ? sky.landmarks() : tour.landmarks();
      const landmark = heroes.find(hero => hero.userData.landmarkKind === kind);
      assert.ok(landmark?.visible, id);
      const frame = trackFrame(id, distance);
      const right = new Vector3(...frame.right), axis = new Vector3(...frame.forward).negate();
      const pose = showcaseCameraPose(id, 'drive', 0, true);
      orientCarOnRoad(player, frame);
      for (const altitude of [0, 1.6]) {
        player.position.fromArray(frame.up).multiplyScalar(altitude);
        const eye = player.position.clone().addScaledVector(right, pose.cameraSide).addScaledVector(axis, pose.cameraBack);
        const look = player.position.clone().addScaledVector(right, pose.lookSide).addScaledVector(axis, -pose.lookAhead);
        eye.y += pose.cameraHeight;
        look.y += pose.lookHeight - 1.6;
        projectedCarBounds(eye, look);
        const fit = chooseShowcaseFraming({
          eye, look, axis, right, landmark, probe, corner: carCorner, carBounds: projectedCarBounds,
          spin: value => value, turns: [0], backs: SHOWCASE_BACKS,
        });
        eye.addScaledVector(axis, fit.back);
        look.addScaledVector(right, fit.side).y -= fit.down;
        const car = projectedCarBounds(eye, look, false);
        assert.ok(Object.values(car).every(edge => Math.abs(edge) < .98), `${id} Roadster at ${altitude} m`);
        landmark.traverseVisible(object => {
          if (!object.isMesh) return;
          const position = object.geometry.attributes.position;
          for (let i = 0; i < position.count; i++) {
            carCorner.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).project(probe);
            assert.ok([carCorner.x, carCorner.y].every(edge => Math.abs(edge) < .98),
              `${id} landmark clips at ${altitude} m: ${carCorner.x.toFixed(2)} / ${carCorner.y.toFixed(2)}`);
          }
        });
      }
    }
  } finally {
    sky.dispose();
    tour.dispose();
  }
});
