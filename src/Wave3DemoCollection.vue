<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import { skinArtwork } from './garage-skin-catalog.ts';
import type { SkinId } from './garage-skin-catalog.ts';
import type { ExperienceSnapshot, Wave3ExperiencePort } from './wave3-experience-contract.ts';
import {
  WAVE3_DEMO_ITEMS, canEquipDemoPreview, demoItemStatus, demoItemStatusText,
} from './wave3-demo-catalog.ts';
import type { DemoItemStatus, DemoTrialAccess } from './wave3-demo-catalog.ts';

const props = withDefaults(defineProps<{
  port: Wave3ExperiencePort;
  locale?: string;
  trialAccess?: (id: SkinId) => DemoTrialAccess | null;
  skinRevision?: number;
}>(), { locale: 'en' });
const emit = defineEmits<{
  (event: 'preview', itemId: SkinId): void;
  (event: 'equipped-preview', itemId: SkinId): void;
  (event: 'open-store'): void;
  (event: 'return-to-race'): void;
}>();

const tr = (en: string, zh: string) => props.locale === 'zh-TW' ? zh : en;
const snapshot = ref<ExperienceSnapshot>(props.port.getSnapshot());
const filter = ref<'all' | DemoItemStatus>('all');
const filters = ['all', 'demo-unlocked', 'trial', 'locked', 'preview-only'] as const;
const selectedId = ref<SkinId | null>(null);
const message = ref('');

watch(() => props.port, (port, _, onCleanup) => {
  snapshot.value = port.getSnapshot();
  selectedId.value = null;
  message.value = '';
  const stop = port.subscribe(next => {
    if (next.accountId !== snapshot.value.accountId) {
      selectedId.value = null;
      message.value = '';
    }
    snapshot.value = next;
  });
  onCleanup(stop);
}, { immediate: true });

const statusFor = (id: SkinId): DemoItemStatus => {
  void props.skinRevision; // Integration owner passes this reactive revision for trial expiry.
  return demoItemStatus(id, snapshot.value, props.trialAccess?.(id));
};
const artwork = (id: SkinId) => skinArtwork(id, import.meta.env.BASE_URL);
const items = computed(() => WAVE3_DEMO_ITEMS.filter(item =>
  filter.value === 'all' || statusFor(item.id) === filter.value));
const selected = computed(() => WAVE3_DEMO_ITEMS.find(item => item.id === selectedId.value));
const equipped = computed(() => snapshot.value.equippedPreview &&
  canEquipDemoPreview(snapshot.value.equippedPreview, snapshot.value)
    ? snapshot.value.equippedPreview : null);
const unlockedCount = computed(() => WAVE3_DEMO_ITEMS.filter(item =>
  canEquipDemoPreview(item.id, snapshot.value)).length);
const filterLabel = (status: 'all' | DemoItemStatus) =>
  status === 'all' ? tr('All', '全部') : demoItemStatusText(status, props.locale);

function preview(id: SkinId): void {
  selectedId.value = id;
  message.value = '';
  emit('preview', id);
}
function equipSelected(): void {
  const id = selectedId.value;
  if (!id || !canEquipDemoPreview(id, props.port.getSnapshot())) {
    message.value = tr('Only active demo-unlocked items can be equipped here. Garage trials remain separate.',
      '僅能裝備目前已試玩取得的外觀；車庫試用功能另行管理。');
    return;
  }
  const currentAccount = snapshot.value.accountId;
  if (props.port.getSnapshot().accountId !== currentAccount) {
    selectedId.value = null;
    message.value = tr('Account changed. Select an item again.', '帳號已切換，請重新選取。');
    return;
  }
  const result = props.port.equipPreview(id);
  snapshot.value = result.snapshot;
  if (result.status === 'completed') {
    message.value = tr('Demo preview equipped. Return to racing to see it after Garage integration.',
      '已切換試玩裝備。車庫完成接線後，返回比賽即可查看。');
    emit('equipped-preview', id);
  } else {
    message.value = result.status === 'duplicate'
      ? tr('Already selected for demo.', '已選取此試玩外觀。')
      : tr('Demo equip unavailable. Existing equipment is unchanged.', '無法裝備試玩外觀，既有裝備未變更。');
  }
}
function closePreview(): void {
  selectedId.value = null;
  message.value = '';
}
</script>

