<script setup lang="ts">
import type { DebuffPhase } from '../timeline.ts';

// EMP's dressing on its centre card. PlayerHitCenter.vue lays it over the card (`.player-hit-decor`, no layout).
// An angular technical-glass hex panel behind the copy (emp.css puts it under the text), a gold edge with an
// electric trace running round it, and chevrons either side. It draws a little past the card, never moving it.
defineProps<{ phase: DebuffPhase }>();
const panel = '24,1 236,1 252,28 236,55 24,55 8,28';
</script>

<template>
  <svg class="emp-panel-decor" viewBox="0 0 260 56" preserveAspectRatio="none" :data-phase="phase">
    <defs>
      <pattern id="emp-panel-hex" width="12" height="20.8" patternUnits="userSpaceOnUse">
        <path d="M3 0h6l3 5.2-3 5.2H3L0 5.2zM3 10.4h6l3 5.2-3 5.2H3L0 15.6z" />
      </pattern>
    </defs>
    <polygon class="emp-panel-glass" :points="panel" />
    <polygon class="emp-panel-hex" :points="panel" fill="url(#emp-panel-hex)" />
    <polygon class="emp-panel-edge" :points="panel" />
    <polygon class="emp-panel-trace" :points="panel" pathLength="100" />
    <path class="emp-panel-chevron" d="M7 16 1 28l6 12M253 16l6 12-6 12" />
  </svg>
</template>
