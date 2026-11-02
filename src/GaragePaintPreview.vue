<script setup lang="ts">
defineProps<{ id: string; color: string }>();
</script>

<template>
  <!-- One composited SVG per card: no GIF decoding, extra canvas, or WebGL allocations. -->
  <span class="garage-paint-preview" :data-finish="id" :style="{ '--paint-color': color }" aria-hidden="true">
    <svg viewBox="0 0 240 118" preserveAspectRatio="xMidYMid meet" focusable="false">
      <ellipse class="paint-car-shadow" cx="125" cy="105" rx="103" ry="10" />
      <path class="paint-car-tire" d="M41 86a20 20 0 0 1 40 0v14H41zM163 86a20 20 0 0 1 40 0v14h-40z" />
      <path class="paint-car-shell" d="M16 77q4-10 22-12l29-9 27-28q9-9 24-9h40q16 0 26 11l24 27 17 7q10 4 9 14l-5 16h-17q-1-24-26-24t-27 24H86q-2-24-24-24T39 94H22Q10 90 16 77Z" />
      <path class="paint-car-glass" d="m83 54 19-22q5-6 17-6h37q7 0 13 6l15 21-101 1Z" />
      <path class="paint-car-window-line" d="m129 27-2 27M83 54h101" />
      <path class="paint-car-reflection" d="M28 72q45-17 81-14h103l9 5q-65-5-107 3-49 2-86 13Z" />
      <path class="paint-car-hood" d="m29 74 44-12 61-3-33 13-72 9Z" />
      <path class="paint-car-front" d="m17 81 18-4-4 9-14-1ZM211 65l13 6-2 9-13-7Z" />
      <path class="paint-car-light" d="m21 77 22-4-10 8-13 1ZM207 66l17 7-1 4-14-6Z" />
      <circle class="paint-car-wheel" cx="62" cy="94" r="16" />
      <circle class="paint-car-rim" cx="62" cy="94" r="8" />
      <circle class="paint-car-wheel" cx="185" cy="94" r="16" />
      <circle class="paint-car-rim" cx="185" cy="94" r="8" />
      <path class="paint-car-sill" d="M84 90h78" />
    </svg>
    <span class="garage-paint-sheen"></span>
    <span class="garage-paint-reflection"></span>
  </span>
</template>

<style>
.garage-paint-preview { position: relative; isolation: isolate; display: grid; place-items: center; width: 100%;
  min-height: 92px; aspect-ratio: 2.05 / 1; overflow: hidden; border: 1px solid #8ecfff3c;
  border-radius: 11px 4px 11px 4px;
  background: radial-gradient(ellipse at 50% 20%, color-mix(in srgb, var(--paint-color) 39%, #18344d), transparent 73%),
    linear-gradient(165deg, #263e53, #071320 85%); }
.garage-paint-preview svg { position: relative; z-index: 1; width: 100%; height: 100%; overflow: visible;
  filter: drop-shadow(0 4px 3px #0009); }
.paint-car-shadow { fill: #02070b; opacity: .62; }
.paint-car-tire { fill: #071019; }
.paint-car-shell { fill: var(--paint-color); stroke: #ffffff73; stroke-width: 1.3; stroke-linejoin: round; }
.paint-car-glass { fill: #071d2d; stroke: #9de6ffb8; stroke-width: 1.4; }
.paint-car-window-line { fill: none; stroke: #a9d6ed9c; stroke-width: 1.5; }
.paint-car-reflection { fill: #fff; opacity: .32; }
.paint-car-hood { fill: #fff; opacity: .16; }
.paint-car-front { fill: #050d15; opacity: .68; }
.paint-car-light { fill: #b8f4ff; }
.paint-car-wheel { fill: #080f18; stroke: #5f7488; stroke-width: 2; }
.paint-car-rim { fill: #839caf; stroke: #0e1d2c; stroke-width: 3; }
.paint-car-sill { stroke: #061523; stroke-width: 2.4; }
.garage-paint-preview[data-finish="pearl"] .paint-car-reflection { opacity: .55; }
.garage-paint-preview[data-finish="aurora"] .paint-car-hood { fill: #e0fc86; opacity: .46; }
.garage-paint-preview[data-finish="glacier"] .paint-car-hood { fill: #baf2ff; opacity: .34; }
.garage-paint-preview[data-finish="coral"] .paint-car-hood { fill: #ffe0b5; opacity: .30; }
.garage-paint-preview[data-finish="cobalt"] .paint-car-reflection { opacity: .48; }
.garage-paint-preview[data-finish="obsidian"] .paint-car-shell { stroke: #93c1dfb3; }
.garage-paint-preview[data-finish="obsidian"] .paint-car-reflection { opacity: .58; }
.garage-paint-sheen { position: absolute; z-index: 2; inset: -65% auto -65% 0; width: 45%;
  background: linear-gradient(90deg, transparent, #ffffff05 25%, #ffffff83 51%, #b2f4ff20 73%, transparent);
  transform: translateX(-160%) skewX(-20deg); opacity: 0; pointer-events: none; }
.garage-paint-reflection { position: absolute; z-index: 0; width: 100%; height: 1px; bottom: 8px;
  background: linear-gradient(90deg, transparent, var(--paint-color), transparent); opacity: .65; }
@keyframes garage-paint-sweep { 0%, 20% { transform: translateX(-160%) skewX(-20deg); } 65%, 100% { transform: translateX(410%) skewX(-20deg); } }
body[data-vfx-quality="medium"] .garage-paint-sheen,
body[data-vfx-quality="high"] .garage-paint-sheen { animation: garage-paint-sweep 6s linear infinite; opacity: .45; }
body[data-vfx-quality="high"] .paint-options [aria-pressed="true"] .garage-paint-sheen { animation-duration: 3.8s; opacity: .76; }
body[data-vfx-quality="low"] .garage-paint-sheen,
body[data-vfx-enabled="false"] .garage-paint-sheen,
body.vfx-comfort .garage-paint-sheen { animation: none; opacity: 0; }
@media (prefers-reduced-motion: reduce) { .garage-paint-sheen { animation: none !important; opacity: 0 !important; } }
</style>
