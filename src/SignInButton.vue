<script setup lang="ts">
defineProps<{ icon: string; labelKey: string }>();
</script>

<template>
  <button type="button" class="controls-reset sign-in-button"><img :src="icon" alt="" width="20" height="20"><span :data-i18n="labelKey"><slot /></span></button>
</template>
