<script setup lang="ts">
import { computed } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
type Tone = 'cyan' | 'magenta' | 'gold' | 'slate' | 'azure' | 'amber' | 'red';
const props = withDefaults(defineProps<{ id: string; label: string; src: string; tone?: Tone; restored?: boolean; size?: number; imageHeight?: number; fallbackSrc?: string }>(),
  { tone: 'cyan', restored: false, size: 72 });
const hues: Record<Tone, number> = {
  cyan: 189, magenta: 312, gold: 42, slate: 214, azure: 207, amber: 32, red: 354,
};
// Real part motion (lid, bow, cards) needs a GIF; a pure specular sweep is drawn in CSS below.
const animatedSrc = computed(() => /^store-(box|bundle|collection)$/.test(props.id)
  ? `${import.meta.env.BASE_URL}feature-assets/garage-animated/${props.id}@3x.gif` : '');
const sweep = computed(() => /^(badge-|rarity-)|^store-(cart|star|tag)$/.test(props.id));
const colors = computed(() => ({
  '--sweep-mask': sweep.value ? `url("${props.src}")` : 'none',
  '--badge-hue': String(hues[props.tone]),
  '--art-width': props.size + 'px',
  '--art-height': (props.imageHeight ?? props.size) + 'px',
  '--frame-width': (props.size + 16) + 'px',
  '--frame-height': ((props.imageHeight ?? props.size) + 16) + 'px',
}));
</script>
<template>
  <figure class="garage-badge-card" :data-badge-art="id" :data-badge-tone="tone"
    :data-artwork-restored="String(restored)" :data-art="id" :style="colors">
    <div class="garage-badge-art-frame">
      <GarageArtworkImage :src="src" :size="size" :height="imageHeight" :image-id="id"
        :alt="label" :animated-src="animatedSrc" :fallback-text="label" :fallback-src="fallbackSrc" />
      <span v-if="sweep" class="garage-art-sweep" aria-hidden="true"></span>
    </div>
    <figcaption>{{ label }}</figcaption>
  </figure>
</template>
<style scoped>
.garage-badge-card {
  position: relative; isolation: isolate; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; gap: 9px;
  min-width: 0; margin: 0; padding: 13px 9px 14px;
  border: 1px solid hsl(var(--badge-hue) 65% 57% / .58); border-radius: 14px;
  background: linear-gradient(145deg, hsl(var(--badge-hue) 65% 42% / .08), transparent 57%),
    radial-gradient(ellipse at 50% 28%, hsl(var(--badge-hue) 62% 35% / .30), transparent 75%),
    linear-gradient(165deg, #1d2c49, #0b182b 86%);
  box-shadow: inset 0 1px 0 #e8f6ff12, 0 6px 15px #0004;
  color: #eaf3ff;
}
.garage-badge-card::before {
  content: ''; position: absolute; inset: 6px 7px auto; height: 1px;
  pointer-events: none; background: linear-gradient(90deg, transparent, hsl(var(--badge-hue) 90% 74% / .4), transparent);
}
.garage-badge-art-frame {
  position: relative; box-sizing: border-box; display: grid; place-items: center; flex: 0 0 auto;
  width: var(--frame-width); height: var(--frame-height); padding: 8px; border-radius: 13px; overflow: visible;
  background: radial-gradient(circle, hsl(var(--badge-hue) 70% 49% / .15), transparent 67%);
}
.garage-badge-art-frame :deep(.artwork-img) {
  display: block; width: var(--art-width); height: var(--art-height); max-width: 100%; max-height: 100%;
  object-fit: contain; object-position: center; image-rendering: auto;
  filter: drop-shadow(0 0 5px hsl(var(--badge-hue) 90% 65% / .28));
}
/* Specular sweep clipped to the icon's own alpha. Same direction (left → right, -23° like
   .garage-paint-sheen) and same 6.8s cycle on every swept icon; transform-only animation. */
.garage-art-sweep {
  position: absolute; inset: 8px; overflow: hidden; pointer-events: none;
  -webkit-mask: var(--sweep-mask) center / contain no-repeat; mask: var(--sweep-mask) center / contain no-repeat;
}
.garage-art-sweep::after {
  content: ''; position: absolute; top: -50%; bottom: -50%; left: 0; width: 42%;
  transform: translate3d(-160%, 0, 0) skewX(-23deg); will-change: transform;
  background: linear-gradient(90deg, transparent, #ffffff14 25%, #ffffffc8 50%, #ffffff14 75%, transparent);
  mix-blend-mode: screen; animation: garage-art-sweep 6.8s ease-in-out infinite;
}
/* ~2s travel, ~1s across the icon itself; the rest of the cycle is rest. */
@keyframes garage-art-sweep {
  0%, 55% { transform: translate3d(-160%, 0, 0) skewX(-23deg); }
  85%, 100% { transform: translate3d(300%, 0, 0) skewX(-23deg); }
}
:global(body[data-vfx-quality="low"]) .garage-art-sweep,
:global(body[data-vfx-enabled="false"]) .garage-art-sweep,
:global(body.vfx-comfort) .garage-art-sweep { display: none; }
.garage-badge-card figcaption {
  width: 100%; min-height: 30px; margin: 0; padding: 0;
  color: #dfebff; text-align: center; font-size: clamp(11px, 1.3vw, 13px);
  font-weight: 650; line-height: 1.5; overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: reduce) {
  .garage-badge-card * { animation: none !important; transition: none !important; }
  .garage-art-sweep { display: none; }
}
</style>
