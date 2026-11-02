<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import GarageArtworkTile from './GarageArtworkTile.vue';
import { getLocale, onLocaleChange } from './i18n.ts';
import { WAVE3_PREVIEW_CATALOG, filterWave3PreviewItems } from './garage-wave3-preview-catalog.ts';
import type { Wave3PreviewCategory, Wave3PreviewGroup, Wave3Text } from './garage-wave3-preview-catalog.ts';

const props = defineProps<{ category: Wave3PreviewCategory }>();
const locale = ref(getLocale());
const config = computed(() => WAVE3_PREVIEW_CATALOG[props.category]);
const filter = ref<Wave3PreviewGroup>('all');
const visible = computed(() => filterWave3PreviewItems(props.category, filter.value));
const selected = ref(config.value.items[0].id);
const current = computed(() => visible.value.find(item => item.id === selected.value) ?? visible.value[0]);
const copy = (item: Wave3Text) => item[locale.value];
const image = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/${props.category}/raster/${id}@3x.webp`;
function setFilter(group: Wave3PreviewGroup): void {
  filter.value = group;
  selected.value = filterWave3PreviewItems(props.category, group)[0]?.id ?? '';
}
let stopListening: (() => void) | undefined;
onMounted(() => { locale.value = getLocale(); stopListening = onLocaleChange(next => { locale.value = next; }); });
onUnmounted(() => stopListening?.());
</script>

<template>
  <details :id="'garage-art-source-' + category" class="garage-source-art" :data-wave3-category="category">
    <summary>{{ copy(config.heading) }} <span class="garage-source-soon">{{ locale === 'zh-TW' ? '概念預覽' : 'Preview' }}</span></summary>
    <p class="garage-source-hint">{{ copy(config.notice) }}</p>
    <div class="garage-source-filters" role="group" :aria-label="locale === 'zh-TW' ? '篩選收藏類型' : 'Filter catalog category'">
      <button v-for="item in config.filters" :key="item.id" type="button" :data-wave3-filter="item.id"
        :aria-pressed="filter === item.id" @click="setFilter(item.id)">{{ copy(item.name) }}</button>
    </div>
    <div class="garage-source-grid">
      <button v-for="item in visible" :key="item.id" type="button" class="garage-source-choice"
        :data-wave3-asset="item.id" :aria-pressed="selected === item.id"
        :aria-label="`${locale === 'zh-TW' ? '預覽' : 'Preview'} ${copy(item.name)}`"
        @click="selected = item.id">
        <GarageArtworkTile :id="item.id" :label="copy(item.name)" :src="image(item.id)"
          :size="config.cssSize" :tone="item.tone" />
      </button>
    </div>
    <section v-if="current" class="garage-source-detail" :data-wave3-selected="current.id"
      :aria-label="locale === 'zh-TW' ? '素材詳情' : 'Artwork details'">
      <div class="garage-source-detail-heading">
        <strong>{{ copy(current.name) }}</strong>
        <span>{{ locale === 'zh-TW' ? '尚未開放' : 'Coming soon' }}</span>
      </div>
      <p data-wave3-description aria-live="polite" aria-atomic="true">{{ copy(current.description) }}</p>
    </section>
  </details>
</template>

<style scoped>
.garage-source-art {
  box-sizing: border-box; min-width: 0; margin: 16px 0; padding: 12px;
  border: 1px solid #46648d; border-radius: 13px;
  background: radial-gradient(ellipse at 40% 0%, #162e4b, #0c192a 65%); color: #e0efff;
}
.garage-source-art summary {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  min-height: 44px; cursor: pointer; font-weight: 750;
}
.garage-source-soon { margin-inline-start: auto; border-radius: 100px; padding: 3px 8px;
  background: #5d456b88; color: #e5caff; font-size: 11px; letter-spacing: .02em; }
.garage-source-hint { font-size: 12px; line-height: 1.5; color: #abc8dd; margin: 8px 0; }
.garage-source-filters { display: flex; flex-wrap: wrap; gap: 7px; margin: 13px 0; }
.garage-source-filters button { min-height: 44px; padding: 7px 12px; border-radius: 8px;
  border: 1px solid #436584; background: #172b46; color: #d7ebff; cursor: pointer; }
.garage-source-filters button[aria-pressed="true"] { border-color: #72e3ff; color: #f8feff;
  background: linear-gradient(130deg, #174e70, #263c77); box-shadow: 0 0 10px #25b3e944; }
.garage-source-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: 10px; align-items: stretch; }
.garage-source-choice {
  display: block; box-sizing: border-box; min-width: 0; min-height: 44px; width: 100%;
  padding: 0; color: inherit; background: none; border: 0;
  border-radius: 14px; cursor: pointer; text-align: inherit; touch-action: manipulation;
  transition: transform .16s ease, box-shadow .16s ease;
}
.garage-source-choice :deep(.garage-badge-card) { height: 100%; margin: 0; }
.garage-source-choice[aria-pressed="true"] { outline: 2px solid #8beaff; outline-offset: 1px;
  box-shadow: 0 0 18px #21a5eb66; }
.garage-source-choice:focus-visible, .garage-source-filters button:focus-visible,
.garage-source-art summary:focus-visible { outline: 3px solid #74e6ff; outline-offset: 3px; }
.garage-source-detail { margin-top: 13px; padding: 12px; border: 1px solid #4e608b;
  border-radius: 12px; background: linear-gradient(140deg, #233456, #121f35); min-width: 0; }
.garage-source-detail-heading { display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  justify-content: space-between; }
.garage-source-detail-heading strong { font-size: 14px; color: #eefdff; }
.garage-source-detail-heading span { font-size: 11px; color: #e6c3f5; }
.garage-source-detail p { margin: 7px 0 0; color: #d0e1f4; font-size: 12px; line-height: 1.55;
  overflow-wrap: anywhere; }
@media (hover: hover) and (pointer: fine) {
  .garage-source-choice:hover { transform: translateY(-3px); box-shadow: 0 0 17px #3ec0f355; }
  .garage-source-filters button:hover { border-color: #7adcf7; }
}
@media (prefers-reduced-motion: reduce) { .garage-source-choice { transition: none; }
  .garage-source-choice:hover { transform: none; } }
</style>
