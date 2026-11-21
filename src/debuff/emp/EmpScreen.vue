<script setup lang="ts">
import type { DebuffPhase } from '../timeline.ts';

// EMP's screen-edge layer. PlayerHitScreen.vue wraps it in `.hit-layer[data-hit-layer="emp"][data-phase]`.
defineProps<{ phase: DebuffPhase }>();
</script>

<template>
  <i class="emp-screen"></i>
</template>
