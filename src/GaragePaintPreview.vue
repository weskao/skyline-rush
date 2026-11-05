<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ id: string; color: string }>();
const animatedGif = `url("${import.meta.env.BASE_URL}feature-assets/garage-animated/sparkle@3x.gif")`;
// Vite BASE_URL supports both the local dev server and /skyline-rush/ Pages.
const artwork = computed(() => import.meta.env.BASE_URL + 'feature-assets/garage-vfx-skins/paint-cards/' + props.id + '@3x.webp');
</script>

<template>
  <span class="garage-paint-preview" :data-finish="id" :style="{ '--paint-color': color, '--garage-animated-gif': animatedGif }" aria-hidden="true">
    <img class="garage-paint-image" :src="artwork" width="960" height="510" alt=""
      loading="eager" decoding="async" />
    <span class="garage-paint-sheen"></span>
    <span class="garage-paint-reflection"></span>
  </span>
</template>

<style>
/* 960×510@3x image, 320×170 logical design size, scaled by the card grid. */
.garage-paint-preview {
  position: relative; isolation: isolate; display: block; width: 100%;
  min-height: 92px; aspect-ratio: 960 / 510; overflow: hidden; border-radius: 11px 8px 6px 6px;
  background: radial-gradient(ellipse at 45% 32%, color-mix(in srgb, var(--paint-color) 34%, #0b2642), transparent 75%), #081828;
}
.garage-paint-preview::after {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: var(--garage-animated-gif) center / 100% 100% no-repeat;
}
.garage-paint-image { display: block; width: 100%; height: 100%; object-fit: cover;
  object-position: center; border-radius: inherit; }
.garage-paint-sheen { position: absolute; z-index: 2; top: -50%; bottom: -50%; left: 0;
  width: 36%; transform: translate3d(-190%, 0, 0) skewX(-23deg);
  background: linear-gradient(90deg, transparent 1%, #ffffff05 22%, #ffffff68 50%, #74eaff20 72%, transparent);
  mix-blend-mode: screen; opacity: 0; pointer-events: none; will-change: transform;
}
.garage-paint-reflection { position: absolute; left: 14%; right: 14%; bottom: 0; height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--paint-color) 55%, #aef1ff), transparent);
  box-shadow: 0 0 10px #00c8ff55; pointer-events: none;
}
@keyframes garage-paint-sweep {
  0%, 24% { transform: translate3d(-190%, 0, 0) skewX(-23deg); }
  66%, 100% { transform: translate3d(410%, 0, 0) skewX(-23deg); }
}
body[data-vfx-quality="medium"] .garage-paint-sheen,
body[data-vfx-quality="high"] .garage-paint-sheen { animation: garage-paint-sweep 6.8s linear infinite; opacity: .42; }
body[data-vfx-quality="high"] .paint-options button[aria-pressed="true"] .garage-paint-sheen {
  animation-duration: 4.5s; opacity: .70;
}
body[data-vfx-quality="low"] .garage-paint-sheen,
body[data-vfx-enabled="false"] .garage-paint-sheen,
body.vfx-comfort .garage-paint-sheen { animation: none; opacity: 0; will-change: auto; }
body[data-vfx-quality="low"] .garage-paint-preview::after,
body[data-vfx-enabled="false"] .garage-paint-preview::after,
body.vfx-comfort .garage-paint-preview::after { background-image: none; }
@media (prefers-reduced-motion: reduce) {
  .garage-paint-preview::after { background-image: none !important; }
  .garage-paint-sheen { animation: none !important; opacity: 0 !important; will-change: auto; }
}
</style>
