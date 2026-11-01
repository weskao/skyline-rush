import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS, createRace } from '../src/game.js';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { layoutVersion, raceLayout, recordTrackId, runLayout, parseRecordTrackId, isCurrentLayout } from '../src/record-layout.ts';
import { BEST_KEY, recordBest, loadBests, recordRace, loadModeBest, recordModeRace, loadModeHistory, loadGhost, saveGhost, loadModeGhost, saveModeGhost } from '../src/history.ts';
import { loadCircuitLapBest, circuitLapKey } from '../src/circuit-records.ts';
import { mergeProgress, mergeModeBests, readLocalProgress, saveLocalProgress, parseProgressExport, readLocalModeBests, saveLocalModeBests } from '../src/cloud-progress.ts';
import { settleRace } from '../src/race-results.ts';
import { createGhostStore } from '../src/ghost-store.ts';
import { GHOST_RATE } from '../src/ghost.ts';

// A layout change makes older times incomparable: these five tracks moved to layout 2 (more or earlier
// rings); Aurora and the World Tour keep layout 1 and their record keys bit-for-bit.
const VERSIONED = ['coast', 'neon', 'canyon', 'spiral', CIRCUIT_ID];
const UNCHANGED = ['aurora', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const memory = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); }, removeItem: key => { delete data[key]; } };
};
const lap = time => ({ time, splits: [time / 4, time / 2, time * 3 / 4, time] });
const ghost = (trackId, time, config) => {
  const { length } = config ? createRace(trackId, config) : createRace(trackId), count = Math.floor(time * GHOST_RATE) + 1;
  return { time, samples: Array.from({ length: count }, (_, i) => [length * i / (count - 1), 0, 0]) };
};

test('layout versions: the five tuned tracks are layout 2, everything else stays layout 1', () => {
  for (const id of VERSIONED) assert.equal(layoutVersion(id), 2, id);
  for (const id of UNCHANGED) assert.equal(layoutVersion(id), 1, id);
  assert.equal(layoutVersion('nowhere'), 1);
  assert.equal(recordTrackId('coast'), 'coast@2');
  assert.equal(recordTrackId(CIRCUIT_ID), CIRCUIT_ID + '@2');
  for (const id of UNCHANGED) assert.equal(recordTrackId(id), id, id + ' keeps its bare record id');
});

test('a Cup takes the newest layout among its tracks; Endless and Event Lab never use the track rings', () => {
  assert.equal(raceLayout('aurora', { mode: 'cup', cupTracks: ['aurora', 'coast', 'taipei'] }), 2);
  assert.equal(raceLayout('aurora', { mode: 'cup', cupTracks: ['aurora', 'taipei'] }), 1);
  assert.equal(recordTrackId('coast', { mode: 'endless' }), 'coast');
  assert.equal(recordTrackId('coast', { mode: 'eventlab' }), 'coast');
  assert.equal(recordTrackId('coast', { mode: 'time' }), 'coast@2');
});

test('record ids parse back; a run without a layout field is layout 1', () => {
  assert.deepEqual(parseRecordTrackId('coast@2'), { trackId: 'coast', layout: 2 });
  assert.deepEqual(parseRecordTrackId('aurora'), { trackId: 'aurora', layout: 1 });
  for (const bad of ['aurora@2', 'coast@1', 'coast@3', 'coast@', '@2', 'coast@2@2', 5]) assert.equal(parseRecordTrackId(bad), null, String(bad));
  assert.equal(runLayout({}), 1);
  assert.equal(runLayout({ layout: 2 }), 2);
  assert.equal(runLayout({ layout: 'x' }), 1);
  assert.equal(isCurrentLayout({ track: 'coast' }), false);
  assert.equal(isCurrentLayout({ track: 'coast', layout: 2 }), true);
  assert.equal(isCurrentLayout({ track: 'aurora' }), true);
});

test('AC1 Classic: an old-layout best never blocks a NEW RECORD and its saved value is kept', () => {
  const storage = memory({ [BEST_KEY]: JSON.stringify({ coast: 40, aurora: 50 }) });
  assert.deepEqual(recordBest(recordTrackId('coast'), 70, storage), { best: 70, record: true });
  assert.deepEqual(loadBests(storage), { coast: 40, aurora: 50, 'coast@2': 70 });
  assert.deepEqual(recordBest(recordTrackId('aurora'), 55, storage), { best: 50, record: false });
});

