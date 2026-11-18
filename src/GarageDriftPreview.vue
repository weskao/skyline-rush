<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { garageStudioView, garageView } from './garage-view-state.ts';
import { PAINTS } from './appearance.ts';
import type { SkinId } from './garage-skin-catalog.ts';
import type { createGarageDriftPreview } from './garage-drift-preview.ts';

const props = defineProps<{ skin: SkinId; locale: string; label: string; poster: string }>();
const canvas = ref<HTMLCanvasElement>();
const model = ref<string | null>(null);
const ready = ref(false), allowed = ref(true), paused = ref(false), reduced = ref(false);
const title = computed(() => props.locale === 'zh-TW' ? '甩尾實景預覽' : 'Live drift preview');
const action = computed(() => props.locale === 'zh-TW' ? (paused.value ? '播放' : '暫停') : (paused.value ? 'Play' : 'Pause'));
let stage: ReturnType<typeof createGarageDriftPreview> | undefined;
let media: MediaQueryList, seen: IntersectionObserver, sized: ResizeObserver, settings: MutationObserver;
let live = true, visible = false, frame = 0, last = 0, elapsed = 0, low = false;

function draw(now: number) {
  frame = 0;
  if ((!visible && ready.value) || !stage || !allowed.value || document.hidden) return;
  if (!last || now - last >= 31 || paused.value || reduced.value) {
    if (last && !paused.value && !reduced.value) elapsed += Math.min(.06, (now - last) / 1000);
    last = now;
    stage.draw(elapsed, reduced.value || (paused.value && !ready.value), low);
    ready.value = true;
  }
  if (!paused.value && !reduced.value) schedule();
}
function schedule() {
  if (!frame && (visible || !ready.value) && stage) frame = requestAnimationFrame(draw);
}
function sync() {
  allowed.value = document.body.dataset.vfxEnabled !== 'false';
  low = document.body.dataset.vfxQuality === 'low';
  reduced.value = media.matches || document.body.classList.contains('vfx-comfort');
  last = 0;
  schedule();
}
function pause() { paused.value = !paused.value; last = 0; schedule(); }
function resize() {
  const element = canvas.value;
  if (element && stage) stage.resize(element.clientWidth, element.clientHeight);
  schedule();
}
function restart() {
  stage?.setSkin(props.skin);
  elapsed = 0;
  last = 0;
  schedule();
}

onMounted(async () => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  settings = new MutationObserver(sync);
  settings.observe(document.body, { attributes: true,
    attributeFilter: ['data-vfx-enabled', 'data-vfx-quality', 'class'] });
  sync();
  try {
    const { createGarageDriftPreview } = await import('./garage-drift-preview.ts');
    if (!live || !canvas.value) return;
    stage = createGarageDriftPreview(canvas.value, garageStudioView.car, PAINTS[garageView.selected]?.paint ?? '#dfe3ec');
    void stage.loaded.then(id => { if (live) { model.value = id; schedule(); } });
    restart();
    resize();
    seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; resize(); });
    sized = new ResizeObserver(resize);
    seen.observe(canvas.value);
    sized.observe(canvas.value);
  } catch { /* Keep the static artwork when a live context is unavailable. */ }
});
watch(() => props.skin, restart);
onBeforeUnmount(() => {
  live = false;
  media?.removeEventListener('change', sync);
  document.removeEventListener('visibilitychange', sync);
  seen?.disconnect();
  sized?.disconnect();
  settings?.disconnect();
  cancelAnimationFrame(frame);
  stage?.dispose();
});
</script>

<template>
  <figure class="garage-drift-preview" :data-drift-preview="skin" :data-live="ready && allowed"
    :data-car-model="model" :data-motion="paused || reduced ? 'paused' : 'running'" :aria-label="title + ' · ' + label">
    <div class="garage-drift-stage">
      <canvas ref="canvas" :class="{ hidden: !ready || !allowed }" aria-hidden="true" />
      <img v-if="!ready || !allowed" :src="poster" alt="" width="96" height="96">
    </div>
    <figcaption>
      <span><small>{{ title }}</small><strong>{{ label }}</strong></span>
      <button v-if="ready && allowed && !reduced" type="button" :aria-label="action + ' · ' + title" @click="pause">{{ action }}</button>
    </figcaption>
  </figure>
</template>

<style scoped>
.garage-drift-preview {
  overflow: hidden; margin: 0 0 12px; border: 1px solid #45647a;
  border-radius: 12px; color: #ecf5ff; background: #101b2a;
}
.garage-drift-stage { position: relative; aspect-ratio: 1.88; min-height: 108px; max-height: 222px; }
.garage-drift-stage canvas { display: block; width: 100%; height: 100%; }
.garage-drift-stage canvas.hidden { opacity: 0; }
.garage-drift-stage img { position: absolute; inset: 0; margin: auto; }
figcaption { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 54px; padding: 5px 8px 5px 12px; }
figcaption span { display: grid; gap: 2px; }
figcaption small { color: #a7becf; font-size: .72rem; }
figcaption button { min-width: 64px; min-height: 44px; padding-inline: 9px; }
</style>
