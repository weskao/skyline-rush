import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { coastRoadFiles, coastRoadTier, coastWetness, createCoastRoadMaterial } from '../src/coast-road-material.ts';
import { MATERIAL_MANIFEST, TIERS, gpuBytesEstimate } from '../src/material-manifest.ts';

const maps = () => ({ baseColor: new THREE.Texture(), normal: new THREE.Texture(), packed: new THREE.Texture() });
const standardShader = () => ({ uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms),
  vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader });

test('Coast road texture tier (task 5): Low keeps the procedural road, Medium 1K, High 2K, Ultra 2K plus detail normal', () => {
  assert.equal(coastRoadTier('low', false), null);
  assert.equal(coastRoadTier('low', true), null, 'Ultra flag never overrides an explicit Low');
  assert.equal(coastRoadTier('medium', false), 'medium');
  assert.equal(coastRoadTier('high', false), 'high');
  assert.equal(coastRoadTier('high', true), 'ultra');
  assert.deepEqual([TIERS.medium, TIERS.high, TIERS.ultra], [1024, 2048, 2048]);
  const files = coastRoadFiles(2048);
  assert.deepEqual(Object.keys(files).sort(), ['baseColor', 'normal', 'packed']);
  for (const file of Object.values(files)) assert.equal(file.resolution, 2048);
  const budget = MATERIAL_MANIFEST['coast-asphalt'].budgets.gpuBytes;
  assert.ok(gpuBytesEstimate(1024) <= budget.medium && gpuBytesEstimate(2048) <= budget.high, 'within the recorded texture-memory budget');
});

test('Ultra adds a detail normal from the same map: no extra texture, its own program built before GO', () => {
  const m = maps(), plain = createCoastRoadMaterial(maps()), detail = createCoastRoadMaterial(m, 1, { detail: true });
  assert.equal(detail.material.normalMap, m.normal, 'one normal texture');
  assert.notEqual(detail.material.customProgramCacheKey(), plain.material.customProgramCacheKey());
  const a = standardShader(), b = standardShader();
  plain.material.onBeforeCompile(a, null);
  detail.material.onBeforeCompile(b, null);
  assert.doesNotMatch(a.fragmentShader, /detailN/);
  const frag = b.fragmentShader, at = frag.indexOf('detailN');
  assert.match(frag, /texture2D\( normalMap, vNormalMapUv \* [\d.]+ \)/, 'resamples the asphalt normal at a finer scale');
  assert.ok(at > frag.indexOf('#include <normal_fragment_maps>') && at < frag.indexOf('nonPerturbedNormal', at), 'standing water still flattens the detail');
});

test('wetness follows the Coast weather: rain soaks the road, dusk is damp, day is dry', () => {
  assert.equal(coastWetness('track'), 0);
  assert.equal(coastWetness('day'), 0);
  assert.ok(coastWetness('rain') >= .7);
  assert.ok(coastWetness('dusk') > .15 && coastWetness('dusk') < coastWetness('rain'));
  assert.ok(coastWetness('fog') > 0 && coastWetness('fog') < coastWetness('rain'));
  assert.equal(coastWetness('unknown-preset'), 0);
});

test('asphalt maps: sRGB base colour, linear normal and packed AO/roughness/puddle, repeating along the road', () => {
  const m = maps(), road = createCoastRoadMaterial(m);
  const { material } = road;
  assert.equal(material.map, m.baseColor);
  assert.equal(m.baseColor.colorSpace, THREE.SRGBColorSpace);
  assert.equal(m.normal.colorSpace, THREE.NoColorSpace);
  assert.equal(m.packed.colorSpace, THREE.NoColorSpace);
  assert.equal(material.normalMap, m.normal);
  assert.equal(material.aoMap, m.packed, 'packed.r = ambient occlusion');
  assert.equal(material.roughnessMap, m.packed, 'packed.g = roughness (three reads G)');
  assert.equal(material.metalness, 0);
  for (const t of Object.values(m)) {
    assert.equal(t.wrapS, THREE.RepeatWrapping);
    assert.equal(t.wrapT, THREE.RepeatWrapping);
    assert.equal(t.flipY, false, 'KTX2 rows are written v = 0 first');
  }
});

