<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { PickupTier } from './pickup-models.ts';
import { mountPickupPreview } from './pickup-preview-stage.ts';

const props = defineProps<{ tier: PickupTier }>();
const base = `${import.meta.env.BASE_URL}feature-assets/road-pickups/`;
const canvasRef = ref<HTMLCanvasElement | null>(null);
const ready = ref(false), reduced = ref(false), spriteFailed = ref(false);
// Fallback only: shown until the live model's first frame, and for good where WebGL is unavailable.
const fallback = computed(() => spriteFailed.value ? `${base}${props.tier}.svg`
  : `${base}animated/${props.tier}${reduced.value ? '-poster' : ''}.webp`);
let unmount = () => {};

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvasRef.value) return;
  try {
    unmount = mountPickupPreview(canvasRef.value, props.tier, animated => { ready.value = true; reduced.value = !animated; });
  } catch { /* no WebGL: the image stays */ }
});
onBeforeUnmount(() => unmount());
</script>

<template>
  <div class="pickup-animation-stage" :data-tier="tier" :data-motion="reduced ? 'paused' : 'running'" :data-live="ready">
    <canvas ref="canvasRef" class="pickup-3d-canvas" aria-hidden="true"></canvas>
    <img v-if="!ready" :key="fallback" class="pickup-animation" :src="fallback" alt="" width="110" height="110"
      decoding="async" @error="spriteFailed = true" />
  </div>
</template>

<style scoped>
.pickup-animation-stage { position: relative; flex: none; width: 110px; height: 110px; }
.pickup-3d-canvas { display: block; width: 100%; height: 100%; filter: drop-shadow(0 5px 8px #0008); }
.pickup-animation {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none;
  filter: drop-shadow(0 5px 8px #0008);
}
@media (max-width: 480px) { .pickup-animation-stage { width: 90px; height: 90px; } }
</style>
