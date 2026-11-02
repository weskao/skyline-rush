<script setup lang="ts"></script>
<template>
  <!-- Decorative: the button around it carries the accessible name. A drawn triangle, not a "▶" glyph (fallback fonts offset it); its path is shifted so its centre of mass sits on the svg's centre. -->
  <span class="release-play-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8.3 5.5v13l11-6.5z" /></svg></span>
</template>
<style scoped>
.release-play-badge { --badge: 56px; position: absolute; inset: 0; margin: auto; width: var(--badge); height: var(--badge); border: 1px solid rgb(150 227 255 / .45);
  border-radius: 50%; background: rgb(8 16 28 / .72); color: #eefbff; display: grid; place-items: center; pointer-events: none; box-shadow: 0 4px 14px rgb(0 6 16 / .5); }
.release-play-badge svg { width: 45%; height: 45%; fill: currentColor; }
</style>