test('wetness is a uniform: changing the weather never recompiles the road program', () => {
  const road = createCoastRoadMaterial(maps());
  const key = road.material.customProgramCacheKey(), version = road.material.version;
  road.setWetness(.9);
  assert.equal(road.material.customProgramCacheKey(), key);
  assert.equal(road.material.version, version);
  const shader = standardShader();
  road.material.onBeforeCompile(shader, null);
  assert.equal(shader.uniforms.wetness.value, .9, 'the program reads the live uniform');
  road.setWetness(0);
  assert.equal(shader.uniforms.wetness.value, 0);
});

test('wet road adds the lights-only mirror (wet-reflection.ts) through uniforms: one program, no NaN path', () => {
  const reflection = { reflectMap: { value: new THREE.Texture() }, reflectMatrix: { value: new THREE.Matrix4() }, reflectStrength: { value: 0 } };
  const road = createCoastRoadMaterial(maps(), 1, { reflection }), shader = standardShader();
  const key = road.material.customProgramCacheKey();
  road.material.onBeforeCompile(shader, null);
  assert.equal(shader.uniforms.reflectMap, reflection.reflectMap, 'shared uniform objects: the mirror pass updates them in place');
  assert.equal(shader.uniforms.reflectStrength, reflection.reflectStrength);
  assert.match(shader.vertexShader, /vReflectUv = reflectMatrix \* modelMatrix/);
  const frag = shader.fragmentShader, opaque = frag.indexOf('#include <opaque_fragment>'), add = frag.indexOf('outgoingLight +=');
  assert.ok(add > frag.indexOf('#include <lights_fragment_end>') && add < opaque, 'added after lighting, before output');
  assert.match(frag, /max\( vReflectUv\.w, 1e-4 \)/, 'no divide by zero behind the mirror camera');
  assert.doesNotMatch(frag.slice(frag.indexOf('#include <roughnessmap_fragment>')), /\b(pow|exp)\s*\(/);
  reflection.reflectStrength.value = .7;
  assert.equal(road.material.customProgramCacheKey(), key, 'strength is a uniform: no recompile between dry and wet');
  const medium = createCoastRoadMaterial(maps()), plain = standardShader();
  medium.material.onBeforeCompile(plain, null);
  assert.equal(plain.uniforms.reflectStrength.value, 0, 'without a mirror the same shader adds nothing');
});

test('wet asphalt reads wet: darker and glossier than the first pass, puddles near mirror', () => {
  const road = createCoastRoadMaterial(maps()), shader = standardShader();
  road.material.onBeforeCompile(shader, null);
  assert.match(shader.fragmentShader, /roughnessFactor \* \.4, wetness/);
  assert.match(shader.fragmentShader, /mix\( 1\., \.5, wetness \)/);
});

test('puddles stay glossy, not mirror-sharp: a sky-bright mirror reads as paint splashes on the road', () => {
  const road = createCoastRoadMaterial(maps()), shader = standardShader();
  road.material.onBeforeCompile(shader, null);
  const floor = Number(shader.fragmentShader.match(/mix\( roughnessFactor, ([\d.]+), puddle \)/)?.[1]);
  assert.ok(floor >= .15, `puddle roughness ${floor} blurs the reflected sky`);
  const [, lo, hi] = shader.fragmentShader.match(/smoothstep\( ([\d.]+), ([\d.]+), texelRoughness\.b \)/).map(Number);
  assert.ok(lo >= .4 && hi - lo >= .5, `puddle mask ${lo}..${hi}: fewer puddles with soft edges`);
});

test('wet shader: puddles from packed.b darken, smooth and flatten the asphalt', () => {
  const road = createCoastRoadMaterial(maps()), shader = standardShader();
  road.material.onBeforeCompile(shader, null);
  const frag = shader.fragmentShader;
  assert.match(frag, /uniform float wetness;/);
  const rough = frag.indexOf('#include <roughnessmap_fragment>'), puddle = frag.indexOf('texelRoughness.b');
  assert.ok(rough >= 0 && puddle > rough, 'puddle mask read after three samples the packed map');
  assert.ok(frag.indexOf('nonPerturbedNormal', frag.indexOf('#include <normal_fragment_maps>')) > 0, 'standing water flattens the normal map');
  assert.doesNotMatch(frag.slice(rough), /\b(pow|exp)\s*\(/, 'no pow/exp: no NaN texels from the wet path');
  assert.throws(() => road.material.onBeforeCompile({ ...shader, fragmentShader: 'void main(){}' }, null), /moved/, 'fails loudly if three renames the chunks');
});
