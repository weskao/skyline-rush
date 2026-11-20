<script setup lang="ts">
import { computed } from 'vue';
import { playerHitView } from './item-ui.ts';

const hit = computed(() => playerHitView.emp > 0 ? 'emp' : playerHitView.freeze > 0 ? 'freeze' : undefined);
</script>

<template>
  <div class="speedometer" :data-debuff="hit" :data-calm="hit ? playerHitView.calm : undefined">
    <div class="speed-number"><strong id="speed">0</strong><span>KM/H</span></div>
    <div class="speed-ticks" aria-hidden="true">
      <svg class="speed-dial" viewBox="0 0 200 22"><path d="M4 20 Q100 -16 196 20"/><path id="speed-needle" d="M100 20V2"/></svg>
      <i v-for="i in 24" :key="i"></i>
    </div>
    <span class="speed-caption" id="speed-caption">READY FOR TAKEOFF</span>
  </div>
</template>

<style scoped>
.speedometer[data-debuff="freeze"] {
  --speed-color: var(--freeze-hit-color);
  --speed-line: linear-gradient(90deg, #39a0ec, #c4f6ff 64%, transparent);
}
.speedometer[data-debuff="emp"] {
  --speed-color: var(--emp-hit-color);
  --speed-line: linear-gradient(110deg, #526cf5, #a88aff 34%, #efedff 56%, transparent 88%);
}
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
@media (prefers-reduced-motion: no-preference) {
  .speedometer[data-debuff="freeze"][data-calm="false"] .speed-number::after {
    animation: speed-frost 620ms var(--ease-out) both;
  }
  .speedometer[data-debuff="emp"][data-calm="false"] .speed-number::after {
    animation: speed-surge 620ms var(--ease-out) both;
  }
}
:global(body[data-vfx-enabled="false"] .speedometer[data-debuff] .speed-number::after) { animation: none !important; }
@keyframes speed-frost {
  from { transform: scaleX(.15); opacity: .35; }
  to { transform: scaleX(1); opacity: 1; }
}
@keyframes speed-surge {
  0% { transform: scaleX(.4); opacity: .3; }
  35% { transform: scaleX(1); opacity: 1; }
  65% { opacity: .55; }
  100% { opacity: 1; }
}
</style>
