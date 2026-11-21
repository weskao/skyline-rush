<script setup lang="ts">
import type { DebuffPhase } from '../timeline.ts';

// Freeze's screen-edge layer. PlayerHitScreen.vue wraps it in `.hit-layer[data-hit-layer="freeze"][data-phase]`.
defineProps<{ phase: DebuffPhase }>();
</script>

<template>
  <i class="freeze-screen"></i>
</template>
