<script setup lang="ts">
import { computed, watch } from 'vue';
import { garageStudioView } from './garage-view-state.ts';

const props = defineProps<{ locale: string }>();
const copy = computed(() => props.locale === 'zh-TW' ? {
  label: '顯示裝備特效', on: '特效開', off: '特效關',
  hidden: '預覽特效已停用', notice: '已套用裝備。開啟特效即可在預覽中查看。',
} : {
  label: 'Show equipment effects', on: 'VFX on', off: 'VFX off',
  hidden: 'Preview effects hidden', notice: 'Equipment applied. Turn VFX on to see it in the preview.',
});

watch(() => garageStudioView.effectsReminder, (reminder, _, onCleanup) => {
  if (!reminder) return;
  const timer = setTimeout(() => { garageStudioView.effectsReminder = 0; }, 5000);
  onCleanup(() => clearTimeout(timer));
});
</script>

<template>
  <div class="garage-vfx-overlay">
    <p id="garage-vfx-notice" class="garage-vfx-notice" role="status">{{ garageStudioView.effectsReminder ? copy.notice : garageStudioView.effectsVisible ? '' : copy.hidden }}</p>
    <button id="garage-effects-toggle" type="button" :aria-label="copy.label"
      :aria-pressed="garageStudioView.effectsVisible" aria-controls="garage-preview"
      :data-reminder="Boolean(garageStudioView.effectsReminder)">
      <span aria-hidden="true">✦</span>
      {{ garageStudioView.effectsVisible ? copy.on : copy.off }}
      <span v-if="garageStudioView.effectsReminder" :key="garageStudioView.effectsReminder"
        class="garage-vfx-pulse" aria-hidden="true"></span>
    </button>
  </div>
</template>

<style>
#garage-screen .garage-visual { position: relative; }
.garage-vfx-overlay {
  position: absolute;
  inset-block-start: 9px;
  inset-inline-end: 9px;
  z-index: 3;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
  max-inline-size: calc(100% - 18px);
  pointer-events: none;
}
#garage-effects-toggle {
  position: relative;
  flex: none;
  min-block-size: 44px;
  min-inline-size: 44px;
  padding-inline: 9px;
  border: 1px solid #a6bacb;
  border-radius: 8px;
  color: #eef5fa;
  background: #101e2f;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
}
#garage-effects-toggle[aria-pressed="true"] { color: #a6f4ff; border-color: #54cce8; background: #0b3346; }
#garage-effects-toggle[data-reminder="true"] { color: #fff1c9; border-color: #ffd477; background: #483519; }
.garage-vfx-notice {
  max-inline-size: 16rem;
  margin: 0;
  padding: 7px 9px;
  border: 1px solid #a88249;
  border-radius: 8px;
  color: #fff1c9;
  background: #201b17;
  font-size: 12px;
  line-height: 1.35;
}
.garage-vfx-notice:empty {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  border: 0;
  overflow: hidden;
}
.garage-vfx-pulse {
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: 0 0 0 2px #ffd477, 0 0 14px #ffd477;
  animation: garage-vfx-reminder 800ms ease-out 3;
  opacity: 0;
}
.vfx-comfort .garage-vfx-pulse { animation: none; }
@keyframes garage-vfx-reminder {
  40% { opacity: 1; }
}
</style>
