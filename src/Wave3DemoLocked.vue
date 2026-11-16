<script setup lang="ts">
defineProps<{ locale?: string; embedded?: boolean }>();
defineEmits<{ navigate: [page: 'home' | 'store' | 'collection'] }>();
</script>
<template><span hidden aria-hidden="true"></span></template>