test('AC1 Classic settlement: a new-layout run is a record against old bests; the legacy key is never touched', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = memory({ [BEST_KEY]: JSON.stringify({ coast: 40 }), 'skyline-rush-best': '40' });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    const race = { ...createRace('coast'), elapsed: 70, result: { position: 1, time: 70, stars: 1 } };
    const progress = { unlocked: new Set(['coast']), bests: { coast: 40 }, stars: {}, medals: {}, history: [], modeHistory: [], daily: [], challengeMedals: { version: 1, awards: {}, longestFlight: 0, maxAerialCombo: 0 } };
    const saved = [];
    const settlement = settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress, ghosts: { saveClassic: (...args) => saved.push(args) }, daily: null, trace: ghost('coast', 70).samples });
    assert.equal(settlement.record, true);
    assert.equal(settlement.best, 70);
    assert.equal(progress.bests['coast@2'], 70);
    assert.equal(progress.bests.coast, 40);
    assert.equal(storage.data['skyline-rush-best'], '40');
    assert.equal(progress.history.at(-1).layout, 2);
    assert.deepEqual(saved.map(([id]) => id), ['coast']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
  }
});

test('Classic history: new runs on a tuned track carry layout 2; untouched tracks keep their exact record shape', () => {
  const storage = memory();
  assert.equal(recordRace({ trackId: 'neon', length: 4000, result: { position: 1, time: 50 } }, storage).layout, 2);
  assert.equal('layout' in recordRace({ trackId: 'aurora', length: 4000, result: { position: 1, time: 50 } }, storage), false);
});

test('Classic ghosts: the new layout gets its own slot and the old ghost stays where it was', () => {
  const old = ghost('coast', 40), storage = memory({ 'skyline-rush-ghosts': JSON.stringify({ coast: old }) });
  assert.equal(loadGhost('coast', storage), null, 'an old-layout ghost is never raced against');
  const fresh = ghost('coast', 70);
  saveGhost('coast', fresh, storage);
  const stored = JSON.parse(storage.data['skyline-rush-ghosts']);
  assert.deepEqual(stored.coast, old);
  assert.deepEqual(stored['coast@2'], fresh);
  assert.deepEqual(loadGhost('coast', storage), fresh);
  saveGhost('aurora', ghost('aurora', 60), storage);
  assert.ok(JSON.parse(storage.data['skyline-rush-ghosts']).aurora);
});

test('AC1 modes: best, ghost and history compare only runs of the same layout', () => {
  const config = createRace('coast', { mode: 'time' }).config, rules = JSON.stringify(config);
  const storage = memory({
    'skyline-rush-mode-history-v1': JSON.stringify([{ date: '2026-01-01T00:00:00.000Z', mode: 'time', track: 'coast', rules, time: 40 }]),
    'skyline-rush-mode-bests-v1': JSON.stringify({ [JSON.stringify(['coast', config])]: 40 }),
    'skyline-rush-mode-ghosts-v1': JSON.stringify({ ['coast:' + rules]: ghost('coast', 40, config) }),
  });
  assert.equal(loadModeBest('coast', config, storage), null);
  assert.equal(loadModeGhost('coast', config, storage), null);
  const race = { ...createRace('coast', config), result: { time: 70, position: 1, score: 0, success: true } };
  assert.deepEqual(recordModeRace(race, storage), { best: 70, record: true });
  assert.equal(loadModeHistory(storage).at(-1).layout, 2);
  const bests = JSON.parse(storage.data['skyline-rush-mode-bests-v1']);
  assert.equal(bests[JSON.stringify(['coast', config])], 40, 'old permanent best kept');
  assert.equal(bests[JSON.stringify(['coast@2', config])], 70);
  assert.ok(saveModeGhost('coast', config, ghost('coast', 70, config), storage));
  assert.ok(JSON.parse(storage.data['skyline-rush-mode-ghosts-v1'])['coast:' + rules], 'old mode ghost kept');
  assert.equal(loadModeGhost('coast', config, storage).time, 70);
});

