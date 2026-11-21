<script setup lang="ts">
import { ref, watch } from 'vue';
import type { DebuffPhase } from '../timeline.ts';
import { EMP_EDGE_ARCS } from './emp-arcs.ts';

// EMP's screen-edge layer. PlayerHitScreen.vue wraps it in `.hit-layer[data-hit-layer="emp"][data-phase]`.
// Three sets of edge lightning take turns (each its own <svg>, so only opacity and transform animate: no repaint),
// over a hex field, EM scanlines and a rare RGB-split glitch (emp.css).
const props = defineProps<{ phase: DebuffPhase }>();
// A repeated hit returns to `impact`: remount so the impact pulse, glitch and draw-in replay.
const strike = ref(0);
watch(() => props.phase, (now, was) => { if (now === 'impact' && was !== 'impact') strike.value++; });
</script>

<template>
  <i :key="strike" class="emp-screen">
    <b class="emp-scan"></b>
    <svg v-for="(set, k) in EMP_EDGE_ARCS" :key="k" class="emp-arcs" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path v-for="(d, n) in set" :key="n" class="emp-arc-glow" :d="d" pathLength="100" />
      <path v-for="(d, n) in set" :key="`core${n}`" class="emp-arc-core" :d="d" pathLength="100" />
    </svg>
    <b class="emp-pulse"></b>
    <b class="emp-glitch"></b>
  </i>
</template>
