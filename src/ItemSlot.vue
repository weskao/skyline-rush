<script setup lang="ts">
// Static silhouettes are selected by the typed hot-HUD adapter; no per-frame Vue reactivity.
</script>

<template>
  <div id="item-slot" class="item-slot" hidden>
    <span id="item-icon" class="item-icon" aria-hidden="true">
      <svg class="item-shield" viewBox="0 0 48 48"><path d="M24 10l12 5v9c0 8-5 13-12 15-7-2-12-7-12-15v-9l12-5z" /></svg>
      <svg class="item-magnet" viewBox="0 0 48 48"><path d="M15 14v10a9 9 0 0018 0V14h-5v10a4 4 0 01-8 0V14h-5z" /></svg>
      <svg class="item-ghost" viewBox="0 0 48 48"><path d="M14 36V22a10 10 0 0120 0v14l-4-3-3 3-3-3-3 3-3-3-4 3zm6-14h1m7 0h1" /></svg>
      <svg class="item-freeze" viewBox="0 0 48 48"><path d="M24 8v32M10 16l28 16M10 32l28-16M19 12l5 5 5-5M19 36l5-5 5 5M11 22l7-2-2-7M37 26l-7 2 2 7" /></svg>
    </span>
    <span id="item-status" role="status"></span>
    <button type="button" id="activate-item" data-i18n="mode.itemActivate" disabled>USE · Q</button>
  </div>
</template>

<style scoped>
.item-icon { flex: 0 0 24px; width: 24px; height: 24px; }
.item-icon svg { display: none; width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.item-slot[data-item="shield"] .item-shield,
.item-slot[data-item="magnet"] .item-magnet,
.item-slot[data-item="ghost"] .item-ghost,
.item-slot[data-item="freeze"] .item-freeze { display: block; }
.item-slot button { min-height: 44px; }
</style>
