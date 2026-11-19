<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { CarId } from './car-catalog.ts';

const props = defineProps<{ car: CarId }>();
const canvas = ref<HTMLCanvasElement>();
const graphics = ref('');
const motion = ref(false);
const state = ref('static');
const shot = ref('');
let observer: MutationObserver;
let media: MediaQueryList;

const play = computed(() => motion.value && graphics.value !== 'low');
function readSettings(): void {
  const body = document.body;
  graphics.value = body.dataset.vfxQuality ?? 'medium';
  motion.value = !media.matches && body.dataset.vfxEnabled !== 'false' && !body.classList.contains('vfx-comfort');
}
onMounted(() => {
  media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', readSettings);
  observer = new MutationObserver(readSettings);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-vfx-enabled', 'data-vfx-quality'] });
  readSettings();
});
onUnmounted(() => {
  observer?.disconnect();
  media?.removeEventListener('change', readSettings);
});

watch([canvas, graphics], ([target, quality], _, onCleanup) => {
  shot.value = '';
  if (!target) { state.value = 'static'; return; }
  state.value = 'loading';
  const controller = new AbortController();
  onCleanup(() => controller.abort());
  void import('./acquisition-car-stage.ts')
    .then(({ playCarReveal }) => {
      if (controller.signal.aborted) return;
      return playCarReveal(target, props.car, quality === 'high' || quality === 'ultra', controller.signal,
        (nextState, angle) => {
          if (controller.signal.aborted) return;
          state.value = nextState;
          shot.value = angle;
        });
    })
    .catch(() => { if (!controller.signal.aborted) state.value = 'static'; });
}, { flush: 'post' });
</script>

<template>
  <div class="acquisition-car-cinematic" :data-cinematic="state" :data-shot="shot">
    <canvas v-if="play" :key="graphics" ref="canvas"></canvas>
  </div>
</template>
