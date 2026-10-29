<script setup lang="ts">
// Event-driven selection stays with the existing race-selection controller.
</script>
<template>
  <details class="race-mode-rules" id="circuit-rules" hidden>
    <summary data-i18n="circuit.settings">Circuit race format</summary>
    <label><span data-i18n="circuit.laps">Laps</span>
      <select id="circuit-laps" aria-label="Circuit laps" data-i18n-aria-label="circuit.laps">
        <option value="1">1</option><option value="3" selected>3</option><option value="5">5</option>
      </select>
    </label>
  </details>
</template>