test('AC3 modes: an untouched track keeps its bare mode keys and no layout field', () => {
  const config = createRace('aurora', { mode: 'time' }).config, storage = memory();
  recordModeRace({ ...createRace('aurora', config), result: { time: 70, position: 1, score: 0, success: true } }, storage);
  assert.deepEqual(Object.keys(JSON.parse(storage.data['skyline-rush-mode-bests-v1'])), [JSON.stringify(['aurora', config])]);
  assert.equal('layout' in loadModeHistory(storage).at(-1), false);
});

test('Circuit: total and lap bests move to the layout 2 keys and ignore old laps', () => {
  const config = createRace(CIRCUIT_ID, { mode: 'circuit', laps: 3 }).config;
  const storage = memory({ 'skyline-rush-mode-bests-v1': JSON.stringify({ [JSON.stringify([CIRCUIT_ID, config, 'lap'])]: 20 }) });
  assert.equal(circuitLapKey(config), JSON.stringify([CIRCUIT_ID + '@2', config, 'lap']));
  assert.equal(loadCircuitLapBest(config, storage), null);
  const race = createRace(CIRCUIT_ID, config);
  recordModeRace({ ...race, result: { time: 100, position: 1, score: 0, success: true, lapTimes: [lap(30), lap(35), lap(35)] } }, storage);
  assert.equal(loadCircuitLapBest(config, storage), 30);
  assert.equal(JSON.parse(storage.data['skyline-rush-mode-bests-v1'])[JSON.stringify([CIRCUIT_ID, config, 'lap'])], 20);
});

test('the ghost store races the layout 2 ghost', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory({ 'skyline-rush-ghosts': JSON.stringify({ neon: ghost('neon', 30) }) }) });
  try {
    assert.equal(createGhostStore().forRace({ trackId: 'neon', mode: 'classic', config: {} }), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
  }
});

test('AC2 cloud: old and new Classic bests, versioned mode keys and layout fields survive every merge', () => {
  const config = createRace('coast', { mode: 'time' }).config, rules = JSON.stringify(config);
  const local = { bests: { coast: 40, 'coast@2': 70, aurora: 50 },
    history: [{ date: '2026-01-01T00:00:00.000Z', track: 'coast', position: 1, time: 40 }, { date: '2026-02-01T00:00:00.000Z', track: 'coast', position: 1, time: 70, layout: 2 }],
    modeHistory: [{ date: '2026-02-01T00:00:00.000Z', mode: 'time', track: 'coast', rules, time: 70, layout: 2 }] };
  const merged = mergeProgress(local, { version: 2, bests: { 'coast@2': 65, 'neon@2': 30, 'aurora@2': 1, 'nowhere@2': 1 } });
  assert.deepEqual(merged.bests, { coast: 40, 'coast@2': 65, aurora: 50, 'neon@2': 30 });
  assert.deepEqual(merged.history.map(run => run.layout), [undefined, 2]);
  assert.equal(merged.modeHistory[0].layout, 2);
  assert.deepEqual(mergeProgress(merged, null), merged, 'a merged snapshot round-trips unchanged');
  const versioned = JSON.stringify(['coast@2', config]), old = JSON.stringify(['coast', config]);
  assert.deepEqual(mergeModeBests({ bests: { [versioned]: 70, [old]: 40, [JSON.stringify(['aurora@2', config])]: 1 } }).bests, { [versioned]: 70, [old]: 40 });
});

test('AC3: other tracks keep every record key bit-for-bit', () => {
  const storage = memory();
  for (const id of UNCHANGED) recordBest(recordTrackId(id), 60, storage);
  assert.deepEqual(Object.keys(JSON.parse(storage.data[BEST_KEY])).sort(), [...UNCHANGED].sort());
  assert.ok(Object.keys(RACE_TRACKS).every(id => recordTrackId(id) === id || VERSIONED.includes(id)));
});

