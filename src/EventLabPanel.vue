<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { getLocale, onLocaleChange, t, trackName } from './i18n.ts';
import { eventLabView, useEventCourse } from './event-lab-ui.ts';
import { COURSE_BYTES, COURSE_OBJECTS, CourseError, createCourse, createCourseHistory, exportCourse, importCourse,
  saveCourse, validateCourse, type CourseDocument, type CourseKind, type CourseTemplate } from './event-lab.ts';
import { RACE_TRACKS } from './game.js';

const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const locale = ref(getLocale());
const unsubscribe = onLocaleChange(value => { locale.value = value; });
onUnmounted(unsubscribe);
const text = (key: string) => t('lab.' + key, undefined, locale.value);
const draft = shallowRef<CourseDocument | null>(null);
let history: ReturnType<typeof createCourseHistory> | null = null;
let resetDocument: CourseDocument | null = null;
const error = ref(''), storageBlocked = ref(false), json = ref('');
const selected = ref(0), kind = ref<CourseKind>('barrier'), distance = ref(300), lane = ref(1);
const version = ref(0);
const canUndo = computed(() => { void version.value; return history?.canUndo() ?? false; });
const canRedo = computed(() => { void version.value; return history?.canRedo() ?? false; });
const unlocked = () => new Set(eventLabView.unlocked);
function attempt(action: () => void): void {
  try { action(); error.value = ''; } catch (cause) { error.value = cause instanceof CourseError ? cause.code : 'format'; }
}
function store(document: CourseDocument): void {
  draft.value = document; version.value++;
  selected.value = Math.min(selected.value, document.objects.length - 1);
  storageBlocked.value = !saveCourse(document);
}
function commit(value: unknown): void {
  const checked = validateCourse(value, unlocked(), eventLabView.obstacles);
  store(history!.commit(checked));
}
watch(() => eventLabView.open, open => {
  if (!open) { dialog.value?.close(); return; }
  attempt(() => {
    const initial = eventLabView.document ?? createCourse(eventLabView.trackId, 'slalom', 12345, unlocked(), eventLabView.obstacles);
    resetDocument = initial; history = createCourseHistory(initial); draft.value = initial;
    error.value = ''; json.value = ''; selected.value = 0; version.value++;
    dialog.value?.showModal();
  });
});
function template(name: CourseTemplate): void {
  attempt(() => commit(createCourse(eventLabView.trackId, name, draft.value!.seed, unlocked(), eventLabView.obstacles)));
}
function field(key: 'label' | 'seed' | 'modifier', event: Event): void {
  const input = event.target as HTMLInputElement;
  attempt(() => commit({ ...draft.value, [key]: key === 'seed' ? Number(input.value) : input.value }));
  if (draft.value) input.value = String(draft.value[key]);
}
function objectField(index: number, key: 'distance' | 'lane', event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = key === 'distance' ? Math.round(Number(input.value) / 10) * 10 : Number(input.value);
  attempt(() => commit({ ...draft.value, objects: draft.value!.objects.map((object, i) => i === index ? { ...object, [key]: value } : object) }));
  input.value = String(draft.value!.objects[index][key]);
}
function add(): void {
  attempt(() => commit({ ...draft.value, objects: [...draft.value!.objects, { kind: kind.value, distance: Math.round(distance.value / 10) * 10, lane: lane.value }] }));
}
function importDraft(): void { attempt(() => commit(importCourse(json.value, unlocked(), eventLabView.obstacles))); }
function close(): void { eventLabView.open = false; }
const errorText = computed(() => error.value ? text('error.' + error.value) : '');
const maxDistance = computed(() => (RACE_TRACKS as Record<string, { length: number }>)[eventLabView.trackId].length - 200);
const symbols: Record<CourseKind, string> = { barrier: '▰', ring: '◎', pickup: '◆', checkpoint: '⛩' };
</script>

