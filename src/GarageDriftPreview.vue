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
      <button v-if="ready && allowed && !reduced" class="drift-playback" type="button"
        :data-paused="paused" :aria-label="action + ' · ' + title" :title="action" @click="pause">
        <svg viewBox="0 0 24 24" :data-glyph="paused ? 'play' : 'pause'" aria-hidden="true" focusable="false">
          <path v-if="paused" d="M8 4.8a1 1 0 0 1 1.5-.86l11 7.2a1 1 0 0 1 0 1.72l-11 7.2A1 1 0 0 1 8 19.2z"/>
          <path v-else d="M6 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 0h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>
        </svg>
      </button>
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
.drift-playback {
  --rim: #66859b; --face: #254f67; --edge: #93d9ed;
  position: relative; display: grid; place-items: center; flex: 0 0 44px;
  width: 44px; height: 44px; box-sizing: border-box; padding: 0; color: #e9f9ff;
  border: 1px solid var(--rim); border-radius: 50%;
  background: radial-gradient(ellipse at 38% 18%, var(--face), #101f30 74%);
  box-shadow: inset 0 1px 1px #c8f4ff36, inset 0 -2px 4px #0007, 0 3px 8px #050d16a8;
}
.drift-playback[data-paused="true"] { --rim: #60b5d1; --face: #2b7692; --edge: #b7f3ff; }
.drift-playback::before {
  content: ''; position: absolute; inset: 4px; border: 1px solid #b6ebff26;
  border-radius: inherit; pointer-events: none;
}
.drift-playback svg {
  width: 21px; height: 21px; fill: currentColor; filter: drop-shadow(0 1px 2px #051927);
}
@media (hover: hover) {
  .drift-playback:hover { border-color: var(--edge); }
}
.drift-playback:active { box-shadow: inset 0 2px 5px #000a; }
.drift-playback:focus-visible { outline: 2px solid #a3edff; outline-offset: 2px; }
</style>
