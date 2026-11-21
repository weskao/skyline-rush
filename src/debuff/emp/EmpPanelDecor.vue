<script setup lang="ts">
import type { DebuffPhase } from '../timeline.ts';

// EMP's dressing on its centre card. PlayerHitCenter.vue lays it over the card (`.player-hit-decor`, no layout).
defineProps<{ phase: DebuffPhase }>();
</script>

<template>
  <i class="emp-panel-decor"></i>
</template>