<template>
  <dialog ref="dialog" id="event-lab-dialog" class="lab-dialog" aria-labelledby="lab-title" @cancel.prevent="close" @keydown.stop>
    <header class="lab-header"><div><small>SKYLINE / EVENT LAB</small><h2 id="lab-title">{{ text('title') }}</h2></div><button id="lab-close" type="button" @click="close">{{ text('close') }}</button></header>
    <template v-if="draft">
      <p class="lab-note">{{ trackName(draft.trackId, locale) }} · {{ text('intro') }}</p>
      <div class="lab-toolbar"><button type="button" @click="template('slalom')">{{ text('slalom') }}</button><button type="button" @click="template('collect')">{{ text('collect') }}</button><button id="lab-template-checkpoints" type="button" @click="template('checkpoints')">{{ text('checkpoints') }}</button>
        <button id="lab-undo" type="button" :disabled="!canUndo" @click="store(history!.undo())">{{ text('undo') }}</button>
        <button id="lab-redo" type="button" :disabled="!canRedo" @click="store(history!.redo())">{{ text('redo') }}</button>
        <button id="lab-reset" type="button" @click="store(history!.reset(resetDocument!))">{{ text('reset') }}</button></div>
      <div class="lab-fields"><label>{{ text('label') }}<input id="lab-label" :value="draft.label" maxlength="40" @change="field('label', $event)"></label>
        <label>{{ text('seed') }}<input id="lab-seed" type="number" min="0" max="4294967295" :value="draft.seed" @change="field('seed', $event)"></label>
        <label>{{ text('modifier') }}<select id="lab-modifier" :value="draft.modifier" @change="field('modifier', $event)"><option value="standard">{{ text('standard') }}</option><option value="relaxed">{{ text('relaxed') }}</option></select></label></div>
      <p id="lab-feedback" class="lab-note">{{ text('safe') }} · {{ draft.objects.length }} / {{ COURSE_OBJECTS }}</p>
      <p id="lab-error" class="lab-error" role="alert">{{ errorText }}</p>
      <p v-if="storageBlocked" role="status">{{ text('storage') }}</p>
      <div class="lab-designer">
        <div class="lab-map" role="group" :aria-label="text('map')">
          <div class="lab-lane-head"><span v-for="n in 4" :key="n">{{ n - 1 }}</span></div>
          <button v-for="(object, index) in draft.objects" :key="index" type="button" class="lab-marker" :class="{ selected: selected === index }" :style="{ left: `${object.lane * 25 + 12.5}%`, top: `${(object.distance - 200) / (maxDistance - 200) * 90 + 5}%` }"
            :aria-label="`${text(object.kind)} · ${object.distance} m · ${text('lane')} ${object.lane}`" :aria-pressed="selected === index" @click="selected = index">{{ symbols[object.kind] }}</button>
        </div>
        <ol class="lab-objects">
          <li v-for="(object, index) in draft.objects" :key="index" :class="{ selected: selected === index }" @focusin="selected = index">
            <strong>{{ symbols[object.kind] }} {{ text(object.kind) }}</strong>
            <label>{{ text('distance') }}<input type="number" :aria-label="`${text('distance')} ${index + 1}`" :value="object.distance" min="200" :max="maxDistance" step="10" @change="objectField(index, 'distance', $event)"></label>
            <label>{{ text('lane') }}<input data-lab-lane type="number" :aria-label="`${text('lane')} ${index + 1}`" :value="object.lane" :min="object.kind === 'ring' ? 1 : 0" :max="object.kind === 'ring' ? 2 : 3" step="1" @change="objectField(index, 'lane', $event)"></label>
            <button type="button" :disabled="draft.objects.length === 1" :aria-label="`${text('remove')} ${index + 1}`" @click="attempt(() => commit({ ...draft, objects: draft!.objects.filter((_, i) => i !== index) }))">×</button>
          </li>
        </ol>
      </div>
      <fieldset class="lab-fields"><legend>{{ text('add') }}</legend><label>{{ text('object') }}<select id="lab-kind" v-model="kind"><option v-for="entry in (['barrier', 'ring', 'pickup', 'checkpoint'] as const)" :key="entry" :value="entry">{{ text(entry) }}</option></select></label>
        <label>{{ text('distance') }}<input id="lab-distance" v-model.number="distance" type="number" min="200" :max="maxDistance" step="10"></label>
        <label>{{ text('lane') }}<input id="lab-lane" v-model.number="lane" type="number" min="0" max="3" step="1"></label><button id="lab-add" type="button" @click="add">{{ text('add') }}</button></fieldset>
      <details class="lab-share"><summary>{{ text('share') }}</summary>
        <label for="lab-json">{{ text('json') }} · {{ COURSE_BYTES / 1024 }} KB</label><textarea id="lab-json" v-model="json" :maxlength="COURSE_BYTES" rows="5" spellcheck="false"></textarea>
        <div class="lab-toolbar"><button id="lab-export" type="button" @click="json = exportCourse(draft); error = ''">{{ text('export') }}</button><button id="lab-import" type="button" @click="importDraft">{{ text('import') }}</button></div>
      </details>
      <p class="lab-note">{{ text('limits') }}</p>
      <footer class="lab-footer"><button id="lab-use" class="primary-button" type="button" @click="attempt(() => useEventCourse(draft!))">{{ text('use') }}</button></footer>
    </template>
  </dialog>
