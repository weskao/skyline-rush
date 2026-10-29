<script setup lang="ts">
import { ITEM_RULES } from './race-config.ts';
</script>

<template>
  <label>
    <span data-i18n="mode.itemRules">Item rules</span>
    <select data-race-rule="itemRules" aria-label="Item rules" data-i18n-aria-label="mode.itemRules">
      <option v-for="rule in ITEM_RULES" :key="rule" :value="rule" :selected="rule === 'classic'" :data-i18n="`mode.itemRules.${rule}`"></option>
    </select>
  </label>
</template>
