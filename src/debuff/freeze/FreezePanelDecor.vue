<script setup lang="ts">
import type { DebuffPhase } from '../timeline.ts';

// Freeze's dressing on its centre card. PlayerHitCenter.vue lays it over the card (`.player-hit-decor`, no layout).
defineProps<{ phase: DebuffPhase }>();
</script>

<template>
  <i class="freeze-panel-decor"></i>
</template>