</template>

<style scoped>
.lab-dialog { width: min(780px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); box-sizing: border-box; overflow: auto; border: 1px solid #83acba; border-radius: 16px; padding: 20px; background: #11232f; color: #eef7fa; }
.lab-dialog::backdrop { background: #030c14d9; }
.lab-header, .lab-toolbar, .lab-fields, .lab-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lab-header { justify-content: space-between; }.lab-header h2 { margin: 5px 0; }.lab-header small { color: #62dfcb; letter-spacing: .12em; }
.lab-dialog button, .lab-dialog input, .lab-dialog select { min-height: 44px; border: 1px solid #728b9b; border-radius: 6px; background: #172e3c; color: inherit; padding: 6px 10px; box-sizing: border-box; }
.lab-dialog button { cursor: pointer; }.lab-dialog button:disabled { opacity: .4; cursor: default; }
.lab-dialog :focus-visible { outline: 3px solid #6df1db; outline-offset: 2px; }
.lab-fields { margin-top: 12px; }.lab-fields label { flex: 1; min-width: 110px; }.lab-fields input, .lab-fields select { display: block; width: 100%; margin-top: 4px; }
.lab-note { font-size: 13px; line-height: 1.5; color: #bed1de; }.lab-error { min-height: 20px; color: #ffd1b2; font-size: 14px; }
.lab-designer { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 12px; height: 320px; }
.lab-map { position: relative; background: repeating-linear-gradient(90deg, #203747 0%, #203747 calc(25% - 1px), #7894a5 calc(25% - 1px), #7894a5 25%); border-radius: 8px; border: 1px solid #7894a5; }
.lab-lane-head { display: flex; color: #d4e4ee; font-size: 12px; }.lab-lane-head span { width: 25%; text-align: center; }
.lab-dialog .lab-marker { position: absolute; transform: translate(-50%, -50%); width: 44px; padding: 0; font-size: 22px; z-index: 1; }
.lab-marker.selected, .lab-objects .selected { border-color: #6df1db; background-color: #28514e; }
.lab-objects { overflow: auto; padding: 0 4px; margin: 0; list-style: none; }.lab-objects li { display: grid; grid-template-columns: minmax(80px, 1fr) 86px 64px 44px; align-items: end; gap: 6px; margin-bottom: 8px; padding: 6px; border: 1px solid #506675; border-radius: 8px; }
.lab-objects strong { align-self: center; font-size: 12px; }.lab-objects label { font-size: 11px; }.lab-objects input { width: 100%; }.lab-share { margin-top: 16px; }.lab-share summary { min-height: 44px; cursor: pointer; }.lab-share textarea { width: 100%; box-sizing: border-box; background: #08151d; color: #eef7fa; border: 1px solid #7894a5; padding: 8px; }.lab-footer { justify-content: flex-end; margin-top: 12px; }
@media (max-width: 600px) { .lab-dialog { padding: 12px; }.lab-designer { grid-template-columns: 1fr; height: auto; gap: 10px; }.lab-map { height: 320px; }.lab-objects { max-height: 320px; }.lab-objects li { grid-template-columns: 1fr 56px 44px; gap: 4px; }.lab-objects strong { grid-column: 1 / -1; }.lab-objects input { padding: 6px 3px; }.lab-fields label { min-width: 100px; }.lab-footer button { width: 100%; }.lab-header h2 { font-size: 21px; } }
</style>
