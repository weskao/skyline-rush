<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

const props = defineProps<{
  kind: 'redeem' | 'purchase';
  locale?: string;
  item?: string;
  disabled?: boolean;
}>();
const labels = { redeem: { en: 'Redeem', 'zh-TW': '兌換' }, purchase: { en: 'Buy', 'zh-TW': '購買' } } as const;
const label = computed(() => labels[props.kind][props.locale === 'zh-TW' ? 'zh-TW' : 'en']);
const button = useTemplateRef<HTMLButtonElement>('button');
defineExpose({ focus: (options?: FocusOptions) => button.value?.focus(options) });
</script>

<template>
  <button ref="button" type="button" class="store-action-button" :disabled="disabled"
    :aria-label="item ? label + ' ' + item : undefined">
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped>
.store-action-button {
  box-sizing: border-box;
  min-width: 0;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #a4edf9;
  border-radius: 8px;
  background: linear-gradient(135deg, #a6f3fb, #75c8f1);
  color: #101b31;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  overflow-wrap: anywhere;
  touch-action: manipulation;
}
.store-action-button:focus-visible { outline: 3px solid #a4edf9; outline-offset: 2px; }
@media (hover: hover) {
  .store-action-button:enabled:hover { background: #b7f5ff; border-color: #e0fcff; }
}
.store-action-button:enabled:active { background: #72c8ed; }
.store-action-button:disabled {
  border-color: #52627b;
  background: #222e42;
  color: #bdcadd;
  cursor: not-allowed;
  opacity: 1;
}
</style>
