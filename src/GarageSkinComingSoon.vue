<script setup lang="ts">
defineProps<{ locale: string }>();
</script>

<template>
  <section id="garage-vfx-catalog" class="garage-coming-soon" data-preview-contract="coming-soon"
    data-release-mode="coming-soon" aria-labelledby="garage-vfx-catalog-heading">
    <h3 id="garage-vfx-catalog-heading">{{ locale === 'zh-TW' ? '外觀特效收藏' : 'VFX collection' }}</h3>
    <p role="status">{{ locale === 'zh-TW' ? '即將推出：更多推進器、氣流、NITRO 尾跡與起跑特效。' : 'Coming soon: more thrusters, airflow, NITRO trails and launch effects.' }}</p>
  </section>
</template>

<style scoped>
.garage-coming-soon { border-top: 1px solid #35536a; margin-top: 14px; padding: 12px 0; color: #d5e8f4; }
.garage-coming-soon h3 { font-size: 15px; margin: 0 0 6px; }
.garage-coming-soon p { font-size: 13px; line-height: 1.5; }
</style>
