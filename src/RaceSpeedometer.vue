<script setup lang="ts">
import { computed } from 'vue';
import { playerHitView } from './item-ui.ts';

const hit = computed(() => playerHitView.emp > 0 ? 'emp' : playerHitView.freeze > 0 ? 'freeze' : undefined);
</script>

<template>
  <!-- Each effect's gauge look is in src/debuff/<effect>/<effect>.css; `.speed-hit-arc` is theirs to light. -->
  <div class="speedometer" :data-debuff="hit" :data-phase="hit && playerHitView[`${hit}Phase`] || undefined" :data-calm="hit ? playerHitView.calm : undefined">
    <div class="speed-number"><strong id="speed">0</strong><span>KM/H</span></div>
    <div class="speed-ticks" aria-hidden="true">
      <svg class="speed-dial" viewBox="0 0 200 22"><path d="M4 20 Q100 -16 196 20"/><path class="speed-hit-arc" d="M4 20 Q100 -16 196 20" pathLength="100"/><path id="speed-needle" d="M100 20V2"/></svg>
      <i v-for="i in 24" :key="i"></i>
    </div>
    <span class="speed-caption" id="speed-caption">READY FOR TAKEOFF</span>
  </div>
</template>

<style scoped>
.speed-hit-arc { opacity: 0; }
.speedometer[data-debuff] .speed-number { position: relative; }
.speedometer[data-debuff] .speed-number > strong,
.speedometer[data-debuff] .speed-number > span { color: var(--speed-color); }
.speedometer[data-debuff] .speed-dial { stroke: color-mix(in srgb, var(--speed-color) 62%, #33405e); }
.speedometer[data-debuff] #speed-needle { stroke: var(--speed-color); }
.speedometer[data-debuff] .speed-ticks > i.active { background: var(--speed-color); }
.speedometer[data-debuff] .speed-number::after {
  content: "";
  position: absolute;
  inset: auto auto -4px 0;
  width: min(100%, 8rem);
  height: 3px;
  border-radius: 99px;
  background: var(--speed-line);
  pointer-events: none;
  transform-origin: left;
}
:global(body[data-vfx-enabled="false"] .speedometer[data-debuff] .speed-number::after) { animation: none !important; }
</style>
