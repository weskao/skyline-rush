<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { createPickupGeometry, createPickupMaterial, PICKUP_SIZES, animatePickup } from './pickup-art.js';

const props = defineProps<{ tier: 'cell' | 'can' | 'tank' | 'overcharge' }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const ready = ref(false);
const movement = ref('paused');
const fallback = `${import.meta.env.BASE_URL}feature-assets/road-pickups/${props.tier}.svg`;
let disposePreview = () => {};

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  let renderer: THREE.WebGLRenderer | undefined;
  let geometry: THREE.BufferGeometry | undefined;
  let material: THREE.Material | undefined;
  let observer: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let motion: MediaQueryList | undefined;
  let frame = 0, visible = false;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    // Exactly the same THREE geometries and PBR materials as in effects.js on the road.
    geometry = createPickupGeometry(props.tier);
    material = createPickupMaterial(props.tier);
    const scene = new THREE.Scene();
    const mesh = new THREE.Mesh(geometry, material);
    const item = { tier: props.tier, distance: 0, altitude: 2 };
    scene.add(mesh);
    const key = new THREE.DirectionalLight(0xfff3df, 3);
    key.position.set(-3, 5, 7); scene.add(key);
    const edge = new THREE.DirectionalLight(0x84d9ff, 2.6);
    edge.position.set(4, 1, -4); scene.add(edge);
    scene.add(new THREE.HemisphereLight(0xd7efff, 0x26314c, 2.2));
    geometry.computeBoundingSphere();
    const extent = Math.max(.95, geometry.boundingSphere!.radius * PICKUP_SIZES[props.tier] * 1.15);
    const camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, .1, 50);
    camera.position.set(4, 2.7, 5.5).normalize().multiplyScalar(8);
    camera.lookAt(0, 0, 0);
    const resize = () => {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
      renderer!.setSize(width, height, false);
      camera.left = -extent * width / height;
      camera.right = extent * width / height;
      camera.updateProjectionMatrix();
      schedule();
    };
    motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw = (timestamp: number) => {
      frame = 0;
      if (!visible) return;
      const seconds = timestamp / 1000;
      const animated = !motion!.matches;
      movement.value = animated ? 'running' : 'paused';
      mesh.position.set(0, 0, 0);
      animatePickup(mesh, item, seconds, motion!.matches);
      renderer!.render(scene, camera);
      ready.value = true;
      if (animated) frame = requestAnimationFrame(draw);
    };
    function schedule() {
      if (frame) cancelAnimationFrame(frame);
      frame = visible ? requestAnimationFrame(draw) : 0;
    }
    const motionChange = () => schedule();
    motion.addEventListener('change', motionChange);
    observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting === true;
      schedule();
    }, { threshold: 0.05 });
    observer.observe(canvas);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    disposePreview = () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      resizeObserver?.disconnect();
      motion?.removeEventListener('change', motionChange);
      geometry?.dispose(); material?.dispose(); renderer?.dispose();
    };
  } catch {
    // WebGL unavailable (e.g. software-disabled browser): keep the authored 2D fallback.
    if (frame) cancelAnimationFrame(frame);
    observer?.disconnect();
    resizeObserver?.disconnect();
    geometry?.dispose(); material?.dispose(); renderer?.dispose();
    ready.value = false;
  }
});
onBeforeUnmount(() => disposePreview());
</script>

<template>
  <div class="pickup-3d-stage" :data-tier="tier">
    <canvas ref="canvasRef" class="pickup-3d-canvas" :data-motion="movement" aria-hidden="true"></canvas>
    <img v-if="!ready" class="pickup-3d-fallback" :src="fallback" alt="" width="110" height="110" decoding="async" />
  </div>
</template>

<style scoped>
.pickup-3d-stage { position: relative; width: 110px; height: 110px; }
.pickup-3d-canvas { display: block; width: 100%; height: 100%; filter: drop-shadow(0 5px 8px #0008); }
.pickup-3d-fallback { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
@media (max-width: 480px) { .pickup-3d-stage { width: 90px; height: 90px; } }
</style>
