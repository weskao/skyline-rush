<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Pickup3DPreview from './Pickup3DPreview.vue';
import { PICKUP_3D_ENABLED } from './pickup-3d-config.js';

const props = defineProps<{ tier: 'cell' | 'can' | 'tank' | 'overcharge' }>();
const base = `${import.meta.env.BASE_URL}feature-assets/road-pickups/`;
const sprite = `${base}animated/${props.tier}.webp`;
const poster = `${base}animated/${props.tier}-poster.webp`;
const fallback = `${base}${props.tier}.svg`;
const reduced = ref(false);
const loaded = ref(false);
const failed = ref(false);
const imageSource = computed(() => reduced.value ? poster : sprite);
let motion: MediaQueryList | undefined;

function failSprite() {
  failed.value = true; // Missing asset or unsupported WebP: use the existing WebGL/SVG guide.
  loaded.value = false;
}

onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced.value = motion.matches;
  motion.addEventListener('change', handleMotion);
});
function handleMotion(event: MediaQueryListEvent) {
  reduced.value = event.matches;
  loaded.value = false;
}
onBeforeUnmount(() => motion?.removeEventListener('change', handleMotion));
</script>

<template>
  <div class="pickup-animation-stage" :data-tier="tier" :data-motion="reduced || failed ? 'paused' : 'running'">
    <template v-if="!failed">
      <img :key="imageSource" :src="imageSource" :alt="''"
        class="pickup-animation" :class="{ 'is-ready': loaded }"
        width="110" height="110" decoding="async"
        @load="loaded = true" @error="failSprite" />
      <img v-if="!loaded" class="pickup-animation-placeholder" :src="fallback"
        alt="" width="110" height="110" decoding="async" />
    </template>
    <Pickup3DPreview v-else-if="PICKUP_3D_ENABLED" :tier="tier" />
    <img v-else class="pickup-animation-static" :src="fallback"
      alt="" width="110" height="110" decoding="async" />
  </div>
</template>

<style scoped>
.pickup-animation-stage { position: relative; flex: none; width: 110px; height: 110px; }
.pickup-animation, .pickup-animation-placeholder, .pickup-animation-static {
  position: absolute; inset: 0; display: block; width: 100%; height: 100%;
  object-fit: contain; pointer-events: none; filter: drop-shadow(0 5px 8px #0008);
}
.pickup-animation { opacity: 0; z-index: 1; }
.pickup-animation.is-ready { opacity: 1; }
.pickup-animation-placeholder { z-index: 0; }
@media (max-width: 480px) {
  .pickup-animation-stage { width: 90px; height: 90px; }
}
</style>
