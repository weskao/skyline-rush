<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import GarageArtworkTile from './GarageArtworkTile.vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import { storeReadiness, storeReadinessText } from './garage-store-readiness.ts';
import { getLocale, onLocaleChange } from './i18n.ts';
import { WAVE3_PREVIEW_CATALOG, filterWave3PreviewItems, STORE_ITEM_PRESENTATION } from './garage-wave3-preview-catalog.ts';
import type { Wave3PreviewCategory, Wave3PreviewGroup, Wave3Text } from './garage-wave3-preview-catalog.ts';

const props = defineProps<{ category: Wave3PreviewCategory }>();
const detailsRef = ref<HTMLDetailsElement | null>(null);
function openStore(): void {
  if (props.category !== 'garage-store-readiness' || !detailsRef.value) return;
  detailsRef.value.open = true;
  detailsRef.value.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}
defineExpose({ openStore });
const locale = ref(getLocale());
const config = computed(() => WAVE3_PREVIEW_CATALOG[props.category]);
const storeState = storeReadiness();
const filter = ref<Wave3PreviewGroup>('all');
const visible = computed(() => filterWave3PreviewItems(props.category, filter.value));
const selected = ref(config.value.items[0].id);
const current = computed(() => visible.value.find(item => item.id === selected.value) ?? visible.value[0]);
const copy = (item: Wave3Text) => item[locale.value];
const storeStatusLabel = (id: string): string => {
  const unavailable = STORE_ITEM_PRESENTATION[id]?.availability === 'unavailable';
  return locale.value === 'zh-TW'
    ? (unavailable ? '尚未開放' : '即將推出')
    : (unavailable ? 'Unavailable' : 'Coming soon');
};
const image = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/${props.category}/raster/${id}@3x.${props.category === 'garage-store-readiness' ? 'png' : 'webp'}`;
const legacyStoreImage = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/garage-store-readiness/raster/${id}@3x.webp`;
function setFilter(group: Wave3PreviewGroup): void {
  filter.value = group;
  selected.value = filterWave3PreviewItems(props.category, group)[0]?.id ?? '';
}
let stopListening: (() => void) | undefined;
onMounted(() => { locale.value = getLocale(); stopListening = onLocaleChange(next => { locale.value = next; }); });
onUnmounted(() => stopListening?.());
</script>