<template>
  <section class="wave3-demo-collection" data-wave3-demo-collection
    :aria-label="tr('Demo Collection', '試玩收藏')" @keydown.esc.stop="closePreview">
    <header class="collection-head">
      <div>
        <span class="collection-kicker">{{ tr('LOCAL COSMETIC PREVIEWS', '本機外觀試玩') }}</span>
        <h3>{{ tr('Demo Collection', '試玩收藏') }}</h3>
        <p>{{ tr('Demo unlocks are disposable and never permanent ownership.',
          '試玩取得的外觀可重設，並非永久擁有權。') }}</p>
      </div>
      <div class="collection-count" role="status" aria-live="polite">
        <strong>{{ unlockedCount }}</strong>
        <span>{{ tr('Demo unlocked', '試玩取得') }}</span>
      </div>
    </header>

    <p v-if="unlockedCount === 0" class="collection-empty" role="status">
      {{ tr('Your Demo Collection is empty. Browse cosmetics and earn demo points in races to try an unlock.',
        '目前沒有試玩收藏。可瀏覽外觀，並透過比賽取得試玩點數後兌換。') }}
      <button type="button" @click="emit('open-store')">{{ tr('Open Demo Store', '開啟試玩商城') }}</button>
    </p>

    <nav class="collection-filters" :aria-label="tr('Filter collection statuses', '篩選收藏狀態')">
      <button v-for="state in filters" :key="state" type="button"
        :aria-pressed="filter === state" @click="filter = state; closePreview()">
        {{ filterLabel(state) }}
      </button>
    </nav>

    <p v-if="items.length === 0" class="collection-empty" role="status">
      {{ tr('No cosmetics match this filter.', '沒有符合此篩選的外觀。') }}
    </p>
    <div v-else class="collection-grid">
      <button v-for="item in items" :key="item.id" type="button" class="collection-item"
        :data-demo-id="item.id" :data-demo-status="statusFor(item.id)"
        :aria-pressed="selectedId === item.id" @click="preview(item.id)">
        <span class="collection-image">
          <GarageArtworkImage :src="artwork(item.id)?.src ?? ''"
            :fallback-src="artwork(item.id)?.fallback" :size="96"
            :alt="item.name[locale === 'zh-TW' ? 'zh-TW' : 'en']"
            :fallback-text="item.name[locale === 'zh-TW' ? 'zh-TW' : 'en']" />
        </span>
        <strong>{{ item.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</strong>
        <span class="collection-state">{{ demoItemStatusText(statusFor(item.id), locale) }}</span>
        <span v-if="equipped === item.id" class="collection-equipped">{{ tr('Demo equipped', '試玩已裝備') }}</span>
      </button>
    </div>

    <section v-if="selected" class="collection-detail" :aria-label="tr('Selected cosmetic', '選取的外觀')">
      <h4>{{ selected.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</h4>
      <p>{{ demoItemStatusText(statusFor(selected.id), locale) }}</p>
      <p v-if="statusFor(selected.id) === 'trial'">
        {{ tr('Trial access belongs to Garage. Preview here; this demo collection does not grant trial entitlements.',
          '試用資格由車庫管理；此處僅預覽，不會額外發放試用權限。') }}
      </p>
      <div class="collection-actions">
        <button type="button" @click="emit('preview', selected.id)">{{ tr('Inspect preview', '檢視預覽') }}</button>
        <button type="button" :disabled="!canEquipDemoPreview(selected.id, snapshot) || equipped === selected.id"
          @click="equipSelected">{{ equipped === selected.id ? tr('Demo equipped', '試玩已裝備') : tr('Equip demo preview', '裝備試玩外觀') }}</button>
        <button type="button" @click="closePreview">{{ tr('Close preview', '關閉預覽') }}</button>
      </div>
    </section>

    <div class="collection-actions collection-footer">
      <button type="button" @click="emit('open-store')">{{ tr('Browse Demo Store', '瀏覽試玩商城') }}</button>
      <button type="button" @click="emit('return-to-race')">{{ tr('Return to racing', '返回比賽') }}</button>
    </div>
    <p class="collection-message" role="status" aria-live="polite">{{ message }}</p>
    <p class="collection-disclaimer">{{ tr('Only this device · No payment · No Cloud Save grants · Guest-friendly',
      '僅限此裝置 · 無付款 · 不授予雲端收藏 · 訪客可用') }}</p>
  </section>
</template>

<style scoped>
.wave3-demo-collection { box-sizing: border-box; min-width: 0; padding: 14px; border: 1px solid #3b7dab;
  border-radius: 16px; background: radial-gradient(ellipse at 10% 0, #283e68 0, transparent 50%), #091b30; color: #eaf5ff; }
.collection-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
.collection-head > div:first-child { flex: 1 1 200px; min-width: 0; }
.collection-kicker { color: #79e0f1; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.collection-head h3 { margin: 6px 0; font-size: clamp(18px, 2vw, 24px); }
.collection-head p, .collection-disclaimer { margin: 0; font-size: 12px; line-height: 1.6; color: #bfd6ed; }
.collection-count { min-width: 110px; padding: 10px; display: flex; flex-direction: column; text-align: center;
  border: 1px solid #41cfc5; border-radius: 12px; background: #0a3540; }
.collection-count strong { font-variant-numeric: tabular-nums; font-size: 26px; }
.collection-count span { color: #a0f6dc; font-size: 11px; }
.collection-filters, .collection-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.collection-filters { margin: 14px 0; }
button { box-sizing: border-box; min-height: 44px; cursor: pointer; touch-action: manipulation; color: inherit; }
.collection-filters button, .collection-actions button, .collection-empty button { border: 1px solid #557fab;
  border-radius: 9px; background: #1a3659; padding: 9px 12px; }
.collection-filters button[aria-pressed="true"] { border-color: #6ce5ef; background: #22617f; }
button:focus-visible { outline: 3px solid #9ef3ff; outline-offset: 2px; }
button:disabled { cursor: not-allowed; opacity: .55; }
.collection-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 148px), 1fr)); gap: 10px; }
.collection-item { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 8px;
  text-align: center; background: linear-gradient(160deg, #14354d, #111d35); border: 1px solid #476787; border-radius: 13px; }
.collection-item[aria-pressed="true"] { border-color: #73eff4; box-shadow: 0 0 0 1px #4cbce8; }
.collection-image { box-sizing: border-box; width: 112px; height: 112px; padding: 8px; display: grid; place-items: center; }
.collection-item strong { font-size: 12px; overflow-wrap: anywhere; }
.collection-state, .collection-equipped { font-size: 11px; border: 1px solid #9f7ad1; border-radius: 16px; padding: 3px 7px; }
.collection-item[data-demo-status="demo-unlocked"] .collection-state, .collection-equipped {
  color: #96ffe4; border-color: #44cfae; }
.collection-equipped { background: #0e483a; }
.collection-empty { margin: 14px 0; padding: 12px; background: #1a314b; border-radius: 10px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 12px; line-height: 1.6; }
.collection-detail { margin-top: 12px; padding: 13px; border: 1px solid #507da0;
  border-radius: 12px; background: #13304a; }
.collection-detail h4 { margin: 0 0 7px; }
.collection-detail p { margin: 4px 0 10px; font-size: 12px; line-height: 1.5; }
.collection-footer { margin-top: 14px; }
.collection-message { min-height: 1.5em; margin: 12px 0 5px; color: #ffe0a9; font-size: 12px; }
@media (max-width: 440px) { .wave3-demo-collection { padding: 9px; } .collection-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
</style>
