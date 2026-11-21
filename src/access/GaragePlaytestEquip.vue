<script setup lang="ts">
import CollectibleIcon from '../CollectibleIcon.vue';
import { computed, inject } from 'vue';
import { equipGarageSkin, garageSkinEntry, garageSkinState } from '#garage-skin-runtime';
import type { SkinId } from '../garage-skin-catalog.ts';

const props = defineProps<{ id: SkinId; locale: string }>();
const cue = inject<(name: string) => void>('game-audio-cue', () => {});
const equipped = computed(() => {
  void garageSkinState.revision;
  return garageSkinEntry(props.id)?.state === 'equipped';
});
function equip(): void {
  if (equipGarageSkin(props.id)) cue('equip-confirmed');
}
</script>

<template>
  <button type="button" data-garage-playtest-equip :disabled="equipped" @click="equip">
    <CollectibleIcon :name="equipped ? 'check' : 'tools'" />
    {{ equipped ? (locale === 'zh-TW' ? '已裝備' : 'Equipped') : (locale === 'zh-TW' ? '測試裝備' : 'Equip for testing') }}
  </button>
</template>
