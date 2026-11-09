import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MEASURED_COURSE_IDS, createMeasuredCourseScenes } from '../src/measured-course-scenes.ts';

test('Stormline, Volcanic and Monsoon race scenes mount lazily, one at a time, and dispose', () => {
  assert.deepEqual([...MEASURED_COURSE_IDS].sort(), ['monsoon-ruins', 'stormline-megacity', 'volcanic-crown']);
  const scene = new THREE.Scene();
  const scenes = createMeasuredCourseScenes(scene);
  scenes.update('coast', 0, 0, false);
  assert.equal(scene.children.length, 0, 'a classic track builds no course scene');
  scenes.update('monsoon-ruins', 100, 0, false);
  assert.equal(scene.children.length, 1);
  const monsoon = scene.children[0];
  assert.equal(monsoon.visible, true);
  scenes.update('volcanic-crown', 100, 0, false);
  assert.equal(scene.children.length, 2);
  assert.equal(monsoon.visible, false, 'switching tracks hides the previous course');
  scenes.update('coast', 0, 0, false);
  assert.ok(scene.children.every(child => !child.visible), 'a classic track hides every course scene');
  scenes.dispose();
  assert.equal(scene.children.length, 0, 'dispose removes every mounted course scene');
});
