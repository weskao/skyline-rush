<script setup lang="ts">
import { ref, watch } from 'vue';
import type { DebuffPhase } from '../timeline.ts';
import { FROST_CORNER, FROST_CRACKS, SNOWFLAKE } from './freeze-frost-art.ts';

// Freeze's screen-edge layer. PlayerHitScreen.vue wraps it in `.hit-layer[data-hit-layer="freeze"][data-phase]`.
// Frost feathers grow in from the four corners with thin cracks and drifting snow; freeze.css keeps the centre clear.
const props = defineProps<{ phase: DebuffPhase }>();
const hits = ref(0); // a repeated hit restarts the frost: the key remounts it and its one-shot animations replay
watch(() => props.phase, phase => { if (phase === 'impact') hits.value++; });
const corners = ['tl', 'tr', 'br', 'bl'] as const;
const flakes = [[5, 24, 1], [94, 30, 0.8], [10, 72, 0.7], [90, 78, 1.1], [26, 7, 0.6], [74, 93, 0.75]] as const;
</script>

<template>
  <div :key="hits" class="freeze-screen">
    <i class="freeze-flash"></i>
    <svg v-for="corner in corners" :key="corner" class="freeze-frost" :data-corner="corner" viewBox="0 0 100 100">
      <path class="freeze-frost-glow" :d="FROST_CORNER.ferns" />
      <path class="freeze-frost-fine" :d="FROST_CORNER.fine" />
      <path class="freeze-frost-fern" :d="FROST_CORNER.ferns" />
      <path class="freeze-crack" :d="FROST_CRACKS" />
    </svg>
    <i class="freeze-snow"></i>
    <i class="freeze-snow freeze-snow-near"></i>
    <svg v-for="([x, y, size], n) in flakes" :key="n" class="freeze-flake" viewBox="-12 -12 24 24"
      :style="{ left: `${x}%`, top: `${y}%`, '--flake': size, '--flake-delay': `${-n * 0.9}s` }">
      <path :d="SNOWFLAKE" />
    </svg>
  </div>
</template>
