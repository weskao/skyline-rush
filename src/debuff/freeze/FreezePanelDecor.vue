<script setup lang="ts">
import { ref, watch } from 'vue';
import type { DebuffPhase } from '../timeline.ts';
import { ICICLES } from './freeze-frost-art.ts';

// Freeze's dressing on its centre card. PlayerHitCenter.vue lays it over the card (`.player-hit-decor`, no layout):
// a frosted-glass hex panel (hex pattern, sweeping sheen, cyan edge) with icicles hanging from its bottom edge.
const props = defineProps<{ phase: DebuffPhase }>();
const hits = ref(0); // a repeated hit replays the panel's frost-in
watch(() => props.phase, phase => { if (phase === 'impact') hits.value++; });
// A mask, not an <svg>: the card's only svg is its fallback icon.
const icicles = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 12' preserveAspectRatio='none'><path d='${ICICLES}'/></svg>`)}")`;
</script>

<template>
  <span :key="hits" class="freeze-panel">
    <i class="freeze-panel-fill"></i>
    <i class="freeze-panel-edge"></i>
    <i class="freeze-panel-icicles" :style="{ maskImage: icicles }"></i>
  </span>
</template>
