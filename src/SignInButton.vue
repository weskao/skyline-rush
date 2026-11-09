<script setup lang="ts">
// Google is the only cloud provider today, so its mark is the default icon.
withDefaults(defineProps<{ icon?: string; labelKey: string }>(), { icon: `${import.meta.env.BASE_URL}icons/google-sign-in.webp` });
</script>

<template>
  <button type="button" class="controls-reset sign-in-button"><img :src="icon" alt="" width="20" height="20"><span :data-i18n="labelKey"><slot /></span></button>
</template>