<template>
  <details ref="detailsRef" :id="'garage-art-source-' + category" class="garage-source-art" :data-wave3-category="category">
    <summary>
      <span data-wave3-entry-icon class="garage-source-entry-icon">
        <GarageArtworkImage :src="image(category === 'garage-store-readiness' ? 'store-cart' : 'mission-race')"
          :size="40" :alt="''" :fallback-text="copy(config.heading)" loading="eager"
          :fallback-src="category === 'garage-store-readiness' ? legacyStoreImage('store-cart') : ''" />
      </span>
      {{ copy(config.heading) }}
      <span class="garage-source-soon">{{ locale === 'zh-TW' ? '概念預覽' : 'Preview' }}</span>
    </summary>
    <p v-if="category === 'garage-store-readiness'" class="garage-source-hint" role="status"
      :data-store-phase="storeState.phase">{{ storeReadinessText(locale) }}</p>
    <p class="garage-source-hint">{{ copy(config.notice) }}</p>
    <section v-if="category === 'garage-store-readiness'" class="garage-store-hero"
      data-store-catalog :aria-label="locale === 'zh-TW' ? '商店商品預覽' : 'Store catalog preview'">
      <div class="garage-store-hero-heading">
        <span class="garage-store-kicker">{{ locale === 'zh-TW' ? '商店展示' : 'GARAGE STORE' }}</span>
        <strong>{{ locale === 'zh-TW' ? '探索即將推出的外觀收藏' : 'Explore future cosmetic collections' }}</strong>
        <span class="garage-store-status">{{ locale === 'zh-TW' ? '尚未營運' : 'Not launched' }}</span>
      </div>
      <p>{{ locale === 'zh-TW'
        ? '你可以瀏覽分類和商品概念，但目前不提供價格、付款、兌換或道具所有權。'
        : 'Browse categories and preview concepts. Prices, checkout, redemption and item ownership are not available.' }}</p>
    </section>
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
          :size="config.cssSize" :tone="item.tone"
          :restored="category === 'garage-store-readiness'"
          :fallback-src="category === 'garage-store-readiness' ? legacyStoreImage(item.id) : ''" />
        <span v-if="category === 'garage-store-readiness'" class="garage-store-card-meta">
          <span v-if="STORE_ITEM_PRESENTATION[item.id]?.featured" data-store-featured class="garage-store-featured">
            {{ locale === 'zh-TW' ? '精選概念' : 'Featured concept' }}
          </span>
          <span :data-store-card-status="STORE_ITEM_PRESENTATION[item.id]?.availability"
            class="garage-store-card-status">{{ storeStatusLabel(item.id) }}</span>
        </span>
      </button>
    </div>
    <section v-if="current" class="garage-source-detail" :data-wave3-selected="current.id"
      :aria-label="locale === 'zh-TW' ? '素材詳情' : 'Artwork details'">
      <div class="garage-source-detail-heading">
        <strong>{{ copy(current.name) }}</strong>
        <span>{{ locale === 'zh-TW' ? '尚未開放' : 'Coming soon' }}</span>
      </div>
      <p data-wave3-description aria-live="polite" aria-atomic="true">{{ copy(current.description) }}</p>
      <div v-if="category === 'garage-store-readiness'" class="garage-store-detail-footer">
        <span role="status">{{ storeStatusLabel(current.id) }} · {{ locale === 'zh-TW' ? '純展示' : 'Display only' }}</span>
        <button type="button" disabled aria-disabled="true" data-store-purchase-disabled>
          {{ locale === 'zh-TW' ? '尚未開放' : 'Unavailable' }}
        </button>
      </div>
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
.garage-source-entry-icon { flex: none; width: 40px; height: 40px; display: grid; place-items: center; }
.garage-source-entry-icon :deep(img) { object-fit: contain; }
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
  display: flex; flex-direction: column; gap: 7px; box-sizing: border-box; min-width: 0; min-height: 44px; width: 100%;
  padding: 0; color: inherit; background: none; border: 0;
  border-radius: 14px; cursor: pointer; text-align: inherit; touch-action: manipulation;
  overflow: visible; transition: transform .16s ease, box-shadow .16s ease;
}
.garage-source-choice :deep(.garage-badge-card) { flex: 1 0 auto; width: 100%; height: auto; margin: 0; overflow: visible; }
.garage-source-choice :deep(.artwork-img) { object-fit: contain; object-position: center; image-rendering: auto; }
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
.garage-store-hero { margin: 12px 0 15px; padding: 14px; border: 1px solid #794ca3;
  border-radius: 14px; background: radial-gradient(ellipse at 0% 0%, #57216f85, transparent 65%),
  linear-gradient(135deg, #25173e, #13243a); min-width: 0; }
.garage-store-hero-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.garage-store-hero strong { font-size: clamp(13px, 1.7vw, 17px); color: #fff4ff; min-width: 0; overflow-wrap: anywhere; }
.garage-store-kicker { color: #e5a0ff; font-size: 10px; font-weight: 850; letter-spacing: .08em; }
.garage-store-status { margin-inline-start: auto; padding: 4px 8px; border-radius: 40px;
  background: #702a7970; border: 1px solid #cd82e8aa; color: #ffe3fc; font-size: 11px; }
.garage-store-hero p { margin: 9px 0 0; color: #c6d4eb; font-size: 12px; line-height: 1.55; overflow-wrap: anywhere; }
.garage-store-card-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;
  padding: 0 5px 9px; width: 100%; min-width: 0; box-sizing: border-box; }
.garage-store-card-meta > span { padding: 3px 7px; border-radius: 20px;
  font-size: 10px; line-height: 1.4; font-weight: 750; overflow-wrap: anywhere; }
.garage-store-featured { color: #ffebaa; border: 1px solid #a37b44;
  background: linear-gradient(135deg, #574021, #513466); }
.garage-store-card-status { color: #cce7ff; border: 1px solid #53789e; background: #182b48; }
.garage-store-card-status[data-store-card-status="unavailable"] { color: #e9cadb;
  border-color: #775467; background: #342839; }
.garage-store-detail-footer { margin-top: 12px; display: flex; flex-wrap: wrap;
  align-items: center; justify-content: space-between; gap: 10px; }
.garage-store-detail-footer span { color: #e6c4f7; font-size: 12px; }
.garage-store-detail-footer button { min-height: 44px; padding: 9px 16px;
  border: 1px solid #715672; border-radius: 10px; color: #bcb0c8;
  background: #272639; cursor: not-allowed; opacity: .85; }
@media (hover: hover) and (pointer: fine) {
  .garage-source-choice:hover { transform: translateY(-3px); box-shadow: 0 0 17px #3ec0f355; }
  .garage-source-filters button:hover { border-color: #7adcf7; }
}
@media (prefers-reduced-motion: reduce) { .garage-source-choice { transition: none; }
  .garage-source-choice:hover { transform: none; } }
</style>
