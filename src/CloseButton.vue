<script setup lang="ts">
// The one close control for every panel: a round ×, so the panel-specific name lives in aria-label.
defineProps<{ label: string }>();
</script>
<template><button type="button" class="close-button" :aria-label="label">×</button></template>
<style scoped>
.close-button { flex: none; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 1px solid rgb(150 227 255 / .25); border-radius: 50%; color: #f4f0e9; background: rgb(255 255 255 / .06); font-size: 24px; line-height: 1; cursor: pointer; transition: background var(--dur-fast), border-color var(--dur-fast); }
.close-button:hover { border-color: var(--blue); background: rgb(255 255 255 / .12); }
.close-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