test('AC4 History: old-layout runs stay listed with an Old layout tag and never count as best or trend', async () => {
  const { createHistoryView } = await import('../src/history-ui.ts');
  const { historyView } = await import('../src/history-view-state.ts');
  const { setLocale, t } = await import('../src/i18n.ts');
  const config = { mode: 'time' }, rules = JSON.stringify(config);
  const sessionHistory = [{ track: 'coast', time: 40, position: 1, date: '2026-01-01T00:00:00Z' }, { track: 'coast', time: 70, position: 1, date: '2026-02-01T00:00:00Z', layout: 2 }];
  const sessionModeHistory = [{ track: 'coast', mode: 'time', rules, time: 40, date: '2026-01-01T00:00:00Z' }, { track: 'coast', mode: 'time', rules, time: 70, date: '2026-02-01T00:00:00Z', layout: 2 }];
  const restore = ['localStorage', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  Object.defineProperty(globalThis, 'localStorage', { value: memory({ 'skyline-rush-mode-history-v1': JSON.stringify(sessionModeHistory) }), configurable: true });
  Object.defineProperty(globalThis, 'document', { value: { querySelector: s => ({ value: s === '#history-track' ? 'coast' : 'all' }) }, configurable: true });
  try {
    for (const locale of ['en', 'zh-TW']) {
      setLocale(locale);
      const tag = t('history.oldLayout');
      assert.ok(tag && tag !== 'history.oldLayout', locale + ' has a tag');
      createHistoryView({ getData: () => ({ sessionHistory, sessionModeHistory, sessionBests: { coast: 40, 'coast@2': 70 }, sessionDaily: [], sessionMedals: {}, world: null }), timeString: String }).showHistory();
      const [fresh, old] = historyView.historyRuns;
      assert.deepEqual([fresh.best, old.best], [true, false], locale + ' best is the new-layout run');
      assert.ok(old.fields.includes(tag) && !fresh.fields.includes(tag), locale + ' classic tag');
      assert.equal(historyView.trendCircles.length, 1, locale + ' trend uses current-layout runs only');
      const [freshMode, oldMode] = historyView.modeRuns;
      assert.deepEqual([freshMode.personalBest, oldMode.personalBest], [true, false]);
      assert.ok(oldMode.text.includes(tag) && !freshMode.text.includes(tag), locale + ' mode tag');
    }
  } finally {
    setLocale('en');
    for (const [name, descriptor] of restore) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
  }
});

// Cloud saves are rejected whole when a best id is missing from the rules, so the two lists move together.
test('firestore.rules accepts exactly the versioned Classic best ids the client writes', async () => {
  const { readFileSync } = await import('node:fs');
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const listed = [...rules.match(/function bestIds\(\) \{[^}]*\}/)[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const versioned = Object.keys(RACE_TRACKS).map(id => recordTrackId(id)).filter(id => id.includes('@'));
  assert.deepEqual(listed.sort(), [...versioned].sort());
  for (const id of versioned) assert.match(rules, new RegExp(`validBest\\(data\\.bests, '${id}'\\)`), id);
});

test('AC2 device: export, import and a cloud merge write old and new records back bit-for-bit', () => {
  const config = createRace('coast', { mode: 'time' }).config, rules = JSON.stringify(config);
  const device = memory({
    [BEST_KEY]: JSON.stringify({ coast: 40, 'coast@2': 70, aurora: 50 }),
    'skyline-rush-history': JSON.stringify([{ date: '2026-01-01T00:00:00.000Z', track: 'coast', position: 1, time: 40, collisions: 0, nearMisses: 0, rings: 0, perfectLines: 0, nitroUses: 0, longestCombo: 0, score: 0, fuelOuts: 0, gapFalls: 0, distance: 5000 },
      { date: '2026-02-01T00:00:00.000Z', track: 'coast', position: 1, time: 70, collisions: 0, nearMisses: 0, rings: 0, perfectLines: 0, nitroUses: 0, longestCombo: 0, score: 0, fuelOuts: 0, gapFalls: 0, distance: 5000, layout: 2 }]),
    'skyline-rush-mode-bests-v1': JSON.stringify({ [JSON.stringify(['coast', config])]: 40, [JSON.stringify(['coast@2', config])]: 70 }),
  });
  const exported = JSON.stringify({ ...readLocalProgress(device), permanent: readLocalModeBests(device) });
  const imported = parseProgressExport(exported), fresh = memory();
  assert.ok(saveLocalProgress(imported.progress, fresh));
  assert.ok(saveLocalModeBests(imported.permanent, fresh));
  for (const key of [BEST_KEY, 'skyline-rush-history', 'skyline-rush-mode-bests-v1']) assert.deepEqual(JSON.parse(fresh.data[key]), JSON.parse(device.data[key]), key);
  const synced = mergeProgress(readLocalProgress(fresh), { version: 2, bests: { 'coast@2': 90 }, history: [] });
  assert.deepEqual(synced.bests, { coast: 40, 'coast@2': 70, aurora: 50 });
});
