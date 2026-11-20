<script setup lang="ts">
import { collectibleIconUrl } from './collectible-icons.ts';
defineProps<{ name: string }>();
</script>

<template>
  <img class="collectible-icon" :data-collectible-icon="name" :src="collectibleIconUrl(name)"
    width="24" height="24" loading="lazy" decoding="async" alt="" aria-hidden="true" draggable="false">
</template>

<style>
.collectible-icon {
  display: inline-block;
  inline-size: 24px;
  block-size: 24px;
  object-fit: contain;
  flex: 0 0 24px;
  vertical-align: middle;
  pointer-events: none;
  user-select: none;
  transition: filter 140ms ease, transform 120ms ease;
}
button:is([aria-pressed="false"], [aria-selected="false"], [aria-checked="false"]) .collectible-icon,
[data-active="false"] > .collectible-icon { filter: saturate(.66) brightness(.82); }
button:is([aria-pressed="true"], [aria-selected="true"], [aria-checked="true"]) .collectible-icon,
[data-active="true"] > .collectible-icon,
button[data-applied] .collectible-icon { filter: saturate(1.25) drop-shadow(0 0 4px #8de5ff80); }
button:disabled .collectible-icon { filter: saturate(.48) brightness(.75); }
button[aria-busy="true"] .collectible-icon { filter: saturate(.65); }
@media (hover: hover) {
  button:not(:disabled):not([aria-disabled="true"]):hover .collectible-icon {
    filter: brightness(1.19) saturate(1.22) drop-shadow(0 0 3px #c5f4ff80);
  }
}
button:enabled:not([aria-disabled="true"]):active .collectible-icon {
  filter: brightness(1.33) saturate(1.28);
  transform: var(--collectible-press, scale(.89));
}
button:has(> .collectible-icon) > .collectible-icon:first-child { margin-inline-end: var(--collectible-gap, 4px); }
button:has(> .collectible-icon:only-child) > .collectible-icon,
button.collectible-balanced > .collectible-icon:first-child { margin-inline-end: 0; }
body:is(.vfx-comfort, [data-vfx-enabled="false"]) .collectible-icon { transition: none; --collectible-press: none; }
@media (prefers-reduced-motion: reduce) {
  .collectible-icon { transition: none; --collectible-press: none; }
}
</style>
